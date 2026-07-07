import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });
const db = drizzle(sql, { schema });

async function seed() {
  console.log('连接数据库...');

  // 品控规则
  await db.insert(schema.qcRules).values([
    { ruleCode: 'QC-QTY-01', ruleName: '数量差异检测', exceptionType: 'qty_diff', conditionConfig: { type: 'qty_diff', qtyDiffPercent: 5, operator: '>=' }, severity: 'minor', defaultApprovalLevel: 2, isActive: true, description: '数量差异 >= 5%' },
    { ruleCode: 'QC-DEF-01', ruleName: '外观破损（中等以上）', exceptionType: 'defect', conditionConfig: { type: 'defect', minDefectLevel: 3 }, severity: 'major', defaultApprovalLevel: 2, isActive: true, description: '破损 >= 3 级' },
    { ruleCode: 'QC-DEF-02', ruleName: '外观破损（轻微）', exceptionType: 'defect', conditionConfig: { type: 'defect', minDefectLevel: 1 }, severity: 'minor', defaultApprovalLevel: 1, isActive: true },
    { ruleCode: 'QC-SPEC-01', ruleName: '规格不符检测', exceptionType: 'spec_diff', conditionConfig: { type: 'spec_diff', keywords: ['型号','颜色','规格','尺寸'] }, severity: 'major', defaultApprovalLevel: 2, isActive: true },
    { ruleCode: 'QC-LBL-01', ruleName: '标签错误检测', exceptionType: 'label_error', conditionConfig: { type: 'label_error', patterns: [] }, severity: 'critical', defaultApprovalLevel: 2, isActive: true },
    { ruleCode: 'QC-BAT-01', ruleName: '批次异常检测', exceptionType: 'batch_error', conditionConfig: { type: 'batch_error' }, severity: 'critical', defaultApprovalLevel: 2, isActive: true },
  ]).onConflictDoNothing();
  console.log('品控规则 done');

  // 审批配置
  await db.insert(schema.approvalConfig).values([
    { configKey: 'level2_threshold', configValue: '5000', description: '二级审批金额阈值(元)' },
    { configKey: 'approval_timeout_hours', configValue: '48' },
    { configKey: 'level2_timeout_hours', configValue: '72' },
    { configKey: 'qc_hold_timeout_hours', configValue: '4' },
    { configKey: 'max_reject_count', configValue: '3' },
    { configKey: 'pending_timeout_hours', configValue: '48' },
  ]).onConflictDoNothing();
  console.log('审批配置 done');

  // 用户角色
  await db.insert(schema.userRoles).values([
    { userId: 'user_admin', role: 'admin', warehouseId: 'WH001' },
    { userId: 'user_qc_sup', role: 'qc_supervisor', warehouseId: 'WH001' },
    { userId: 'user_approver_01', role: 'level1_approver', warehouseId: 'WH001' },
    { userId: 'user_approver_02', role: 'level2_approver', warehouseId: 'WH001' },
    { userId: 'user_warehouse', role: 'warehouse_op', warehouseId: 'WH001' },
    { userId: 'user_reporter', role: 'reporter', warehouseId: 'WH001' },
  ]).onConflictDoNothing();
  console.log('用户角色 done');

  // 运单快照
  const waybills = Array.from({ length: 50 }, (_, i) => ({
    waybillNo: `WB20260701${String(i + 1).padStart(4, '0')}`,
    senderInfo: { name: `发货方${i + 1}` },
    receiverInfo: { name: `收货方${i + 1}`, address: `深圳科技园${i + 1}号` },
    amount: String(Math.round((Math.random() * 20000 + 100) * 100) / 100),
    skuList: [{ skuCode: `SKU00${i + 1}`, name: `商品${i + 1}`, qty: Math.floor(Math.random() * 100) + 10, batchNo: `B${Math.floor(Math.random() * 5) + 1}` }],
    v2Version: 1, syncSource: 'api' as const, syncedAt: new Date(),
  }));
  for (const w of waybills) await db.insert(schema.waybillSnapshots).values(w).onConflictDoNothing();
  console.log('运单快照 done (50)');

  // 库存
  for (let i = 1; i <= 20; i++) {
    await db.insert(schema.inventory).values({
      skuCode: `SKU00${i}`, batchNo: `B${Math.floor(Math.random() * 5) + 1}`,
      availableQty: Math.floor(Math.random() * 500) + 50, lockedQty: 0, totalQty: Math.floor(Math.random() * 500) + 50,
    }).onConflictDoNothing();
  }
  console.log('库存 done (20)');

  // 工单 200 条
  const statuses = ['pending_approval', 'level1_approving', 'level2_approving', 'executing', 'completed', 'closed'] as const;
  const logisticsTypes = ['lost','damaged','rejected_by_customer','timeout','wrong_address'];
  const qcTypes = ['qty_diff','defect','spec_diff','label_error','batch_error'];

  for (let i = 1; i <= 200; i++) {
    const isQc = i % 3 === 0;
    await db.insert(schema.exceptionTickets).values({
      ticketNo: `ET-20260706-${String(i).padStart(4, '0')}`,
      waybillNo: `WB20260701${String((i % 50) + 1).padStart(4, '0')}`,
      exceptionType: isQc ? 'qc' : 'logistics',
      exceptionSubtype: isQc ? qcTypes[i % 5] : logisticsTypes[i % 5],
      source: isQc ? 'scan_trigger' : 'manual_report',
      description: `模拟工单 #${i}`,
      amount: String(Math.round((Math.random() * 15000 + 200) * 100) / 100),
      severity: (['minor','major','critical'] as const)[i % 3],
      currentStatus: statuses[i % 6],
      statusLog: [],
      submitterId: 'user_warehouse',
      currentLevel: (i % 2) + 1,
      rejectCount: i % 3,
      maxRejects: 3,
      version: 1,
      overdueAt: i % 3 === 0 ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null,
    }).onConflictDoNothing();
    if (i % 50 === 0) console.log(`工单 done (${i}/200)`);
  }

  console.log('种子数据全部写入成功！');
  await sql.end();
}

seed().catch(e => { console.error('失败:', e.message); process.exit(1); });
