// ========== 运单快照 ==========
export interface WaybillSnapshot {
  id: number;
  waybillNo: string;
  senderInfo: Record<string, string>;
  receiverInfo: Record<string, string>;
  amount: number;
  skuList: SkuItem[];
  v2Version: number;
  syncSource: 'api' | 'manual';
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkuItem {
  skuCode: string;
  name: string;
  qty: number;
  batchNo?: string;
}

// ========== 扫描记录 ==========
export interface ScanRecord {
  id: number;
  scanId: string;
  waybillNo: string;
  skuCode: string;
  batchNo?: string;
  qtyScanned: number;
  qtyExpected?: number;
  isDefective: boolean;
  defectLevel?: number;
  specDeviation?: string;
  qcResult: 'pass' | 'hold' | 'pending';
  qcRuleHitId?: number;
  qcReason?: string;
  batchLocked: boolean;
  ticketId?: number;
  operatorId: string;
  deviceId?: string;
  scannedAt: Date;
  createdAt: Date;
}

export interface ScanInput {
  waybillNo: string;
  skuCode: string;
  batchNo?: string;
  qtyScanned: number;
  qtyExpected?: number;
  isDefective?: boolean;
  defectLevel?: number;
  specDeviation?: string;
  operatorId: string;
}

// ========== 品控规则 ==========
export interface QcRule {
  id: number;
  ruleCode: string;
  ruleName: string;
  exceptionType: QcExceptionType;
  conditionConfig: QcConditionConfig;
  severity: Severity;
  autoCreateTicket: boolean;
  defaultApprovalLevel: 1 | 2;
  isActive: boolean;
  description?: string;
}

export type QcExceptionType = 'qty_diff' | 'defect' | 'spec_diff' | 'label_error' | 'batch_error';

export type Severity = 'minor' | 'major' | 'critical';

export type QcConditionConfig =
  | { type: 'qty_diff'; qtyDiffPercent: number; operator: '>=' | '>' }
  | { type: 'defect'; minDefectLevel: number }
  | { type: 'spec_diff'; keywords: string[] }
  | { type: 'label_error'; patterns: string[] }
  | { type: 'batch_error' };

export interface RuleHit {
  ruleId: number;
  ruleCode: string;
  severity: Severity;
  reason: string;
}

export interface QcResult {
  result: 'pass' | 'hold';
  hits: RuleHit[];
  severity: Severity;
}

// ========== 异常工单 ==========
export type TicketStatus = 'pending_approval' | 'level1_approving' | 'level2_approving' | 'executing' | 'completed' | 'rejected' | 'closed';
export type ExceptionSource = 'scan_trigger' | 'manual_report';
export type ExceptionCategory = 'qc' | 'logistics';
export type ExceptionSubtype = 'qty_diff' | 'defect' | 'spec_diff' | 'label_error' | 'batch_error' | 'lost' | 'damaged' | 'rejected_by_customer' | 'timeout' | 'wrong_address';

export interface ExceptionTicket {
  id: number;
  ticketNo: string;
  waybillNo: string;
  exceptionType: ExceptionCategory;
  exceptionSubtype: ExceptionSubtype;
  source: ExceptionSource;
  description?: string;
  amount: number;
  severity: Severity;
  currentStatus: TicketStatus;
  statusLog: StatusLogEntry[];
  submitterId: string;
  assigneeId?: string;
  currentLevel: number;
  rejectCount: number;
  maxRejects: number;
  version: number;
  overdueAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusLogEntry {
  from: string;
  to: string;
  timestamp: string;
  operatorId: string;
  reason?: string;
}

// ========== 审批记录 ==========
export type ApprovalAction = 'approve' | 'reject' | 'escalate' | 'fast_release' | 'auto_timeout';
export type ApprovalResult = 'passed' | 'rejected' | 'escalated';

export interface ApprovalRecord {
  id: number;
  ticketId: number;
  ticketVersion: number;
  approverId: string;
  approvalLevel: number;
  action: ApprovalAction;
  comment?: string;
  result: ApprovalResult;
  aiSuggestion?: string;
  aiBasis?: Record<string, unknown>;
  createdAt: Date;
}

export interface ApproveInput {
  ticketId: number;
  action: 'approve' | 'reject';
  comment?: string;
}

// ========== 赔付记录 ==========
export type CompensationDirection = 'supplier_recovery' | 'customer_compensation';
export type CompensationStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface CompensationRecord {
  id: number;
  ticketId: number;
  approvalId?: number;
  direction: CompensationDirection;
  amount: number;
  reason?: string;
  status: CompensationStatus;
  reconciliationRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ========== 库存 ==========
export interface Inventory {
  id: number;
  skuCode: string;
  batchNo?: string;
  availableQty: number;
  lockedQty: number;
  totalQty: number;
  lastChangeRef?: string;
  updatedAt: Date;
}

export interface InventoryLog {
  id: number;
  skuCode: string;
  batchNo?: string;
  changeType: 'lock' | 'unlock' | 'deduct' | 'add' | 'damage';
  changeQty: number;
  beforeQty: number;
  afterQty: number;
  refType: 'scan_record' | 'approval_record' | 'ticket';
  refId: number;
  reason?: string;
  createdAt: Date;
}

// ========== API 日志 ==========
export interface ApiSyncLog {
  id: number;
  requestId: string;
  apiName: string;
  method: string;
  urlSummary: string;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: Record<string, unknown>;
  durationMs?: number;
  errorMessage?: string;
  errorType?: 'timeout' | 'network' | '4xx' | '5xx';
  isSuccess: boolean;
  createdAt: Date;
}

// ========== 用户角色 ==========
export type UserRole = 'admin' | 'qc_supervisor' | 'level1_approver' | 'level2_approver' | 'warehouse_op' | 'reporter';

export interface UserRoleRecord {
  id: number;
  userId: string;
  role: UserRole;
  warehouseId?: string;
  isActive: boolean;
}

// ========== 审批配置 ==========
export interface ApprovalConfig {
  id: number;
  configKey: string;
  configValue: string;
  description?: string;
}

// ========== 状态转换映射 ==========
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  'pending_approval': ['level1_approving', 'level2_approving'],
  'level1_approving': ['level2_approving', 'executing', 'pending_approval'],
  'level2_approving': ['executing', 'pending_approval', 'closed'],
  'executing': ['completed'],
  'completed': [],
  'rejected': ['pending_approval'],
  'closed': [],
};

// ========== V2 API 响应类型 ==========
export interface V2WaybillResponse {
  waybillNo: string;
  status: string;
  amount: number;
  senderInfo: Record<string, string>;
  receiverInfo: Record<string, string>;
  skuList: SkuItem[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface V2SkuCheckResponse {
  belongsToWaybill: boolean;
  skuCode: string;
  skuName: string;
  expectedQty: number;
  batchNo?: string;
}

export interface V2WaybillListResponse {
  data: V2WaybillResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// ========== 异常类型映射 ==========
export const LOGISTICS_EXCEPTION_MAP: Record<string, { needsCompensation: boolean; needsReship: boolean; inventoryAction: string | null }> = {
  'lost': { needsCompensation: true, needsReship: true, inventoryAction: 'deduct' },
  'damaged': { needsCompensation: true, needsReship: true, inventoryAction: 'damage' },
  'rejected_by_customer': { needsCompensation: true, needsReship: false, inventoryAction: 'add' },
  'timeout': { needsCompensation: false, needsReship: false, inventoryAction: null },
  'wrong_address': { needsCompensation: false, needsReship: true, inventoryAction: null },
};

// ========== 默认配置常量 ==========
export const DEFAULT_CONFIG = {
  level2Threshold: 5000,       // 二级审批金额阈值（元）
  approvalTimeoutHours: 48,    // 审批超时（小时），一级
  level2TimeoutHours: 72,      // 二级审批超时（小时）
  qcHoldTimeoutHours: 4,       // 品控暂扣超时（小时）
  maxRejectCount: 3,           // 最大拒绝次数
  pendingTimeoutHours: 48,     // 待审批超时（小时）
} as const;
