import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Switch, Tabs, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { DictSelect } from '@/components/dict-select';
import type { UpdateNotifyTemplateVariantReq } from '@/types/notify';
import type { NotifyTemplateFormState, NotifyTemplateFormValues } from './template-page-helpers';
import { NOTIFY_CHANNEL_TYPE } from './template-page-helpers';
import { BuiltinVariableHelp } from './template-variable-panel';

interface TemplateFormModalProps {
  readonly form: FormInstance<NotifyTemplateFormValues>;
  readonly formState: NotifyTemplateFormState;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

const DEFAULT_VARIANT = { channelType: 'SITE', contentTemplate: '' } as const;

function variantTabLabel(variant: UpdateNotifyTemplateVariantReq | undefined, index: number): string {
  const channelType = variant?.channelType?.trim();
  return channelType ? channelType : `变体 ${index + 1}`;
}

function sectionTitle(title: string) {
  return (
    <div className="flex items-center gap-2">
      <span>{title}</span>
      <BuiltinVariableHelp />
    </div>
  );
}

export function TemplateFormModal({
  form,
  formState,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: TemplateFormModalProps) {
  const variants: readonly UpdateNotifyTemplateVariantReq[] = Form.useWatch('variants', form) ?? [];
  const disabled = submitting || detailLoading;

  return (
    <Modal
      title={formState.mode === 'create' ? '新增通知模板' : '编辑通知模板'}
      open={open}
      width={900}
      confirmLoading={submitting}
      okText="保存"
      cancelText="取消"
      forceRender
      destroyOnHidden
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" disabled={disabled} initialValues={{ fields: [], variants: [DEFAULT_VARIANT] }}>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            name="templateCode"
            label="模板编码"
            rules={[{ required: true, whitespace: true, message: '模板编码不能为空' }]}
          >
            <Input disabled={formState.mode === 'update'} placeholder="请输入模板编码" />
          </Form.Item>
          <Form.Item
            name="templateName"
            label="模板名称"
            rules={[{ required: true, whitespace: true, message: '模板名称不能为空' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
        </div>

        <Form.List name="fields">
          {(fieldItems, { add, remove }) => (
            <Card
              size="small"
              title={sectionTitle('参数定义')}
              extra={<Button type="link" icon={<PlusOutlined />} onClick={() => add({ requiredFlag: false })}>新增字段</Button>}
              className="mb-4"
            >
              {fieldItems.length === 0 ? (
                <Typography.Text type="secondary">暂无参数定义，可从变体内容中自动识别变量。</Typography.Text>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-left text-[var(--nebula-color-text-secondary)]">
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">字段编码</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">字段名称</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">默认值</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">示例值</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">必填</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">备注</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldItems.map((fieldItem) => (
                        <tr key={fieldItem.key}>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'id']} hidden><Input /></Form.Item>
                            <Form.Item
                              name={[fieldItem.name, 'fieldCode']}
                              rules={[{ required: true, whitespace: true, message: '字段编码不能为空' }]}
                              className="mb-0"
                            >
                              <Input aria-label="字段编码" placeholder="如 orderNo" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item
                              name={[fieldItem.name, 'fieldName']}
                              rules={[{ required: true, whitespace: true, message: '字段名称不能为空' }]}
                              className="mb-0"
                            >
                              <Input aria-label="字段名称" placeholder="如 订单号" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'defaultValue']} className="mb-0">
                              <Input aria-label="默认值" placeholder="可选默认值" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'exampleValue']} className="mb-0">
                              <Input aria-label="示例值" placeholder="可选示例值" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'requiredFlag']} valuePropName="checked" className="mb-0">
                              <Switch aria-label="是否必填" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'remark']} className="mb-0">
                              <Input aria-label="备注" placeholder="字段说明" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Button danger type="link" icon={<DeleteOutlined />} aria-label="删除字段" onClick={() => remove(fieldItem.name)}>删除</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </Form.List>

        <Form.List
          name="variants"
          rules={[{
            validator: async (_, value: readonly unknown[] | undefined) => {
              if (value && value.length > 0) return;
              throw new Error('至少需要一个渠道变体');
            },
          }]}
        >
          {(variantItems, { add, remove }, { errors }) => (
            <Card
              size="small"
              title={sectionTitle('渠道变体')}
              extra={<Button type="link" icon={<PlusOutlined />} onClick={() => add(DEFAULT_VARIANT)}>新增变体</Button>}
              className="mb-4"
            >
              <div className="space-y-3">
                <Tabs
                  type="card"
                  items={variantItems.map((variantItem, index) => ({
                    key: String(variantItem.key),
                    label: variantTabLabel(variants[variantItem.name], index),
                    children: (
                      <div className="rounded-md border border-solid border-[var(--nebula-color-border)] p-3">
                        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                          <Form.Item name={[variantItem.name, 'id']} hidden><Input /></Form.Item>
                          <Form.Item
                            name={[variantItem.name, 'channelType']}
                            label="通知渠道"
                            rules={[{ required: true, message: '请选择通知渠道' }]}
                          >
                            <DictSelect dictCode={NOTIFY_CHANNEL_TYPE} placeholder="请选择通知渠道" showDisabled={false} />
                          </Form.Item>
                          <Form.Item name={[variantItem.name, 'remark']} label="变体备注">
                            <Input placeholder="可选备注" />
                          </Form.Item>
                        </div>
                        <Form.Item name={[variantItem.name, 'subjectTemplate']} label="主题模板">
                          <Input.TextArea rows={2} placeholder="请输入主题模板，可使用 ${variableName} 变量" />
                        </Form.Item>
                        <Form.Item
                          name={[variantItem.name, 'contentTemplate']}
                          label="内容模板"
                          rules={[{ required: true, whitespace: true, message: '内容模板不能为空' }]}
                        >
                          <Input.TextArea rows={5} placeholder="请输入内容模板，可使用 ${variableName} 变量" />
                        </Form.Item>
                        <div className="flex justify-end">
                          <Button danger type="link" icon={<DeleteOutlined />} onClick={() => remove(variantItem.name)} disabled={variantItems.length <= 1}>删除变体</Button>
                        </div>
                      </div>
                    ),
                  }))}
                />
                <Form.ErrorList errors={errors} />
              </div>
            </Card>
          )}
        </Form.List>

        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
