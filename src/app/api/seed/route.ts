import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });
    const db = drizzle(sql, { schema });

    // 品控规则
    const rules = [
      { ruleCode: 'QC-QTY-01', ruleName: '数量差异检测', exceptionType: 'qty_diff', conditionConfig: { type: 'qty_diff', qtyDiffPercent: 5, operator: '>=' }, severity: 'minor', defaultApprovalLevel: 2, isActive: true },
      { ruleCode: 'QC-DEF-01', ruleName: '外观破损（中等）', exceptionType: 'defect', conditionConfig: { type: 'defect', minDefectLevel: 3 }, severity: 'major', defaultApprovalLevel: 2, isActive: true },
      { ruleCode: 'QC-DEF-02', ruleName: '外观破损（轻微）', exceptionType: 'defect', conditionConfig: { type: 'defect', minDefectLevel: 1 }, severity: 'minor', defaultApprovalLevel: 1, isActive: true },
      { ruleCode: 'QC-SPEC-01', ruleName: '规格不符检测', exceptionType: 'spec_diff', conditionConfig: { type: 'spec_diff', keywords: ['型号','颜色','规格'] }, severity: 'major', defaultApprovalLevel: 2, isActive: true },
      { ruleCode: 'QC-LBL-01', ruleName: '标签错误', exceptionType: 'label_error', conditionConfig: { type: 'label_error', patterns: [] }, severity: 'critical', defaultApprovalLevel: 2, isActive: true },
      { ruleCode: 'QC-BAT-01', ruleName: '批次异常', exceptionType: 'batch_error', conditionConfig: { type: 'batch_error' }, severity: 'critical', defaultApprovalLevel: 2, isActive: true },
    ];
    for (const r of rules) await db.insert(schema.qcRules).values(r).onConflictDoNothing();

    // 审批配置
    await db.insert(schema.approvalConfig).values([
      { configKey: 'level2_threshold', configValue: '5000' },
      { configKey: 'approval_timeout_hours', configValue: '48' },
      { configKey: 'level2_timeout_hours', configValue: '72' },
      { configKey: 'qc_hold_timeout_hours', configValue: '4' },
      { configKey: 'max_reject_count', configValue: '3' },
      { configKey: 'pending_timeout_hours', configValue: '48' },
    ]).onConflictDoNothing();

    // 用户
    await db.insert(schema.userRoles).values([
      { userId: 'user_admin', role: 'admin', warehouseId: 'WH001' },
      { userId: 'user_qc_sup', role: 'qc_supervisor', warehouseId: 'WH001' },
      { userId: 'user_approver_01', role: 'level1_approver', warehouseId: 'WH001' },
      { userId: 'user_approver_02', role: 'level2_approver', warehouseId: 'WH001' },
      { userId: 'user_warehouse', role: 'warehouse_op', warehouseId: 'WH001' },
      { userId: 'user_reporter', role: 'reporter', warehouseId: 'WH001' },
    ]).onConflictDoNothing();

    // 运单快照
    for (let i = 1; i <= 50; i++) {
      await db.insert(schema.waybillSnapshots).values({
        waybillNo: `WB20260701${String(i).padStart(4, '0')}`,
        senderInfo: { name: `发货方${i}` },
        receiverInfo: { name: `收货方${i}`, address: `深圳科技园${i}号` },
        amount: String(Math.round((Math.random() * 20000 + 100) * 100) / 100),
        skuList: [{ skuCode: `SKU00${i}`, name: `商品${i}`, qty: Math.floor(Math.random() * 100) + 10 }],
        v2Version: 1, syncSource: 'api', syncedAt: new Date(),
      }).onConflictDoNothing();
    }

    // 库存
    for (let i = 1; i <= 20; i++) {
      await db.insert(schema.inventory).values({
        skuCode: `SKU00${i}`, batchNo: `B${Math.floor(Math.random() * 5) + 1}`,
        availableQty: Math.floor(Math.random() * 500) + 50, lockedQty: 0,
        totalQty: Math.floor(Math.random() * 500) + 50,
      }).onConflictDoNothing();
    }

    // 工单 200 条
    const statuses = ['pending_approval', 'level1_approving', 'level2_approving', 'executing', 'completed', 'closed'];
    const logisticsTypes = ['lost','damaged','rejected_by_customer','timeout','wrong_address'];
    const qcTypes = ['qty_diff','defect','spec_diff','label_error','batch_error'];

    const tickets: typeof schema.exceptionTickets.$inferInsert[] = [];
    for (let i = 1; i <= 200; i++) {
      const isQc = i % 3 === 0;
      tickets.push({
        ticketNo: `ET-20260706-${String(i).padStart(4, '0')}`,
        waybillNo: `WB20260701${String((i % 50) + 1).padStart(4, '0')}`,
        exceptionType: isQc ? 'qc' : 'logistics' as 'qc' | 'logistics',
        exceptionSubtype: isQc ? qcTypes[i % 5] : logisticsTypes[i % 5],
        source: isQc ? 'scan_trigger' : 'manual_report',
        description: `模拟工单 #${i}`,
        amount: String(Math.round((Math.random() * 15000 + 200) * 100) / 100),
        severity: ['minor','major','critical'][i % 3] as 'minor' | 'major' | 'critical',
        currentStatus: statuses[i % 6],
        statusLog: [],
        submitterId: 'user_warehouse',
        currentLevel: (i % 2) + 1,
        rejectCount: i % 3,
        maxRejects: 3,
        version: 1,
        overdueAt: i % 3 === 0 ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null,
      });
    }
    for (const t of tickets) await db.insert(schema.exceptionTickets).values(t).onConflictDoNothing();

    await sql.end();
    return Response.json({ success: true, message: '种子数据写入成功！共 200 条工单、50 条运单、6 条规则' });
  } catch (err) {
    return Response.json({ success: false, error: err instanceof Error ? err.message : '未知错误' }, { status: 500 });
  }
}
