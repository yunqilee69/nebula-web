import { SendOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Form, Input, Select, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthManagementService } from '@/api/auth-management';
import { Access } from '@/components/access';
import { DictSelect } from '@/components/dict-select';
import { useNotice } from '@/hooks/use-notice';
import type { NotifyService } from '@/services/notify';
import type { ChannelType, NotifySendResultResp, NotifyTemplateDetailResp, NotifyTemplateResp, ReceiverItem } from '@/types/notify';
import { ReceiverSelector } from './receiver-selector';
import { SendConfirmationModal } from './send-confirmation-modal';
import { createSendPlan, extractCustomTemplateVariables } from './send-page-helpers';
import type { ValidSendPlan } from './send-page-helpers';
import { SendResultTable } from './send-result-table';

type SendFormValues = {
  readonly channelTypes?: readonly ChannelType[];
  readonly templateId?: string;
  readonly templateParams?: Readonly<Record<string, string>>;
};

export type NotificationSendService = Pick<NotifyService, 'pageNotifyTemplates' | 'getNotifyTemplate' | 'sendNotify'>;
export type NotificationSendAuthService = Pick<AuthManagementService, 'getOrgTree' | 'listRoles' | 'pageUsers'>;

export type NotificationSendPanelProps = {
  readonly notifyService: NotificationSendService;
  readonly authService: NotificationSendAuthService;
  readonly initialTemplateId?: string;
  readonly showCard?: boolean;
};

function invalidPlanMessage(reason: Exclude<ReturnType<typeof createSendPlan>, ValidSendPlan>['reason']): string {
  switch (reason) {
    case 'CHANNELS_REQUIRED':
      return '请选择至少一个通知渠道';
    case 'RECIPIENTS_REQUIRED':
      return '请选择至少一个有效接收用户';
    case 'EMAIL_RECIPIENTS_REQUIRED':
      return '邮件渠道至少需要一个配置了邮箱的用户';
  }
}

export function NotificationSendPanel({
  notifyService: service,
  authService,
  initialTemplateId,
  showCard = true,
}: NotificationSendPanelProps) {
  const notice = useNotice();
  const [form] = Form.useForm<SendFormValues>();
  const [templates, setTemplates] = useState<readonly NotifyTemplateResp[]>([]);
  const [templateDetail, setTemplateDetail] = useState<NotifyTemplateDetailResp>();
  const [templateListLoading, setTemplateListLoading] = useState(false);
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false);
  const [receiverItems, setReceiverItems] = useState<readonly ReceiverItem[]>([]);
  const [pendingPlan, setPendingPlan] = useState<ValidSendPlan>();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<readonly NotifySendResultResp[]>([]);

  const loadTemplateDetail = useCallback(async (templateId: string | undefined) => {
    setTemplateDetail(undefined);
    form.setFieldValue('templateParams', {});
    form.setFieldValue('channelTypes', []);
    if (!templateId) return;
    setTemplateDetailLoading(true);
    try {
      const detail = await service.getNotifyTemplate(templateId);
      setTemplateDetail(detail);
      form.setFieldValue('channelTypes', [detail.channelType]);
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('通知模板详情加载失败');
        return;
      }
      throw error;
    } finally {
      setTemplateDetailLoading(false);
    }
  }, [form, notice, service]);

  useEffect(() => {
    let active = true;
    setTemplateListLoading(true);
    service.pageNotifyTemplates({ pageNum: 1, pageSize: 100, status: 1 })
      .then((page) => {
        if (active) setTemplates(page.data);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          notice.error('通知模板加载失败');
          return;
        }
        throw error;
      })
      .finally(() => {
        if (active) setTemplateListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notice, service]);

  useEffect(() => {
    form.resetFields();
    setReceiverItems([]);
    setPendingPlan(undefined);
    setConfirmationOpen(false);
    setResults([]);
    if (!initialTemplateId) {
      setTemplateDetail(undefined);
      return;
    }
    form.setFieldValue('templateId', initialTemplateId);
    void loadTemplateDetail(initialTemplateId);
  }, [form, initialTemplateId, loadTemplateDetail]);

  const variables = useMemo(
    () => templateDetail
      ? extractCustomTemplateVariables(templateDetail.subjectTemplate, templateDetail.contentTemplate)
      : [],
    [templateDetail],
  );

  const previewSend = useCallback(async () => {
    const values = await form.validateFields().then(
      (validatedValues) => validatedValues,
      () => undefined,
    );
    if (!values) return;
    if (!templateDetail) {
      notice.error('请等待通知模板详情加载完成');
      return;
    }
    const plan = createSendPlan({
      channelTypes: values.channelTypes ?? [],
      receiverItems,
      templateCode: templateDetail.templateCode,
      templateChannelType: templateDetail.channelType,
      templateParams: values.templateParams ?? {},
    });
    switch (plan.kind) {
      case 'INVALID':
        notice.error(invalidPlanMessage(plan.reason));
        return;
      case 'VALID':
        setPendingPlan(plan);
        setConfirmationOpen(true);
        return;
    }
  }, [form, notice, receiverItems, templateDetail]);

  const confirmSend = useCallback(async () => {
    if (!pendingPlan || sending) return;
    setSending(true);
    try {
      const sendResults = await service.sendNotify(pendingPlan.request);
      setResults(sendResults);
      setConfirmationOpen(false);
      setPendingPlan(undefined);
      notice.success('通知发送请求已完成');
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('通知发送失败');
        return;
      }
      throw error;
    } finally {
      setSending(false);
    }
  }, [notice, pendingPlan, sending, service]);

  const templateLoading = templateListLoading || templateDetailLoading;
  const formContent = (
    <Form<SendFormValues> form={form} layout="vertical">
      <Form.Item
        name="channelTypes"
        label="通知渠道"
        rules={[{ required: true, type: 'array', min: 1, message: '请选择至少一个通知渠道' }]}
      >
        <DictSelect
          dictCode="NOTIFY_CHANNEL_TYPE"
          mode="multiple"
          showDisabled={false}
          aria-label="通知渠道"
          allowClear={false}
          disabled
          placeholder="选择模板后自动带出渠道"
        />
      </Form.Item>

      <Form.Item
        name="templateId"
        label="通知模板"
        rules={[{ required: true, message: '请选择通知模板' }]}
      >
        <Select
          aria-label="通知模板"
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          loading={templateLoading}
          disabled={templates.length === 0}
          placeholder="选择启用的通知模板"
          options={templates.map((template) => ({
            value: template.id,
            label: `${template.templateName} (${template.templateCode})`,
          }))}
          onChange={(templateId: string | undefined) => void loadTemplateDetail(templateId)}
        />
      </Form.Item>

      {templateDetailLoading && form.getFieldValue('templateId') ? <Spin size="small" /> : null}
      {templateDetail ? (
        <Typography.Paragraph type="secondary">
          已加载模板：{templateDetail.templateName} ({templateDetail.templateCode})
        </Typography.Paragraph>
      ) : null}

      {variables.map((variable) => (
        <Form.Item
          key={variable}
          name={['templateParams', variable]}
          label={variable}
          rules={[{ required: true, message: `请输入模板参数 ${variable}` }]}
        >
          <Input aria-label={variable} placeholder={`输入 ${variable}`} />
        </Form.Item>
      ))}

      <Form.Item label="接收对象" required>
        <ReceiverSelector service={authService} value={receiverItems} onChange={setReceiverItems} />
      </Form.Item>

      <Access permission="NOTIFY_SEND_EXECUTE" fallback={null}>
        <Button type="primary" icon={<SendOutlined />} onClick={() => void previewSend()}>
          预览并发送
        </Button>
      </Access>
    </Form>
  );

  return (
    <Flex vertical gap="large">
      {showCard ? <Card title="发送通知">{formContent}</Card> : formContent}
      <SendResultTable results={results} />
      <SendConfirmationModal
        open={confirmationOpen}
        plan={pendingPlan}
        confirming={sending}
        onConfirm={() => void confirmSend()}
        onCancel={() => {
          setConfirmationOpen(false);
          setPendingPlan(undefined);
        }}
      />
    </Flex>
  );
}
