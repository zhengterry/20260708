import { pgTable, serial, varchar, integer, decimal, boolean, text, jsonb, timestamp, uniqueIndex, index, uuid } from 'drizzle-orm/pg-core';

// ========== 运单本地快照表 ==========
export const waybillSnapshots = pgTable('waybill_snapshots', {
  id: serial('id').primaryKey(),
  waybillNo: varchar('waybill_no', { length: 50 }).notNull().unique(),
  senderInfo: jsonb('sender_info'),
  receiverInfo: jsonb('receiver_info'),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  skuList: jsonb('sku_list'),
  v2Version: integer('v2_version').default(1),
  syncSource: varchar('sync_source', { length: 20 }).notNull().default('api'),
  syncedAt: timestamp('synced_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_ws_waybill_no').on(table.waybillNo),
  index('idx_ws_synced_at').on(table.syncedAt),
]);

// ========== 扫描记录表 ==========
export const scanRecords = pgTable('scan_records', {
  id: serial('id').primaryKey(),
  scanId: uuid('scan_id').notNull().unique(),
  waybillNo: varchar('waybill_no', { length: 50 }).notNull(),
  skuCode: varchar('sku_code', { length: 100 }).notNull(),
  batchNo: varchar('batch_no', { length: 100 }),
  qtyScanned: integer('qty_scanned').notNull(),
  qtyExpected: integer('qty_expected'),
  isDefective: boolean('is_defective').default(false),
  defectLevel: integer('defect_level'),
  specDeviation: text('spec_deviation'),
  qcResult: varchar('qc_result', { length: 20 }).notNull().default('pending'),
  qcRuleHitId: integer('qc_rule_hit_id'),
  qcReason: text('qc_reason'),
  batchLocked: boolean('batch_locked').notNull().default(false),
  ticketId: integer('ticket_id'),
  operatorId: varchar('operator_id', { length: 50 }).notNull(),
  deviceId: varchar('device_id', { length: 100 }),
  scannedAt: timestamp('scanned_at', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_sr_ticket_id').on(table.ticketId),
  index('idx_sr_waybill_sku').on(table.waybillNo, table.skuCode),
  index('idx_sr_batch_locked').on(table.batchLocked),
]);

// ========== 品控规则表 ==========
export const qcRules = pgTable('qc_rules', {
  id: serial('id').primaryKey(),
  ruleCode: varchar('rule_code', { length: 50 }).notNull().unique(),
  ruleName: varchar('rule_name', { length: 200 }).notNull(),
  exceptionType: varchar('exception_type', { length: 50 }).notNull(),
  conditionConfig: jsonb('condition_config').notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('minor'),
  autoCreateTicket: boolean('auto_create_ticket').notNull().default(true),
  defaultApprovalLevel: integer('default_approval_level').notNull().default(2),
  isActive: boolean('is_active').notNull().default(true),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// ========== 异常工单表 ==========
export const exceptionTickets = pgTable('exception_tickets', {
  id: serial('id').primaryKey(),
  ticketNo: varchar('ticket_no', { length: 50 }).notNull().unique(),
  waybillNo: varchar('waybill_no', { length: 50 }).notNull(),
  exceptionType: varchar('exception_type', { length: 50 }).notNull(),
  exceptionSubtype: varchar('exception_subtype', { length: 50 }).notNull(),
  source: varchar('source', { length: 20 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  severity: varchar('severity', { length: 20 }).notNull().default('minor'),
  currentStatus: varchar('current_status', { length: 30 }).notNull().default('pending_approval'),
  statusLog: jsonb('status_log').notNull().$defaultFn(() => []),
  submitterId: varchar('submitter_id', { length: 50 }).notNull(),
  assigneeId: varchar('assignee_id', { length: 50 }),
  currentLevel: integer('current_level').default(1),
  rejectCount: integer('reject_count').default(0),
  maxRejects: integer('max_rejects').notNull().default(3),
  version: integer('version').notNull().default(1),
  overdueAt: timestamp('overdue_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_et_status').on(table.currentStatus),
  index('idx_et_waybill').on(table.waybillNo),
  index('idx_et_assignee').on(table.assigneeId),
  index('idx_et_source').on(table.source),
  uniqueIndex('idx_et_unique_active').on(table.waybillNo, table.exceptionSubtype, table.source),
]);

// ========== 审批记录表 ==========
export const approvalRecords = pgTable('approval_records', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull(),
  ticketVersion: integer('ticket_version').notNull(),
  approverId: varchar('approver_id', { length: 50 }).notNull(),
  approvalLevel: integer('approval_level').notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  comment: text('comment'),
  result: varchar('result', { length: 20 }).notNull(),
  aiSuggestion: text('ai_suggestion'),
  aiBasis: jsonb('ai_basis'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_ar_ticket_id').on(table.ticketId),
  uniqueIndex('idx_ar_unique_op').on(table.ticketId, table.ticketVersion, table.action),
]);

// ========== 赔付记录表 ==========
export const compensationRecords = pgTable('compensation_records', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull(),
  approvalId: integer('approval_id'),
  direction: varchar('direction', { length: 30 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  reconciliationRef: varchar('reconciliation_ref', { length: 200 }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_cr_ticket_id').on(table.ticketId),
  index('idx_cr_approval_id').on(table.approvalId),
]);

// ========== 库存表 ==========
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  skuCode: varchar('sku_code', { length: 100 }).notNull(),
  batchNo: varchar('batch_no', { length: 100 }),
  availableQty: integer('available_qty').notNull().default(0),
  lockedQty: integer('locked_qty').notNull().default(0),
  totalQty: integer('total_qty').notNull().default(0),
  lastChangeRef: varchar('last_change_ref', { length: 200 }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_inv_sku_batch').on(table.skuCode, table.batchNo),
]);

// ========== 库存变更日志表 ==========
export const inventoryLogs = pgTable('inventory_logs', {
  id: serial('id').primaryKey(),
  skuCode: varchar('sku_code', { length: 100 }).notNull(),
  batchNo: varchar('batch_no', { length: 100 }),
  changeType: varchar('change_type', { length: 30 }).notNull(),
  changeQty: integer('change_qty').notNull(),
  beforeQty: integer('before_qty').notNull(),
  afterQty: integer('after_qty').notNull(),
  refType: varchar('ref_type', { length: 50 }).notNull(),
  refId: integer('ref_id').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_il_ref').on(table.refType, table.refId),
]);

// ========== 接口同步日志表 ==========
export const apiSyncLogs = pgTable('api_sync_logs', {
  id: serial('id').primaryKey(),
  requestId: uuid('request_id').notNull(),
  apiName: varchar('api_name', { length: 100 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  urlSummary: text('url_summary').notNull(),
  requestBody: jsonb('request_body'),
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body'),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  errorType: varchar('error_type', { length: 50 }),
  isSuccess: boolean('is_success').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_asl_api_name').on(table.apiName),
  index('idx_asl_created_at').on(table.createdAt),
  index('idx_asl_request_id').on(table.requestId),
]);

// ========== 用户角色表 ==========
export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  role: varchar('role', { length: 30 }).notNull(),
  warehouseId: varchar('warehouse_id', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_ur_user').on(table.userId),
  index('idx_ur_role').on(table.role),
]);

// ========== 审批配置表 ==========
export const approvalConfig = pgTable('approval_config', {
  id: serial('id').primaryKey(),
  configKey: varchar('config_key', { length: 50 }).notNull().unique(),
  configValue: varchar('config_value', { length: 200 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});
