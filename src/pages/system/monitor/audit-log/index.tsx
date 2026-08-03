import { Form } from 'antd';
import { useCallback, useState } from 'react';
import { auditService, type AuditService } from '@/services/audit';
import type { AuditRecordDetailResp, AuditRecordResp } from '@/types/audit';
import type { AuditRecordFilterValues } from './components/audit-record-filters';
import { AuditRecordFilters } from './components/audit-record-filters';
import { AuditRecordDetailModal } from './components/audit-record-detail-modal';
import { AuditRecordTable } from './components/audit-record-table';

export interface AuditLogPageProps {
  readonly service?: AuditService;
}

interface DetailState {
  open: boolean;
  loading: boolean;
  data?: AuditRecordDetailResp;
}

const EMPTY_DETAIL_STATE: DetailState = { open: false, loading: false };

export function AuditLogPage({ service: serviceProp }: AuditLogPageProps) {
  const service = serviceProp ?? auditService;
  const [form] = Form.useForm<AuditRecordFilterValues>();
  const [filters, setFilters] = useState<AuditRecordFilterValues>({});
  const [detailState, setDetailState] = useState<DetailState>(EMPTY_DETAIL_STATE);

  const handleSearch = useCallback((values: AuditRecordFilterValues) => {
    setFilters(values);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({});
  }, []);

  const handleDetail = useCallback(
    async (record: AuditRecordResp) => {
      setDetailState({ open: true, loading: true });

      try {
        const detail = await service.getRecordDetail(record.id);
        setDetailState({ open: true, loading: false, data: detail });
      } catch (error) {
        console.error('Failed to load audit record detail:', error);
        setDetailState({ open: false, loading: false });
      }
    },
    [service],
  );

  const handleDetailClose = useCallback(() => {
    setDetailState(EMPTY_DETAIL_STATE);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <AuditRecordFilters
          form={form}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      <div className="flex-1 min-h-0">
        <AuditRecordTable
          service={service}
          filters={filters}
          onDetail={handleDetail}
        />
      </div>

      <AuditRecordDetailModal
        open={detailState.open}
        loading={detailState.loading}
        detail={detailState.data}
        onClose={handleDetailClose}
      />
    </div>
  );
}

export default AuditLogPage;