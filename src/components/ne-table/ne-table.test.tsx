import { Button, Form, Input, Table } from 'antd';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NeTable } from './index';
import type { NeTableAction, NeTableSearchProps } from './types';

interface UserRecord {
  id: string;
  name: string;
  email: string;
}

const users: UserRecord[] = [
  { id: '1', name: 'Ada', email: 'ada@example.com' },
  { id: '2', name: 'Grace', email: 'grace@example.com' },
];

const HotReloadedSearch = Object.assign(
  function HotReloadedSearch<Query extends object = Record<string, unknown>>({ children }: NeTableSearchProps<Query>) {
    return <>{children}</>;
  },
  { __NE_TABLE_SLOT: 'search' as const },
);

describe('NeTable', () => {
  it('does not render a search region by default', () => {
    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={users}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      />,
    );

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.queryByTestId('ne-table-search')).not.toBeInTheDocument();
  });

  it('renders the search slot only when NeTable.Search is passed', () => {
    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={users}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      >
        <NeTable.Search>
          <Form layout="inline">
            <Form.Item name="name" label="姓名">
              <Input />
            </Form.Item>
          </Form>
        </NeTable.Search>
      </NeTable>,
    );

    expect(screen.getByTestId('ne-table-search')).toBeInTheDocument();
    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
  });

  it('recognizes marked search slots even when component references differ after hot reload', () => {
    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={users}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      >
        <HotReloadedSearch>
          <Form layout="inline">
            <Form.Item name="name" label="姓名">
              <Input />
            </Form.Item>
          </Form>
        </HotReloadedSearch>
      </NeTable>,
    );

    expect(screen.getByTestId('ne-table-search')).toBeInTheDocument();
    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
  });

  it('wraps search in a collapsible block with only the toggle description in the button', async () => {
    const user = userEvent.setup();

    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={users}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      >
        <NeTable.Search>
          <Form layout="inline">
            <Form.Item name="name" label="姓名">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="邮箱">
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary">查询</Button>
              <Button>重置</Button>
            </Form.Item>
          </Form>
        </NeTable.Search>
      </NeTable>,
    );

    const searchBlock = screen.getByTestId('ne-table-search');
    const fields = screen.getByTestId('ne-table-search-fields');
    const toggle = screen.getByRole('button', { name: /收\s*起/ });

    expect(screen.getByText('搜索条件')).toBeInTheDocument();
    expect(screen.queryByText(/已展开|已折叠/)).not.toBeInTheDocument();
    expect(fields).toHaveStyle({ maxHeight: '220px' });
    expect(searchBlock).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);

    expect(searchBlock).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /展\s*开/ })).toBeInTheDocument();
    expect(fields).toHaveStyle({ maxHeight: '32px' });
    expect(screen.getByRole('button', { name: /查\s*询/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重\s*置/ })).toBeInTheDocument();
  });

  it('renders toolbar content when NeTable.Toolbar is passed', () => {
    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={users}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      >
        <NeTable.Toolbar>
          <Button type="primary">新增</Button>
        </NeTable.Toolbar>
      </NeTable>,
    );

    expect(screen.getByTestId('ne-table-toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新\s*增/ })).toBeInTheDocument();
  });

  it('renders the toolbar inside the table block with left aligned actions and no default title', () => {
    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={users}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      >
        <NeTable.Toolbar>
          <Button type="primary">新增</Button>
        </NeTable.Toolbar>
      </NeTable>,
    );

    expect(screen.getByTestId('ne-table-table-block')).toBeInTheDocument();
    expect(screen.getByTestId('ne-table-toolbar')).toHaveStyle({ justifyContent: 'flex-start' });
    expect(screen.queryByText('用户列表')).not.toBeInTheDocument();
  });

  it('keeps table block padding removed while giving the toolbar its own padding', () => {
    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={users}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      >
        <NeTable.Toolbar>
          <Button type="primary">新增</Button>
        </NeTable.Toolbar>
      </NeTable>,
    );

    expect(screen.getByTestId('ne-table-table-block')).toHaveStyle({ padding: '0px' });
    expect(screen.getByTestId('ne-table-toolbar')).toHaveStyle({ padding: '20px' });
  });

  it('fills its parent and lets the table block consume the remaining height without default padding', () => {
    const { container } = render(
      <div style={{ width: 640, height: 480 }}>
        <NeTable<UserRecord>
          rowKey="id"
          dataSource={users}
          columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
        >
          <NeTable.Search>
            <Form layout="inline">
              <Form.Item name="name" label="姓名">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary">查询</Button>
              </Form.Item>
            </Form>
          </NeTable.Search>
        </NeTable>
      </div>,
    );

    const neTableRoot = container.firstElementChild?.firstElementChild;
    const tableBlock = screen.getByTestId('ne-table-table-block');

    expect(neTableRoot).toHaveStyle({ width: '100%', height: '100%', minHeight: '0' });
    expect(tableBlock).toHaveStyle({ flex: '1 1 auto', minHeight: '0', overflow: 'hidden' });
    expect(tableBlock).toHaveStyle({ padding: '0px' });
  });

  it('keeps the table block content-sized so the empty state is visible in auto-height parents', () => {
    render(
      <NeTable<UserRecord>
        rowKey="id"
        dataSource={[]}
        columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
      />,
    );

    expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
    expect(screen.getByTestId('ne-table-table-block')).toHaveStyle({ flex: '1 1 auto' });
  });

  it('lets the underlying Ant Design table wrapper fill the table block', () => {
    const { container } = render(
      <div style={{ width: 640, height: 480 }}>
        <NeTable<UserRecord>
          rowKey="id"
          dataSource={[]}
          columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
        >
          <NeTable.Search>
            <Form layout="inline">
              <Form.Item name="name" label="姓名">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary">查询</Button>
              </Form.Item>
            </Form>
          </NeTable.Search>
        </NeTable>
      </div>,
    );

    expect(screen.getByTestId('ne-table-table-block')).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
    });
    expect(container.querySelector('.ant-table-wrapper')).toHaveStyle({ flex: '1 1 auto', minHeight: '0' });
  });

  it('pushes the default Ant Design pagination to the bottom of the remaining table area', () => {
    const { container } = render(
      <div style={{ width: 640, height: 480 }}>
        <NeTable<UserRecord>
          rowKey="id"
          dataSource={users}
          columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
        >
          <NeTable.Search>
            <Form layout="inline">
              <Form.Item name="name" label="姓名">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary">查询</Button>
              </Form.Item>
            </Form>
          </NeTable.Search>
        </NeTable>
      </div>,
    );

    expect(container.querySelector('.ne-table-root')).toHaveStyle({ display: 'flex', flexDirection: 'column' });
    expect(container.querySelector('.ne-table-ant-wrapper')).toHaveStyle({ display: 'flex', flexDirection: 'column' });
    expect(container.querySelector('.ne-table-ant-wrapper > .ant-spin, .ne-table-ant-wrapper > .ant-spin-nested-loading')).toHaveStyle({ flex: '1 1 auto', minHeight: '0' });
    expect(container.querySelector('.ant-table-pagination')).toHaveStyle({ marginTop: 'auto' });
  });

  it('lets the Ant Design fixed-header table body and cells fill the available table height', () => {
    const { container } = render(
      <div style={{ width: 640, height: 480 }}>
        <NeTable<UserRecord>
          rowKey="id"
          dataSource={[]}
          columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
        >
          <NeTable.Search>
            <Form layout="inline">
              <Form.Item name="name" label="姓名">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary">查询</Button>
              </Form.Item>
            </Form>
          </NeTable.Search>
        </NeTable>
      </div>,
    );

    expect(container.querySelector('.ant-table-container')).toHaveStyle({ height: '100%' });
    expect(container.querySelector('.ant-table-header')).toBeInTheDocument();
    expect(container.querySelector('.ant-table-body')).toHaveStyle({ flex: '1 1 auto', minHeight: '0' });
    expect(container.querySelector('.ant-table-body > table')).toHaveStyle({ height: '100%' });
  });

  it('keeps the table header fixed while vertical scrolling belongs to the body only', () => {
    const { container } = render(
      <div style={{ width: 640, height: 480 }}>
        <NeTable<UserRecord>
          rowKey="id"
          dataSource={users}
          columns={[{ title: '姓名', dataIndex: 'name', key: 'name' }]}
        >
          <NeTable.Search>
            <Form layout="inline">
              <Form.Item name="name" label="姓名">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary">查询</Button>
              </Form.Item>
            </Form>
          </NeTable.Search>
        </NeTable>
      </div>,
    );

    expect(container.querySelector('.ant-table-header')).toBeInTheDocument();
    expect(container.querySelector('.ant-table-body')).toHaveStyle({ maxHeight: '100%' });
    expect(container.querySelector('style')?.textContent).toContain('.ne-table-ant-wrapper .ant-table-body');
    expect(container.querySelector('style')?.textContent).toContain('overflow-y: auto !important;');
    expect(container.querySelector('.ant-table')).toHaveStyle({ overflow: 'hidden' });
  });

  it('passes Table.Column children through to the underlying antd table', () => {
    render(
      <NeTable<UserRecord> rowKey="id" dataSource={users}>
        <Table.Column<UserRecord> title="姓名" dataIndex="name" key="name" />
        <Table.Column<UserRecord> title="邮箱" dataIndex="email" key="email" />
      </NeTable>,
    );

    expect(screen.getAllByText('姓名').length).toBeGreaterThan(0);
    expect(screen.getAllByText('邮箱').length).toBeGreaterThan(0);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('grace@example.com')).toBeInTheDocument();
  });

  it('loads data with request and reloads when search is submitted', async () => {
    const user = userEvent.setup();
    const request = vi.fn().mockResolvedValue({ data: [users[0]], total: 1 });

    render(
      <NeTable<UserRecord, { name?: string }> rowKey="id" request={request}>
        <NeTable.Search<{ name?: string }>>
          {({ form, submit }) => (
            <Form form={form} layout="inline" onFinish={submit}>
              <Form.Item name="name" label="姓名">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">查询</Button>
              </Form.Item>
            </Form>
          )}
        </NeTable.Search>
        <Table.Column<UserRecord> title="姓名" dataIndex="name" key="name" />
      </NeTable>,
    );

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(expect.objectContaining({ current: 1, pageSize: 10, query: {} }));
    });

    await user.type(screen.getByLabelText('姓名'), 'Ada');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ current: 1, pageSize: 10, query: { name: 'Ada' } }));
    });
  });

  it('deduplicates the initial request under React StrictMode', async () => {
    const request = vi.fn().mockResolvedValue({ data: [users[0]], total: 1 });

    render(
      <StrictMode>
        <NeTable<UserRecord> rowKey="id" request={request}>
          <Table.Column<UserRecord> title="姓名" dataIndex="name" key="name" />
        </NeTable>
      </StrictMode>,
    );

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('exposes reload and reset through actionRef', async () => {
    const actionRef = createRef<NeTableAction>();
    const request = vi.fn().mockResolvedValue({ data: [users[0]], total: 1 });

    render(
      <NeTable<UserRecord, { name?: string }>
        actionRef={actionRef}
        defaultQuery={{ name: 'Ada' }}
        rowKey="id"
        request={request}
      >
        <Table.Column<UserRecord> title="姓名" dataIndex="name" key="name" />
      </NeTable>,
    );

    await waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await actionRef.current?.reload();
    });

    expect(request).toHaveBeenCalledTimes(2);

    await act(async () => {
      await actionRef.current?.reset();
    });

    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ query: { name: 'Ada' }, current: 1 }));
  });

  it('allows the Pagination slot to render from table context', () => {
    render(
      <NeTable<UserRecord> rowKey="id" dataSource={users}>
        <Table.Column<UserRecord> title="姓名" dataIndex="name" key="name" />
        <NeTable.Pagination>
          {({ dataSource }) => <span>Custom pagination for {dataSource.length} users</span>}
        </NeTable.Pagination>
      </NeTable>,
    );

    expect(screen.getByText('Custom pagination for 2 users')).toBeInTheDocument();
  });
});
