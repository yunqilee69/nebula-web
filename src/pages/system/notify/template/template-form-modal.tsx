import { Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';
import { DictSelect } from '@/components/dict-select';
import type { NotifyTemplateStatus } from '@/types/notify';
import type { NotifyTemplateFormState, NotifyTemplateFormValues } from './template-page-helpers';
import { NOTIFY_CHANNEL_TYPE } from './template-page-helpers';
import { TemplateVariablePanel } from './template-variable-panel';

interface TemplateFormModalProps {
  readonly form: FormInstance<NotifyTemplateFormValues>;
  readonly formState: NotifyTemplateFormState;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

const statusOptions: readonly { readonly label: string; readonly value: NotifyTemplateStatus }[] = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
];

export function TemplateFormModal({
  form,
  formState,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: TemplateFormModalProps) {
  const subjectTemplate = Form.useWatch('subjectTemplate', form) ?? '';
  const contentTemplate = Form.useWatch('contentTemplate', form) ?? '';
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
      <Form form={form} layout="vertical" disabled={disabled} initialValues={{ status: 1 }}>
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
          <Form.Item
            name="channelType"
            label="通知渠道"
            rules={[{ required: true, message: '请选择通知渠道' }]}
          >
            <DictSelect
              dictCode={NOTIFY_CHANNEL_TYPE}
              disabled={disabled || formState.mode === 'update'}
              placeholder="请选择通知渠道"
              showDisabled={false}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select options={[...statusOptions]} placeholder="请选择状态" />
          </Form.Item>
        </div>
        <Form.Item name="subjectTemplate" label="主题模板">
          <Input.TextArea rows={2} placeholder="请输入主题模板，可使用 ${variableName} 变量" />
        </Form.Item>
        <Form.Item
          name="contentTemplate"
          label="内容模板"
          rules={[{ required: true, whitespace: true, message: '内容模板不能为空' }]}
        >
          <Input.TextArea rows={6} placeholder="请输入内容模板，可使用 ${variableName} 变量" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="请输入备注" />
        </Form.Item>
        <TemplateVariablePanel
          subjectTemplate={subjectTemplate}
          contentTemplate={contentTemplate}
        />
      </Form>
    </Modal>
  );
}
