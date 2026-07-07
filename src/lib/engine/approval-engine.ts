import { db, exceptionTickets, approvalRecords, scanRecords, compensationRecords, inventory, inventoryLogs } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { STATUS_TRANSITIONS, DEFAULT_CONFIG, LOGISTICS_EXCEPTION_MAP } from '@/types';
import { log } from '@/lib/logger';
import type { TicketStatus, ApproveInput, StatusLogEntry } from '@/types';

export class ApprovalConflictError extends Error {
  constructor() {
    super('该工单已被处理，请刷新');
    this.name = 'ApprovalConflictError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * 审批操作（带乐观锁并发控制）
 */
export async function approveTicket(
  ticketId: number,
  approverId: string,
  input: ApproveInput
) {
  return db.transaction(async (tx) => {
    // 1. 获取工单当前状态
    const tickets = await tx
      .select()
      .from(exceptionTickets)
      .where(eq(exceptionTickets.id, ticketId))
      .for('update');

    if (tickets.length === 0) throw new Error('工单不存在');
    const ticket = tickets[0];

    // 2. 权限校验：上报人不能审批自己的工单
    if (ticket.submitterId === approverId) {
      throw new PermissionError('不能审批自己提交的工单');
    }

    // 3. 状态校验：工单必须处于审批中状态
    if (ticket.currentStatus !== 'level1_approving' && ticket.currentStatus !== 'level2_approving') {
      throw new ApprovalConflictError();
    }

    // 4. 审批人校验：当前审批人必须匹配
    if (ticket.assigneeId && ticket.assigneeId !== approverId) {
      throw new PermissionError('您不是该工单的指定审批人');
    }

    // 5. 乐观锁更新
    const nextStatus = getNextStatus(ticket.currentStatus, input.action);
    const updated = await tx
      .update(exceptionTickets)
      .set({
        currentStatus: nextStatus,
        version: ticket.version + 1,
        updatedAt: new Date(),
        ...(input.action === 'reject' ? {
          rejectCount: (ticket.rejectCount ?? 0) + 1,
          assigneeId: null,
        } : { assigneeId: null }),
      })
      .where(
        and(
          eq(exceptionTickets.id, ticketId),
          eq(exceptionTickets.version, ticket.version)
        )
      )
      .returning();

    if (updated.length === 0) {
      throw new ApprovalConflictError();
    }

    // 6. 记录审批历史
    await tx.insert(approvalRecords).values({
      ticketId: ticket.id,
      ticketVersion: ticket.version,
      approverId,
      approvalLevel: ticket.currentStatus === 'level1_approving' ? 1 : 2,
      action: input.action,
      comment: input.comment || null,
      result: input.action === 'approve' ? 'passed' : 'rejected',
    });

    // 7. 更新状态日志
    const statusLog = (ticket.statusLog || []) as StatusLogEntry[];
    statusLog.push({
      from: ticket.currentStatus,
      to: nextStatus,
      timestamp: new Date().toISOString(),
      operatorId: approverId,
      reason: input.action === 'approve' ? '审批通过' : '审批拒绝',
    });

    await tx
      .update(exceptionTickets)
      .set({ statusLog })
      .where(eq(exceptionTickets.id, ticketId));

    // 8. 审批通过 → 执行联动
    if (input.action === 'approve' && (nextStatus === 'executing')) {
      await executeLinkage(tx, ticket.id);
    }

    return { success: true, newStatus: nextStatus };
  });
}

function getNextStatus(currentStatus: TicketStatus, action: 'approve' | 'reject'): TicketStatus {
  if (action === 'reject') {
    return 'pending_approval';
  }

  if (currentStatus === 'level1_approving') {
    // 一级审批通过 → 执行中
    return 'executing';
  }

  if (currentStatus === 'level2_approving') {
    // 二级审批通过 → 执行中
    return 'executing';
  }

  return 'executing';
}

/**
 * 执行联动：库存变更 + 赔付记录生成
 * 在同一个事务内完成
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeLinkage(tx: any, ticketId: number) {
  const tickets = await tx
    .select()
    .from(exceptionTickets)
    .where(eq(exceptionTickets.id, ticketId));

  if (tickets.length === 0) return;
  const ticket = tickets[0];

  // 获取最新审批记录
  const approvals = await tx
    .select()
    .from(approvalRecords)
    .where(eq(approvalRecords.ticketId, ticketId))
    .orderBy(sql`${approvalRecords.createdAt} desc`)
    .limit(1);

  const approvalId = approvals.length > 0 ? approvals[0].id : null;

  // 判断赔付方向
  const direction = ticket.exceptionType === 'qc' ? 'supplier_recovery' : 'customer_compensation';

  // 生成赔付记录（如需要）
  const needsCompensation = ticket.exceptionType === 'qc' ||
    (ticket.exceptionType === 'logistics' &&
     LOGISTICS_EXCEPTION_MAP[ticket.exceptionSubtype]?.needsCompensation);

  if (needsCompensation && ticket.amount) {
    await tx.insert(compensationRecords).values({
      ticketId: ticket.id,
      approvalId,
      direction,
      amount: String(ticket.amount),
      reason: `工单 ${ticket.ticketNo} 审批通过自动生成赔付`,
      status: 'pending',
    });
  }

  // 库存联动
  const logisticsAction = ticket.exceptionType === 'logistics'
    ? LOGISTICS_EXCEPTION_MAP[ticket.exceptionSubtype]
    : null;

  // 获取关联的扫描记录中的 SKU 信息
  const scans = await tx
    .select()
    .from(scanRecords)
    .where(eq(scanRecords.ticketId, ticketId));

  for (const scan of scans) {
    if (ticket.exceptionType === 'qc') {
      // 品控异常：库存联动处理
      // 品控暂扣解锁
      await tx
        .update(scanRecords)
        .set({ batchLocked: false })
        .where(eq(scanRecords.id, scan.id));

      // 记录库存变更日志
      await tx.insert(inventoryLogs).values({
        skuCode: scan.skuCode,
        batchNo: scan.batchNo,
        changeType: 'unlock',
        changeQty: scan.qtyScanned,
        beforeQty: 0,
        afterQty: 0,
        refType: 'approval_record',
        refId: approvalId || 0,
        reason: `工单 ${ticket.ticketNo} 审批通过，品控暂扣解锁`,
      });
    } else if (logisticsAction?.inventoryAction) {
      // 物流异常：库存联动
      const changeType = logisticsAction.inventoryAction as 'deduct' | 'add' | 'damage';
      await tx.insert(inventoryLogs).values({
        skuCode: scan.skuCode,
        batchNo: scan.batchNo,
        changeType,
        changeQty: scan.qtyScanned,
        beforeQty: 0,
        afterQty: 0,
        refType: 'approval_record',
        refId: approvalId || 0,
        reason: `工单 ${ticket.ticketNo} 审批通过，${changeType === 'add' ? '退货入库' : '库存扣减'}`,
      });
    }
  }

  log('info', `工单 ${ticket.ticketNo} 执行联动完成`, { ticketId, direction });
}
