import { DEFAULT_CONFIG } from '@/types';

export const getApprovalConfig = {
  level2Threshold: () => DEFAULT_CONFIG.level2Threshold,
  approvalTimeoutHours: () => DEFAULT_CONFIG.approvalTimeoutHours,
  level2TimeoutHours: () => DEFAULT_CONFIG.level2TimeoutHours,
  qcHoldTimeoutHours: () => DEFAULT_CONFIG.qcHoldTimeoutHours,
  maxRejectCount: () => DEFAULT_CONFIG.maxRejectCount,
  pendingTimeoutHours: () => DEFAULT_CONFIG.pendingTimeoutHours,
};
