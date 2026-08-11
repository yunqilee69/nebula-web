import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TemplateVariable } from '@/types/notify';
import { SYSTEM_TEMPLATE_VARIABLES } from './template-page-helpers';

const builtinVariableColumns: ColumnsType<TemplateVariable> = [
  {
    title: '变量名',
    dataIndex: 'name',
    width: 280,
    render: (name: string) => <Typography.Text code copyable>{name}</Typography.Text>,
  },
  {
    title: '说明',
    dataIndex: 'description',
    render: (description: string | undefined) => description ?? '-',
  },
];

export function BuiltinVariableHelp() {
  return (
    <Tooltip
      placement="bottom"
      title={(
        <Table<TemplateVariable>
          columns={builtinVariableColumns}
          dataSource={[...SYSTEM_TEMPLATE_VARIABLES]}
          pagination={false}
          rowKey="name"
          size="small"
          className="min-w-[440px]"
        />
      )}
    >
      <Button
        type="text"
        size="small"
        icon={<QuestionCircleOutlined />}
        aria-label="查看系统内置变量"
        className="text-[var(--nebula-color-text-secondary)]"
      />
    </Tooltip>
  );
}
