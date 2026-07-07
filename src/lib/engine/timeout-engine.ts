import { db, exceptionTickets, approvalRecords, scanRecords } from '@/lib/db';
import { eq, and, inArray, lte } from 'drizzle-orm';
import { DEFAULT_CONFIG } from '@/types';
import { log } from '@/lib/logger';
import type { StatusLogEntry } from '@/types';

/**
 * 超时检测引擎 - 由 Vercel Cron Job 定时调用
 * 检测所有超时工单，按设定规则处理：升级或自动驳回
 */
export async function processTimeouts() {
  const now = new Date();
  const results = { escalated: 0, rejected: 0, qcHold: 0 };

  // 1. 处理审批超时工单
  const overdueApprovalTickets = await db
    .select()
    .from(exceptionTickets)
    .where(
      and(
        inArray(exceptionTickets.currentStatus, ['pending_approval', 'level1_approving', 'level2_approving']),
        lte(exceptionTickets.overdueAt, now)
      )
    );

  for (const ticket of overdueApprovalTickets) {
    try {
      if (ticket.currentStatus === 'level2_approving') {
        // 二级审批超时 → 自动驳回
        await autoReject(ticket.id);
        results.rejected++;
        log('info', `工单 ${ticket.ticketNo} 二级审批超时，自动驳回`);
      } else {
        // 待审批 / 一级审批中 → 升级到下一级
        await autoEscalate(ticket.id, ticket.currentStatus);
        results.escalated++;
        log('info', `工单 ${ticket.ticketNo} 超时，自动升级`);
      }
    } catch (err) {
      log('error', `工单 ${ticket.ticketNo} 超时处理失败`, { error: String(err) });
    }
  }

  // 2. 处理品控暂扣超时
  const qcHoldTimeoutHours = DEFAULT_CONFIG.qcHoldTimeoutHours;
  const qcHoldDeadline = new Date(Date.now() - qcHoldTimeoutHours * 60 * 60 * 1000);

  const overdueQcScans = await db
    .select()
    .from(scanRecords)
    .where(
      and(
        eq(scanRecords.batchLocked, true),
        eq(scanRecords.qcResult, 'hold'),
        lte(scanRecords.scannedAt, qcHoldDeadline)
      )
    );

  // 获取这些扫描记录关联的工单
  for (const scan of overdueQcScans) {
    if (scan.ticketId) {
      try {
        const tickets = await db
          .select()
          .from(exceptionTickets)
          .where(eq(exceptionTickets.id, scan.ticketId));

        if (tickets.length > 0 && tickets[0].currentStatus === 'pending_approval') {
          // 品控工单超时 → 强制升级二级审批
          await db.transaction(async (tx) => {
            const statusLog = (tickets[0].statusLog || []) as StatusLogEntry[];
            statusLog.push({
              from: tickets[0].currentStatus,
              to: 'level2_approving',
              timestamp: new Date().toISOString(),
              operatorId: 'system',
              reason: `品控暂扣超时(${qcHoldTimeoutHours}h)，强制升级二级审批`,
            });

            await tx
              .update(exceptionTickets)
              .set({
                currentStatus: 'level2_approving',
                currentLevel: 2,
                overdueAt: new Date(Date.now() + DEFAULT_CONFIG.level2TimeoutHours * 60 * 60 * 1000),
                statusLog,
                version: tickets[0].version + 1,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(exceptionTickets.id, tickets[0].id),
                  eq(exceptionTickets.version, tickets[0].version)
                )
              );

            await tx.insert(approvalRecords).values({
              ticketId: tickets[0].id,
              ticketVersion: tickets[0].version,
              approverId: 'system',
              approvalLevel: 2,
              action: 'escalate',
              comment: `品控暂扣超时(${qcHoldTimeoutHours}h)，系统自动升级`,
              result: 'escalated',
            });
          });

          results.qcHold++;
          log('info', `品控工单 ${tickets[0].ticketNo} 暂扣超时，强制升级二级审批`);
        }
      } catch (err) {
        log('error', `品控暂扣超时处理失败`, { scanId: scan.scanId, error: String(err) });
      }
    }
  }

  return results;
}

/** 自动升级 */
async function autoEscalate(ticketId: number, currentStatus: string) {
  await db.transaction(async (tx) => {
    const tickets = await tx
      .select()
      .from(exceptionTickets)
      .where(eq(exceptionTickets.id, ticketId))
      .for('update');

    if (tickets.length === 0) return;
    const ticket = tickets[0];

    if (ticket.currentStatus !== currentStatus) return; // 已变更则跳过

    const nextLevel = (ticket.currentLevel ?? 1) + 1;

    const statusLog = (ticket.statusLog || []) as StatusLogEntry[];
    statusLog.push({
      from: ticket.currentStatus,
      to: `level${nextLevel}_approving`,
      timestamp: new Date().toISOString(),
      operatorId: 'system',
      reason: '超时未处理，系统自动升级',
    });

    await tx
      .update(exceptionTickets)
      .set({
        currentStatus: `level${nextLevel}_approving`,
        currentLevel: nextLevel,
        overdueAt: new Date(Date.now() + DEFAULT_CONFIG.approvalTimeoutHours * 60 * 60 * 1000),
        statusLog,
        version: ticket.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(exceptionTickets.id, ticketId),
          eq(exceptionTickets.version, ticket.version)
        )
      );

    await tx.insert(approvalRecords).values({
      ticketId: ticket.id,
      ticketVersion: ticket.version,
      approverId: 'system',
      approvalLevel: nextLevel,
      action: 'escalate',
      comment: '超时未处理，系统自动升级',
      result: 'escalated',
    });
  });
}

/** 自动驳回 */
async function autoReject(ticketId: number) {
  await db.transaction(async (tx) => {
    const tickets = await tx
      .select()
      .from(exceptionTickets)
      .where(eq(exceptionTickets.id, ticketId))
      .for('update');

    if (tickets.length === 0) return;
    const ticket = tickets[0];

    if (ticket.currentStatus !== 'level2_approving') return;

    const statusLog = (ticket.statusLog || []) as StatusLogEntry[];
    statusLog.push({
      from: ticket.currentStatus,
      to: 'closed',
      timestamp: new Date().toISOString(),
      operatorId: 'system',
      reason: '二级审批超时，系统自动关闭',
    });

    await tx
      .update(exceptionTickets)
      .set({
        currentStatus: 'closed',
        statusLog,
        version: ticket.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(exceptionTickets.id, ticketId),
          eq(exceptionTickets.version, ticket.version)
        )
      );

    await tx.insert(approvalRecords).values({
      ticketId: ticket.id,
      ticketVersion: ticket.version,
      approverId: 'system',
      approvalLevel: 2,
      action: 'auto_timeout',
      comment: '二级审批超时未处理，系统自动关闭',
      result: 'rejected',
    });
  });
}
