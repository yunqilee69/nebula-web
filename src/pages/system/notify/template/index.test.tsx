import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthManagementService } from '@/api/auth-management';
import type { NebulaPageResp } from '@/components/nebula-pro-table';
import { NebulaProvider } from '@/providers/nebula-provider';
import { dictService } from '@/services/dict';
import { useAuthStore } from '@/stores/auth-store';
import { useDictCacheStore } from '@/stores/dict-cache-store';
import type { UserResp } from '@/types/auth-management';
import type { DictItemTreeResp } from '@/types/dict';
import type { NotifyTemplateDetailResp, NotifyTemplateResp, ReceiverItem } from '@/types/notify';
import { TemplateManagementPage } from './index';
import type { NotifyTemplateService } from './template-page-helpers';

vi.mock('@/services/dict', () => ({
  dictService: {
    listItemsByCode: vi.fn(),
  },
}));

vi.mock('@/components/dict-select', () => ({
  DictLabel: ({ value }: { readonly dictCode: string; readonly value: string }) => <span>{value}</span>,
  DictSelect: ({
    dictCode,
    mode,
    value,
    disabled,
    onChange,
  }: {
    readonly dictCode: string;
    readonly mode?: string;
    readonly value?: readonly string[] | string;
    readonly disabled?: boolean;
    readonly onChange?: (value: readonly string[] | string) => void;
  }) => (
    <select
      aria-label="通知渠道"
      data-dict-code={dictCode}
      data-mode={mode}
      disabled={disabled}
      multiple={mode === 'multiple'}
      value={value ?? (mode === 'multiple' ? [] : '')}
      onChange={(event) => {
        if (mode === 'multiple') {
          onChange?.(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
          return;
        }
        onChange?.(event.currentTarget.value);
      }}
    >
      <option value="SITE">SITE</option>
      <option value="EMAIL">EMAIL</option>
    </select>
  ),
}));

const sendUsers: readonly UserResp[] = [
  { id: 'user-a', username: 'alice', email: 'alice@example.com', status: 1 },
];

const receiverItems: readonly ReceiverItem[] = [
  { sourceType: 'USER', sourceId: 'user-a', sourceName: 'alice', users: sendUsers },
];

vi.mock('@/pages/system/notify/components/receiver-selector', () => ({
  ReceiverSelector: ({
    value,
    onChange,
  }: {
    readonly value: readonly ReceiverItem[];
    readonly onChange: (items: readonly ReceiverItem[]) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange(receiverItems)}>选择接收对象</button>
      <span>已选择 {value.length} 个接收对象</span>
    </div>
  ),
}));

const listItemsByCode = vi.mocked(dictService.listItemsByCode);

const channelItems: readonly DictItemTreeResp[] = [
  { id: 'channel-site', dictCode: 'NOTIFY_CHANNEL_TYPE', name: '站内信', itemValue: 'SITE', sort: 1, enabled: true },
  { id: 'channel-email', dictCode: 'NOTIFY_CHANNEL_TYPE', name: '邮件', itemValue: 'EMAIL', sort: 2, enabled: true },
];

const builtinTemplate: NotifyTemplateResp = {
  id: 'template-builtin',
  templateCode: 'SYSTEM_ALERT',
  templateName: '系统提醒',
  channelType: 'SITE',
  status: 1,
  builtinFlag: true,
};

const customTemplate: NotifyTemplateResp = {
  id: 'template-custom',
  templateCode: 'ORDER_APPROVED',
  templateName: '订单审批通过',
  channelType: 'EMAIL',
  status: 1,
  builtinFlag: false,
};

const customTemplateDetail: NotifyTemplateDetailResp = {
  ...customTemplate,
  subjectTemplate: '${recipientName}，订单已审批',
  contentTemplate: '${recipientName} 的订单 ${orderNo} 已于 ${notify.currentDateTime} 审批通过。',
  remark: '订单审批结果通知',
};

function createPage(data: readonly NotifyTemplateResp[]): NebulaPageResp<NotifyTemplateResp> {
  return { data: [...data], total: data.length };
}

function createService(overrides: Partial<NotifyTemplateService> = {}): NotifyTemplateService {
  return {
    pageNotifyTemplates: vi.fn().mockResolvedValue(createPage([builtinTemplate, customTemplate])),
    getNotifyTemplate: vi.fn().mockResolvedValue(customTemplateDetail),
    createNotifyTemplate: vi.fn().mockResolvedValue('template-created'),
    updateNotifyTemplate: vi.fn().mockResolvedValue('template-custom'),
    deleteNotifyTemplate: vi.fn().mockResolvedValue(undefined),
    sendNotify: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const TEMPLATE_PERMISSIONS = [
  'NOTIFY_TEMPLATE_CREATE',
  'NOTIFY_TEMPLATE_EDIT',
  'NOTIFY_TEMPLATE_DELETE',
  'NOTIFY_SEND_EXECUTE',
] as const;

const authService = {
  listRoles: vi.fn().mockResolvedValue([]),
  getOrgTree: vi.fn().mockResolvedValue([]),
  pageUsers: vi.fn().mockResolvedValue({ data: [], total: 0 }),
} satisfies Pick<AuthManagementService, 'listRoles' | 'getOrgTree' | 'pageUsers'>;

function renderPage(
  service: NotifyTemplateService,
  permissions: readonly string[] = TEMPLATE_PERMISSIONS,
): void {
  render(
    <NebulaProvider>
      <TemplateManagementPage service={service} authService={authService} />
    </NebulaProvider>,
  );
  act(() => {
    useAuthStore.getState().setUser({
      id: 'notify-test-user',
      name: 'Notify Test User',
      roles: [],
      permissions: [...permissions],
    });
  });
}

function getRow(text: string): HTMLElement {
  const row = screen.getByText(text).closest('tr');
  if (row instanceof HTMLElement) return row;
  throw new Error(`Unable to find table row for ${text}`);
}

describe('TemplateManagementPage', () => {
  beforeEach(() => {
    useDictCacheStore.getState().reset();
    listItemsByCode.mockResolvedValue([...channelItems]);
  });

  afterEach(() => {
    cleanup();
    act(() => useAuthStore.getState().clearUser());
    listItemsByCode.mockReset();
  });

  it('hides template actions when the user has no template permissions', async () => {
    const service = createService();
    renderPage(service, []);

    const row = await waitFor(() => getRow('ORDER_APPROVED'));

    expect(screen.queryByRole('button', { name: '新增模板' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '发送通知' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /发送/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
  });

  it('disables deletion for built-in templates and explains the protection rule', async () => {
    const user = userEvent.setup();
    const service = createService();
    renderPage(service);

    const row = await waitFor(() => getRow('SYSTEM_ALERT'));
    const deleteButton = within(row).getByRole('button', { name: /删除/ });
    const tooltipTrigger = deleteButton.parentElement;
    if (!(tooltipTrigger instanceof HTMLElement)) throw new Error('Missing built-in delete tooltip trigger');

    expect(deleteButton).toBeDisabled();
    await user.hover(tooltipTrigger);

    expect(await screen.findByText('内置模板不允许删除')).toBeInTheDocument();
    expect(service.deleteNotifyTemplate).not.toHaveBeenCalled();
  });

  it('loads template detail and renders custom and built-in variables read-only', async () => {
    const user = userEvent.setup();
    const service = createService();
    renderPage(service);

    const row = await waitFor(() => getRow('ORDER_APPROVED'));
    await user.click(within(row).getByRole('button', { name: /查看/ }));

    await waitFor(() => expect(service.getNotifyTemplate).toHaveBeenCalledWith('template-custom'));
    const title = await screen.findByText('模板详情');
    const dialog = title.closest('.ant-modal');
    if (!(dialog instanceof HTMLElement)) throw new Error('Unable to find template detail modal');
    expect(within(dialog).getByText('recipientName')).toBeInTheDocument();
    expect(within(dialog).getByText('orderNo')).toBeInTheDocument();
    expect(within(dialog).queryByText('notify.currentDateTime', { selector: 'code' })).not.toBeNull();
    expect(within(dialog).queryAllByRole('textbox')).toHaveLength(0);
  });

  it('opens send flow from a template row with that template preselected', async () => {
    const user = userEvent.setup();
    const sendNotify = vi.fn().mockResolvedValue([
      { recordId: 'record-a', channelType: 'EMAIL', receiver: 'alice@example.com', sendStatus: 'SUCCESS' },
    ]);
    const service = createService({ sendNotify });
    renderPage(service);

    const row = await waitFor(() => getRow('ORDER_APPROVED'));
    await user.click(within(row).getByRole('button', { name: /发送/ }));

    const sendTitles = await screen.findAllByText('发送通知');
    const drawer = sendTitles.map((element) => element.closest('.ant-drawer')).find((element) => element instanceof HTMLElement);
    if (!(drawer instanceof HTMLElement)) throw new Error('Unable to find send drawer');
    await waitFor(() => expect(service.getNotifyTemplate).toHaveBeenCalledWith('template-custom'));
    await user.type(within(drawer).getByLabelText('recipientName'), 'Alice');
    await user.type(within(drawer).getByLabelText('orderNo'), 'ORD-001');
    await user.click(within(drawer).getByRole('button', { name: '选择接收对象' }));
    await waitFor(() => expect(within(drawer).getByText('已选择 1 个接收对象')).toBeInTheDocument());
    await user.click(within(drawer).getByRole('button', { name: /预览并发送/ }));
    const confirmationText = await screen.findByText('请核对渠道与接收人数。确认后将以一次请求提交全部投递。');
    const confirmationDialog = confirmationText.closest('.ant-modal');
    if (!(confirmationDialog instanceof HTMLElement)) throw new Error('Unable to find send confirmation modal');
    await user.click(within(confirmationDialog).getByRole('button', { name: '确认发送' }));

    await waitFor(() => expect(service.sendNotify).toHaveBeenCalledTimes(1));
    expect(service.sendNotify).toHaveBeenCalledWith({
      channelTypes: ['EMAIL'],
      templateCode: 'ORDER_APPROVED',
      templateParams: { recipientName: 'Alice', orderNo: 'ORD-001' },
      receiverUserIds: ['user-a'],
      receiver: 'alice@example.com',
    });
    expect(await within(drawer).findByText('record-a')).toBeInTheDocument();
  });
});
