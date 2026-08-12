import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { WECOM_WEBHOOK_HELP_LINK } from './template-page-helpers';
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

export function WeComWebhookHelp() {
  return (
    <Tooltip
      placement="bottom"
      title={(
        <div className="max-w-[480px] text-xs leading-relaxed">
          <Typography.Text strong className="text-sm">企业微信群机器人消息格式</Typography.Text>
          <br />
          内容模板将作为完整的 JSON 直接发送到 Webhook 地址，请按企业微信消息推送格式填写。
          <br />
          <br />
          <Typography.Text strong>文本消息示例：</Typography.Text>
          <br />
          <Typography.Text code copyable className="whitespace-pre-wrap">{'{"msgtype":"text","text":{"content":"你好世界","mentioned_list":["@all"]}}'}</Typography.Text>
          <br />
          <br />
          <Typography.Text strong>Markdown 消息示例：</Typography.Text>
          <br />
          <Typography.Text code copyable className="whitespace-pre-wrap">{'{"msgtype":"markdown","markdown":{"content":"实时新增 <font color=\\"warning\">132</font> 个用户"}}'}</Typography.Text>
          <br />
          <br />
          <Typography.Text strong>图文消息示例：</Typography.Text>
          <br />
          <Typography.Text code copyable className="whitespace-pre-wrap">{'{"msgtype":"news","news":{"articles":[{"title":"标题","url":"https://xxx","picurl":"https://xxx"}]}}'}</Typography.Text>
          <br />
          <br />
          支持在 JSON 值中使用 {'${variableName}'} 引用模板参数和系统变量。
          <br />
          <Typography.Link href={WECOM_WEBHOOK_HELP_LINK} target="_blank" rel="noopener noreferrer">
            查看企业微信消息推送文档
          </Typography.Link>
        </div>
      )}
    >
      <Button
        type="text"
        size="small"
        icon={<QuestionCircleOutlined />}
        aria-label="查看企业微信群机器人消息格式说明"
        className="text-[var(--nebula-color-text-secondary)]"
      />
    </Tooltip>
  );
}
