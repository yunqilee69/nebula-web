import type { NebulaAuditMessages } from '../../types';

export const audit: NebulaAuditMessages = {
  columns: {
    id: '审计记录ID',
    traceId: '链路追踪ID',
    bizNo: '业务编号',
    module: '模块',
    action: '操作',
    resource: '资源类型',
    resourceId: '资源ID',
    category: '审计分类',
    consistency: '一致性',
    operatorId: '操作人ID',
    operatorName: '操作人名称',
    success: '执行状态',
    errorCode: '错误码',
    errorMessage: '错误信息',
    createTime: '创建时间',
    actions: '操作',
  },
  category: {
    business: '业务操作',
    security: '安全审计',
  },
  consistency: {
    eventual: '最终一致性',
    strong: '强一致性',
  },
  status: {
    success: '成功',
    failed: '失败',
  },
  modal: {
    detailTitle: '审计记录详情',
    basicInfo: '基本信息',
    requestInfo: '请求信息',
    argsSnapshot: '参数快照',
    resultSnapshot: '结果快照',
    extraInfo: '扩展信息',
    noData: '暂无数据',
  },
  pagination: {
    total: '共 {count} 条记录',
  },
};