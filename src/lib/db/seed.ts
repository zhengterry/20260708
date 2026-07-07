/**
 * 种子数据脚本
 * 用于生成初始化的品控规则、审批配置和模拟工单数据
 *
 * 运行方式: npx tsx --env-file=.env src/lib/db/seed.ts
 */
import 'dotenv/config';
import { db } from './index';
import { qcRules, approvalConfig, exceptionTickets, scanRecords, approvalRecords, userRoles, waybillSnapshots, inventory } from './schema';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('开始写入种子数据...');

  // 1. 品控规则
  const rules = [
    {
      ruleCode: 'QC-QTY-01',
      ruleName: '数量差异检测',
      exceptionType: 'qty_diff',
      conditionConfig: { type: 'qty_diff', qtyDiffPercent: 5, operator: '>=' },
      severity: 'minor',
      defaultApprovalLevel: 2,
      isActive: true,
      description: '扫描数量与预期差异 >= 5% 时触发',
    },
    {
      ruleCode: 'QC-DEF-01',
      ruleName: '外观破损（中等以上）',
      exceptionType: 'defect',
      conditionConfig: { type: 'defect', minDefectLevel: 3 },
      severity: 'major',
      defaultApprovalLevel: 2,
      isActive: true,
      description: '破损等级 >= 3 级时触发',
    },
    {
      ruleCode: 'QC-DEF-02',
      ruleName: '外观破损（轻微）',
      exceptionType: 'defect',
      conditionConfig: { type: 'defect', minDefectLevel: 1 },
      severity: 'minor',
      defaultApprovalLevel: 1,
      isActive: true,
      description: '破损等级 1-2 级时触发',
    },
    {
      ruleCode: 'QC-SPEC-01',
      ruleName: '规格不符检测',
      exceptionType: 'spec_diff',
      conditionConfig: { type: 'spec_diff', keywords: ['型号', '颜色', '规格', '尺寸'] },
      severity: 'major',
      defaultApprovalLevel: 2,
      isActive: true,
      description: '规格描述不匹配时触发',
    },
    {
      ruleCode: 'QC-LBL-01',
      ruleName: '标签错误检测',
      exceptionType: 'label_error',
      conditionConfig: { type: 'label_error', patterns: [] },
      severity: 'critical',
      defaultApprovalLevel: 2,
      isActive: true,
      description: '标签无法识别或与货物不符时触发',
    },
    {
      ruleCode: 'QC-BAT-01',
      ruleName: '批次异常检测',
      exceptionType: 'batch_error',
      conditionConfig: { type: 'batch_error' },
      severity: 'critical',
      defaultApprovalLevel: 2,
      isActive: true,
      description: '批次号异常时触发',
    },
  ];

  for (const rule of rules) {
    await db.insert(qcRules).values(rule).onConflictDoNothing();
  }
  console.log(`品控规则写入完成: ${rules.length} 条`);

  // 2. 审批配置
  const configs = [
    { configKey: 'level2_threshold', configValue: '5000', description: '二级审批金额阈值(元)' },
    { configKey: 'approval_timeout_hours', configValue: '48', description: '审批超时时长(小时)' },
    { configKey: 'level2_timeout_hours', configValue: '72', description: '二级审批超时时长(小时)' },
    { configKey: 'qc_hold_timeout_hours', configValue: '4', description: '品控暂扣超时时长(小时)' },
    { configKey: 'max_reject_count', configValue: '3', description: '最大拒绝次数' },
    { configKey: 'pending_timeout_hours', configValue: '48', description: '待审批超时时长(小时)' },
  ];

  for (const config of configs) {
    await db.insert(approvalConfig).values(config).onConflictDoNothing();
  }
  console.log(`审批配置写入完成: ${configs.length} 条`);

  // 3. 用户角色
  const users = [
    { userId: 'user_admin', role: 'admin', warehouseId: 'WH001' },
    { userId: 'user_qc_sup', role: 'qc_supervisor', warehouseId: 'WH001' },
    { userId: 'user_approver_01', role: 'level1_approver', warehouseId: 'WH001' },
    { userId: 'user_approver_02', role: 'level2_approver', warehouseId: 'WH001' },
    { userId: 'user_warehouse', role: 'warehouse_op', warehouseId: 'WH001' },
    { userId: 'user_reporter', role: 'reporter', warehouseId: 'WH001' },
  ];

  for (const user of users) {
    await db.insert(userRoles).values(user).onConflictDoNothing();
  }
  console.log(`用户角色写入完成: ${users.length} 条`);

  // 4. 运单快照（模拟 V2 同步过来的数据）
  const waybills = Array.from({ length: 50 }, (_, i) => ({
    waybillNo: `WB20260701${String(i + 1).padStart(4, '0')}`,
    senderInfo: { name: `发货方${i + 1}`, phone: `1380000${String(i).padStart(4, '0')}` },
    receiverInfo: { name: `收货方${i + 1}`, address: `广东省深圳市南山区科技园${i + 1}号` },
    amount: String(Math.round((Math.random() * 20000 + 100) * 100) / 100),
    skuList: [
      { skuCode: `SKU00${i + 1}`, name: `商品${i + 1}`, qty: Math.floor(Math.random() * 100) + 10, batchNo: `B2026070${Math.floor(Math.random() * 5) + 1}` },
    ],
    v2Version: 1,
    syncSource: 'api' as const,
    syncedAt: new Date(),
  }));

  for (const wb of waybills) {
    await db.insert(waybillSnapshots).values(wb).onConflictDoNothing();
  }
  console.log(`运单快照写入完成: ${waybills.length} 条`);

  // 5. 库存数据
  for (let i = 0; i < 20; i++) {
    await db.insert(inventory).values({
      skuCode: `SKU00${i + 1}`,
      batchNo: `B2026070${Math.floor(Math.random() * 5) + 1}`,
      availableQty: Math.floor(Math.random() * 500) + 50,
      lockedQty: 0,
      totalQty: Math.floor(Math.random() * 500) + 50,
    }).onConflictDoNothing();
  }
  console.log('库存数据写入完成: 20 条');

  // 6. 异常工单（至少 200 条，模拟不同状态和类型）
  const statuses = ['pending_approval', 'level1_approving', 'level2_approving', 'executing', 'completed', 'closed'];
  const exceptionTypes = ['qc', 'logistics'];
  const qcSubtypes = ['qty_diff', 'defect', 'spec_diff', 'label_error', 'batch_error'];
  const logisticsSubtypes = ['lost', 'damaged', 'rejected_by_customer', 'timeout', 'wrong_address'];
  const sources = ['scan_trigger', 'manual_report'];

  const batchSize = 50;
  for (let batch = 0; batch < 4; batch++) {
    const tickets = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = batch * batchSize + i + 1;
      const exType = exceptionTypes[idx % 2];
      const subtypes = exType === 'qc' ? qcSubtypes : logisticsSubtypes;
      const source = exType === 'qc' ? 'scan_trigger' : sources[idx % 2];

      tickets.push({
        ticketNo: `ET-20260706-${String(idx).padStart(4, '0')}`,
        waybillNo: `WB20260701${String((idx % 50) + 1).padStart(4, '0')}`,
        exceptionType: exType,
        exceptionSubtype: subtypes[idx % subtypes.length],
        source,
        description: `模拟工单 ${idx}: ${exType === 'qc' ? '品控扫描' : '物流'}异常`,
        amount: String(Math.round((Math.random() * 15000 + 200) * 100) / 100),
        severity: (['minor', 'major', 'critical'] as const)[idx % 3],
        currentStatus: statuses[idx % statuses.length],
        statusLog: [],
        submitterId: 'user_warehouse',
        currentLevel: idx % 2 + 1,
        rejectCount: idx % 3,
        maxRejects: 3,
        version: 1 + Math.floor(idx / 10),
        overdueAt: idx % 3 === 0 ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null,
      });
    }

    for (const ticket of tickets) {
      await db.insert(exceptionTickets).values(ticket).onConflictDoNothing();
    }
    console.log(`工单批次 ${batch + 1}/4 写入完成: ${batchSize} 条`);
  }

  console.log('种子数据写入完成！共 200 条工单');
  process.exit(0);
}

seed().catch((err) => {
  console.error('种子数据写入失败:', err);
  process.exit(1);
});
