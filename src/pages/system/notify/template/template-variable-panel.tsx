import { Collapse, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import type { TemplateVariable } from '@/types/notify';
import { extractCustomTemplateVariables, SYSTEM_TEMPLATE_VARIABLES } from './template-page-helpers';

interface TemplateVariablePanelProps {
  readonly subjectTemplate?: string;
  readonly contentTemplate: string;
}

const variableColumns: ColumnsType<TemplateVariable> = [
  {
    title: '变量名',
    dataIndex: 'name',
    width: 280,
    render: (name: string) => <Typography.Text code copyable>{name}</Typography.Text>,
  },
  {
    title: '说明',
    dataIndex: 'description',
    render: (description: string | undefined, variable) => (
      description ?? (variable.kind === 'CUSTOM' ? '发送时通过模板参数传入' : '-')
    ),
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
    render: (_, variable) => (
      <Tag color={variable.kind === 'BUILTIN' ? 'blue' : 'default'}>
        {variable.kind === 'BUILTIN' ? '系统' : '自定义'}
      </Tag>
    ),
  },
];

export function TemplateVariablePanel({
  subjectTemplate,
  contentTemplate,
}: TemplateVariablePanelProps) {
  const customVariables = useMemo(
    () => extractCustomTemplateVariables(subjectTemplate, contentTemplate),
    [contentTemplate, subjectTemplate],
  );

  return (
    <Collapse
      defaultActiveKey={['custom', 'system']}
      items={[
        {
          key: 'custom',
          label: `自定义变量（${customVariables.length}）`,
          children: (
            <Table<TemplateVariable>
              columns={variableColumns}
              dataSource={[...customVariables]}
              locale={{ emptyText: '未发现自定义变量' }}
              pagination={false}
              rowKey="name"
              size="small"
            />
          ),
        },
        {
          key: 'system',
          label: `系统内置变量（${SYSTEM_TEMPLATE_VARIABLES.length}）`,
          children: (
            <Table<TemplateVariable>
              columns={variableColumns}
              dataSource={[...SYSTEM_TEMPLATE_VARIABLES]}
              pagination={false}
              rowKey="name"
              size="small"
            />
          ),
        },
      ]}
    />
  );
}
