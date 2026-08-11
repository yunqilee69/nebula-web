import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SelectProps } from 'antd';
import { Select } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { NotifyService } from '@/services/notify';
import type { NotifyRecordResp } from '@/types/notify';
import { NotifyRecordPage } from './index';
import { buildNotifyRecordPageReq } from './record-table';

const CHANNEL_OPTIONS = [
  { label: '站内信', value: 'SITE' },
  { label: '邮件', value: 'EMAIL' },
] as const;

vi.mock('@/components/dict-select', () => ({
  DictSelect: ({ dictCode: _dictCode, showDisabled: _showDisabled, ...props }: SelectProps<string> & {
    readonly dictCode: string;
    readonly showDisabled?: boolean;
  }) => (
    <Select<string> {...props} options={[...CHANNEL_OPTIONS]} />
  ),
  DictLabel: ({ value }: { readonly value?: string }) => (
    <span>{CHANNEL_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-'}</span>
  ),
}));

const RECORDS = [
  {
    id: 'record-1',
    channelType: 'SITE',
    templateCode: 'ORDER_PAID',
    receiver: 'user-1',
    sendStatus: 'SUCCESS',
    sendTime: '2026-08-09T10:00:00',
    createTime: '2026-08-09T09:59:59',
  },
] as const satisfies readonly NotifyRecordResp[];

function createService(): Pick<NotifyService, 'pageNotifyRecords' | 'getNotifyRecord'> {
  return {
    pageNotifyRecords: vi.fn().mockResolvedValue({ data: RECORDS, total: RECORDS.length }),
    getNotifyRecord: vi.fn(),
  };
}

function renderPage() {
  const service = createService();
  render(
    <NebulaProvider>
      <NotifyRecordPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

afterEach(cleanup);

describe('buildNotifyRecordPageReq', () => {
  it('maps pagination, sorting, and normalized filters to the backend page request', () => {
    expect(buildNotifyRecordPageReq({
      pageNum: 3,
      pageSize: 50,
      orderName: 'createTime',
      orderType: 'desc',
      channelType: 'EMAIL',
      templateCode: '  ORDER_PAID  ',
      sendStatus: 'FAILED',
      receiver: '  ops@example.com  ',
      receiverUserId: '  user-a  ',
    })).toEqual({
      pageNum: 3,
      pageSize: 50,
      orderName: 'createTime',
      orderType: 'desc',
      channelType: 'EMAIL',
      templateCode: 'ORDER_PAID',
      sendStatus: 'FAILED',
      receiver: 'ops@example.com',
      receiverUserId: 'user-a',
    });
  });
});

describe('NotifyRecordPage filters', () => {
  it('submits channel, template, status, receiver, and receiver user filters', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('ORDER_PAID');
    await user.click(screen.getByRole('combobox', { name: '通知渠道' }));
    await user.click(await screen.findByText('邮件', { selector: '.ant-select-item-option-content' }));
    await user.type(screen.getByRole('textbox', { name: '模板编码' }), 'ORDER_PAID');
    await user.click(screen.getByRole('combobox', { name: '发送状态' }));
    await user.click(await screen.findByText('失败', { selector: '.ant-select-item-option-content' }));
    await user.type(screen.getByRole('textbox', { name: '接收人' }), 'ops@example.com');
    await user.type(screen.getByRole('textbox', { name: '接收用户 ID' }), 'user-a');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageNotifyRecords).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 20,
        channelType: 'EMAIL',
        templateCode: 'ORDER_PAID',
        sendStatus: 'FAILED',
        receiver: 'ops@example.com',
        receiverUserId: 'user-a',
      });
    });
  });
});
