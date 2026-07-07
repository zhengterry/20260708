import { format } from 'date-fns';

/** 合并 CSS 类名 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/** 生成工单号 ET-YYYYMMDD-XXXX */
export function generateTicketNo(index: number): string {
  const date = format(new Date(), 'yyyyMMdd');
  const seq = String(index).padStart(4, '0');
  return `ET-${date}-${seq}`;
}

/** 计算超时时间点 */
export function calculateOverdueAt(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** 格式化金额展示 */
export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 格式化日期时间 */
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
}

/** 状态映射（中文） */
export const STATUS_LABELS: Record<string, string> = {
  'pending_approval': '待审批',
  'level1_approving': '一级审批中',
  'level2_approving': '二级审批中',
  'executing': '执行中',
  'completed': '已完成',
  'rejected': '已拒绝',
  'closed': '已关闭',
};

/** 来源映射（中文） */
export const SOURCE_LABELS: Record<string, string> = {
  'scan_trigger': '扫描触发',
  'manual_report': '手工上报',
};

/** 异常类型映射（中文） */
export const EXCEPTION_LABELS: Record<string, string> = {
  'qc': '品控异常',
  'logistics': '物流异常',
  'qty_diff': '数量不符',
  'defect': '外观破损',
  'spec_diff': '规格不符',
  'label_error': '标签错误',
  'batch_error': '批次异常',
  'lost': '丢件',
  'damaged': '破损',
  'rejected_by_customer': '客户拒收',
  'timeout': '超时未签收',
  'wrong_address': '地址错误',
};

/** 赔付方向映射 */
export const DIRECTION_LABELS: Record<string, string> = {
  'supplier_recovery': '向供应商追偿',
  'customer_compensation': '赔付客户',
};

/** 状态颜色映射 */
export const STATUS_COLORS: Record<string, string> = {
  'pending_approval': 'bg-amber-100 text-amber-800',
  'level1_approving': 'bg-blue-100 text-blue-800',
  'level2_approving': 'bg-purple-100 text-purple-800',
  'executing': 'bg-teal-100 text-teal-800',
  'completed': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800',
  'closed': 'bg-gray-100 text-gray-600',
};
