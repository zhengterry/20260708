import { NextRequest } from 'next/server';
import { db, exceptionTickets } from '@/lib/db';
import { eq, and, like, or, desc, count, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(exceptionTickets.currentStatus, status));
    }
    if (type && type !== 'all') {
      conditions.push(eq(exceptionTickets.exceptionType, type));
    }
    if (search) {
      conditions.push(
        or(
          like(exceptionTickets.waybillNo, `%${search}%`),
          like(exceptionTickets.ticketNo, `%${search}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(exceptionTickets)
      .where(where);

    const total = totalResult?.count || 0;

    const tickets = await db
      .select()
      .from(exceptionTickets)
      .where(where)
      .orderBy(desc(exceptionTickets.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return Response.json({
      success: true,
      data: tickets,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
