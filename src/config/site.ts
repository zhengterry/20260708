export const siteConfig = {
  name: '运单全流程管理系统 V3',
  description: '录单 → 扫描品控 → 异常上报 → 分级审批 → 执行联动',
  primaryColor: '#0FC6C2',
  primaryColorDark: '#0AA6A3',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};

export const v2Config = {
  baseUrl: process.env.V2_API_BASE_URL || 'http://localhost:3001/api/v2',
  apiKey: process.env.V2_API_KEY || 'v3-system-api-key',
  timeout: 10000, // 10 秒
  maxRetries: 2,
};

export const paginationConfig = {
  defaultPageSize: 20,
  maxPageSize: 100,
};
