import { request } from '@/request/request';
import type { PageResp } from '@/types/auth-management';
import type {
  AuditRecordDetailResp,
  AuditRecordPageReq,
  AuditRecordResp,
} from '@/types/audit';

export interface AuditService {
  pageRecords: (data: AuditRecordPageReq) => Promise<PageResp<AuditRecordResp>>;
  getRecordDetail: (id: string) => Promise<AuditRecordDetailResp>;
  listByBizNo: (bizNo: string) => Promise<AuditRecordResp[]>;
  listByTraceId: (traceId: string) => Promise<AuditRecordResp[]>;
}

export const auditService: AuditService = {
  pageRecords: (data) =>
    request<PageResp<AuditRecordResp>>({
      method: 'POST',
      url: '/api/audit/records/page',
      data,
    }),
  getRecordDetail: (id) =>
    request<AuditRecordDetailResp>({
      method: 'GET',
      url: `/api/audit/records/${id}`,
    }),
  listByBizNo: (bizNo) =>
    request<AuditRecordResp[]>({
      method: 'GET',
      url: `/api/audit/records/biz/${bizNo}`,
    }),
  listByTraceId: (traceId) =>
    request<AuditRecordResp[]>({
      method: 'GET',
      url: `/api/audit/records/trace/${traceId}`,
    }),
};