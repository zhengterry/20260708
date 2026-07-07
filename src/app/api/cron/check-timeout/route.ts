// Vercel Cron Job -- 每 5 分钟执行超时检测
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 动态导入避免非 edge 环境下的问题
    const { processTimeouts } = await import('@/lib/engine/timeout-engine');
    const results = await processTimeouts();

    return Response.json({
      success: true,
      message: `超时检测完成: 升级 ${results.escalated} 条, 驳回 ${results.rejected} 条, 品控暂扣处理 ${results.qcHold} 条`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
