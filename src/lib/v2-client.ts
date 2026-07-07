import { v2Config } from '@/config/site';
import { v4 as uuidv4 } from 'uuid';
import { db, apiSyncLogs } from '@/lib/db';
import type { V2WaybillResponse, V2SkuCheckResponse, V2WaybillListResponse } from '@/types';

interface ApiCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
  fromCache?: boolean;
}

async function logApiCall(
  requestId: string,
  apiName: string,
  method: string,
  url: string,
  requestBody: unknown,
  responseStatus: number | undefined,
  responseBody: unknown,
  durationMs: number,
  isSuccess: boolean,
  errorMessage?: string,
  errorType?: string
) {
  try {
    await db.insert(apiSyncLogs).values({
      requestId,
      apiName,
      method,
      urlSummary: url,
      requestBody: requestBody ? (typeof requestBody === 'object' ? requestBody as Record<string, unknown> : { body: String(requestBody) }) : null,
      responseStatus,
      responseBody: responseBody ? (typeof responseBody === 'object' ? responseBody as Record<string, unknown> : { body: String(responseBody) }) : null,
      durationMs,
      isSuccess,
      errorMessage,
      errorType,
    });
  } catch {
    // 日志记录失败不应影响主流程
    console.error('[V2 Client] 接口日志写入失败');
  }
}

async function callWithRetry<T>(
  apiName: string,
  method: string,
  path: string,
  body?: unknown
): Promise<ApiCallResult<T>> {
  const requestId = uuidv4();
  const url = `${v2Config.baseUrl}${path}`;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= v2Config.maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${v2Config.apiKey}`,
        'X-Request-ID': requestId,
        'X-System': 'v3-waybill-management',
        'Content-Type': 'application/json',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), v2Config.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;
      let responseBody: unknown;

      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      const isSuccess = response.ok;

      await logApiCall(
        requestId, apiName, method, url,
        body, response.status, responseBody,
        durationMs, isSuccess,
        isSuccess ? undefined : `HTTP ${response.status}`,
        isSuccess ? undefined : (response.status >= 500 ? '5xx' : '4xx')
      );

      if (isSuccess) {
        return { success: true, data: responseBody as T };
      }

      if (response.status === 404) {
        return { success: false, error: '资源不存在', errorType: '4xx' };
      }

      if (response.status >= 500 && attempt < v2Config.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return { success: false, error: `接口返回错误: ${response.status}`, errorType: response.status >= 500 ? '5xx' : '4xx' };

    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      const isTimeout = err instanceof Error && err.name === 'AbortError';

      if (isTimeout || attempt < v2Config.maxRetries) {
        await logApiCall(
          requestId, apiName, method, url,
          body, undefined, null,
          durationMs, false,
          isTimeout ? '请求超时' : errorMessage,
          isTimeout ? 'timeout' : 'network'
        );

        if (attempt < v2Config.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return { success: false, error: errorMessage, errorType: isTimeout ? 'timeout' : 'network' };
    }
  }

  return { success: false, error: '重试次数耗尽', errorType: 'network' };
}

// ========== 公开 API ==========

/** 校验运单存在 + 获取详情 */
export async function getWaybill(waybillNo: string): Promise<ApiCallResult<V2WaybillResponse>> {
  return callWithRetry<V2WaybillResponse>('getWaybill', 'GET', `/waybills/${waybillNo}`);
}

/** 校验 SKU 是否归属运单 */
export async function checkSkuBelonging(waybillNo: string, skuCode: string): Promise<ApiCallResult<V2SkuCheckResponse>> {
  return callWithRetry<V2SkuCheckResponse>('checkSku', 'GET', `/waybills/${waybillNo}/skus/${skuCode}`);
}

/** 按条件查询运单列表 */
export async function listWaybills(params: { page?: number; pageSize?: number; updatedAfter?: string; warehouseId?: string }): Promise<ApiCallResult<V2WaybillListResponse>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.updatedAfter) qs.set('updatedAfter', params.updatedAfter);
  if (params.warehouseId) qs.set('warehouseId', params.warehouseId);
  return callWithRetry<V2WaybillListResponse>('listWaybills', 'GET', `/waybills?${qs.toString()}`);
}

/** 异常状态回写 V2（可选） */
export async function setExceptionFlag(waybillNo: string, hasException: boolean, ticketNo?: string, exceptionType?: string): Promise<ApiCallResult<unknown>> {
  return callWithRetry('setExceptionFlag', 'POST', `/waybills/${waybillNo}/exception-flag`, {
    hasOpenException: hasException,
    exceptionTicketNo: ticketNo,
    exceptionType,
    requestedBy: 'v3-waybill-management',
  });
}
