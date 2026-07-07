import { NextRequest } from 'next/server';
import { db, exceptionTickets, approvalRecords, scanRecords, compensationRecords } from '@/lib/db';
import { eq, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = parseInt(id);

    const [ticket] = await db
      .select()
      .from(exceptionTickets)
      .where(eq(exceptionTickets.id, ticketId));

    if (!ticket) {
      return Response.json({ success: false, error: '工单不存在' }, { status: 404 });
    }

    // 获取关联的审批记录
    const approvals = await db
      .select()
      .from(approvalRecords)
      .where(eq(approvalRecords.ticketId, ticketId))
      .orderBy(desc(approvalRecords.createdAt));

    // 获取关联的扫描记录
    const scans = await db
      .select()
      .from(scanRecords)
      .where(eq(scanRecords.ticketId, ticketId))
      .orderBy(desc(scanRecords.scannedAt));

    // 获取关联的赔付记录
    const compensations = await db
      .select()
      .from(compensationRecords)
      .where(eq(compensationRecords.ticketId, ticketId));

    return Response.json({
      success: true,
      data: {
        ticket,
        approvals,
        scans,
        compensations,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
