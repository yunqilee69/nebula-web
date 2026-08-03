import type { NebulaAuditMessages } from '../../types';

export const audit: NebulaAuditMessages = {
  columns: {
    id: 'Audit Record ID',
    traceId: 'Trace ID',
    bizNo: 'Business No.',
    module: 'Module',
    action: 'Action',
    resource: 'Resource Type',
    resourceId: 'Resource ID',
    category: 'Category',
    consistency: 'Consistency',
    operatorId: 'Operator ID',
    operatorName: 'Operator Name',
    success: 'Status',
    errorCode: 'Error Code',
    errorMessage: 'Error Message',
    createTime: 'Create Time',
    actions: 'Actions',
  },
  category: {
    business: 'Business',
    security: 'Security',
  },
  consistency: {
    eventual: 'Eventual',
    strong: 'Strong',
  },
  status: {
    success: 'Success',
    failed: 'Failed',
  },
  modal: {
    detailTitle: 'Audit Record Detail',
    basicInfo: 'Basic Information',
    requestInfo: 'Request Information',
    argsSnapshot: 'Args Snapshot',
    resultSnapshot: 'Result Snapshot',
    extraInfo: 'Extra Information',
    noData: 'No data',
  },
  pagination: {
    total: 'Total {count} records',
  },
};