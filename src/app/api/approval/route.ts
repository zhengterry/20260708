import { NextRequest } from 'next/server';
import { db, exceptionTickets, approvalRecords, scanRecords, compensationRecords, inventoryLogs } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { LOGISTICS_EXCEPTION_MAP, DEFAULT_CONFIG } from '@/types';
import type { StatusLogEntry } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, approverId, action, comment } = body;

    if (!ticketId || !approverId || !action) {
      return Response.json({ success: false, error: '缺少必填参数' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return Response.json({ success: false, error: '无效的操作' }, { status: 400 });
    }

    return await db.transaction(async (tx) => {
      // 1. 获取工单
      const tickets = await tx
        .select()
        .from(exceptionTickets)
        .where(eq(exceptionTickets.id, ticketId))
        .for('update');

      if (tickets.length === 0) {
        throw new Error('工单不存在');
      }
      const ticket = tickets[0];

      // 2. 权限校验：上报人不能审批自己
      if (ticket.submitterId === approverId) {
        return Response.json({ success: false, error: '不能审批自己提交的工单' }, { status: 403 });
      }

      // 3. 状态校验
      if (ticket.currentStatus !== 'level1_approving' && ticket.currentStatus !== 'level2_approving') {
        return Response.json({ success: false, error: '该工单当前状态不可审批' }, { status: 409 });
      }

      // 4. 审批人校验
      if (ticket.assigneeId && ticket.assigneeId !== approverId) {
        return Response.json({ success: false, error: '您不是该工单的指定审批人' }, { status: 403 });
      }

      // 5. 乐观锁更新
      const nextStatus = action === 'reject'
        ? 'pending_approval'
        : 'executing';

      const updated = await tx
        .update(exceptionTickets)
        .set({
          currentStatus: nextStatus,
          version: (ticket.version ?? 0) + 1,
          updatedAt: new Date(),
          ...(action === 'reject' ? {
            rejectCount: (ticket.rejectCount ?? 0) + 1,
            assigneeId: null,
          } : { assigneeId: null }),
        })
        .where(
          and(
            eq(exceptionTickets.id, ticketId),
            eq(exceptionTickets.version, (ticket.version ?? 0))
          )
        )
        .returning();

      if (updated.length === 0) {
        return Response.json({ success: false, error: '该工单已被处理，请刷新' }, { status: 409 });
      }

      // 6. 记录审批
      await tx.insert(approvalRecords).values({
        ticketId: ticket.id,
        ticketVersion: (ticket.version ?? 0),
        approverId,
        approvalLevel: ticket.currentStatus === 'level1_approving' ? 1 : 2,
        action,
        comment: comment || null,
        result: action === 'approve' ? 'passed' : 'rejected',
      });

      // 7. 更新状态日志
      const statusLog = (ticket.statusLog || []) as StatusLogEntry[];
      statusLog.push({
        from: ticket.currentStatus || '',
        to: nextStatus,
        timestamp: new Date().toISOString(),
        operatorId: approverId,
        reason: action === 'approve' ? '审批通过' : '审批拒绝',
      });
      await tx.update(exceptionTickets).set({ statusLog }).where(eq(exceptionTickets.id, ticketId));

      // 8. 审批通过 -> 执行联动
      if (action === 'approve') {
        const direction = ticket.exceptionType === 'qc' ? 'supplier_recovery' : 'customer_compensation';

        // 判断是否需要赔付
        const needsComp = ticket.exceptionType === 'qc' ||
          (ticket.exceptionType === 'logistics' &&
           LOGISTICS_EXCEPTION_MAP[(ticket.exceptionSubtype || '')]?.needsCompensation);

        if (needsComp && ticket.amount) {
          await tx.insert(compensationRecords).values({
            ticketId: ticket.id,
            direction,
            amount: String(ticket.amount),
            reason: `工单 ${ticket.ticketNo || ''} 审批通过自动生成赔付`,
            status: 'pending',
          });
        }

        // 库存联动
        const scans = await tx.select().from(scanRecords).where(eq(scanRecords.ticketId, ticketId));
        for (const scan of scans) {
          const changeType = ticket.exceptionType === 'qc' ? 'unlock' : (
            (LOGISTICS_EXCEPTION_MAP[(ticket.exceptionSubtype || '')]?.inventoryAction as string) || 'deduct'
          );

          await tx.insert(inventoryLogs).values({
            skuCode: scan.skuCode || '',
            batchNo: scan.batchNo,
            changeType: changeType as 'unlock' | 'deduct' | 'add' | 'damage',
            changeQty: scan.qtyScanned ?? 0,
            beforeQty: 0,
            afterQty: 0,
            refType: 'approval_record',
            refId: ticket.id,
            reason: `工单 ${ticket.ticketNo || ''} 审批通过，联动库存`,
          });

          // 品控工单审批通过 -> 解锁批次
          if (ticket.exceptionType === 'qc') {
            await tx.update(scanRecords).set({ batchLocked: false }).where(eq(scanRecords.id, scan.id));
          }
        }
      }

      return Response.json({
        success: true,
        message: action === 'approve' ? '审批通过' : '审批拒绝',
        newStatus: nextStatus,
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
