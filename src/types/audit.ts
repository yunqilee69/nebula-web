import type { PageReq, PageResp } from './auth-management';

/**
 * 审计分类枚举
 */
export type AuditCategory = 'BUSINESS' | 'SECURITY';

/**
 * 审计一致性级别
 */
export type AuditConsistency = 'EVENTUAL' | 'STRONG';

/**
 * 审计记录列表项
 */
export interface AuditRecordResp {
  id: string;
  traceId: string;
  bizNo: string;
  module: string;
  action: string;
  resource: string;
  resourceId: string;
  category: AuditCategory;
  consistency: AuditConsistency;
  operatorId: string;
  operatorName: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  createTime: string;
}

/**
 * 审计记录详情
 */
export interface AuditRecordDetailResp extends AuditRecordResp {
  argsSnapshot?: string;
  resultSnapshot?: string;
  extraJson?: string;
  requestUri?: string;
  httpMethod?: string;
  clientIp?: string;
  userAgent?: string;
  durationMs?: number;
}

/**
 * 分页查询参数
 */
export interface AuditRecordPageReq extends PageReq {
  module?: string;
  action?: string;
  category?: AuditCategory;
  operatorId?: string;
  resource?: string;
  resourceId?: string;
  success?: boolean;
  bizNo?: string;
  traceId?: string;
}