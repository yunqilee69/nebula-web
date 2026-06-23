import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NeTree } from './index';
import type { NeTreeNode } from './types';

const treeData: NeTreeNode[] = [
  {
    key: 'root',
    title: '全部组织',
    tag: '全部',
    children: [
      {
        key: 'rnd',
        title: '研发中心',
        children: [
          { key: 'platform', title: '平台工程组' },
          { key: 'product', title: '产品体验组' },
        ],
      },
      { key: 'ops', title: '业务运营部', disabled: true },
    ],
  },
];

describe('NeTree', () => {
  it('renders a reusable tree panel with title, extra content, and selected item', () => {
    render(
      <NeTree
        title="按组织过滤"
        dataSource={treeData}
        selectedKey="root"
        extra={<span>5 个节点</span>}
      />,
    );

    expect(screen.getByText('按组织过滤')).toBeInTheDocument();
    expect(screen.getByText('5 个节点')).toBeInTheDocument();
    expect(screen.getByText('全部组织')).toBeInTheDocument();
    expect(screen.getByText('研发中心')).toBeInTheDocument();
    expect(screen.getByText('平台工程组')).toBeInTheDocument();
    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /全部组织/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onSelect with the selected tree node', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<NeTree title="角色树" dataSource={treeData} onSelect={onSelect} />);

    await user.click(screen.getByText('研发中心'));

    expect(onSelect).toHaveBeenCalledWith('rnd', expect.objectContaining({ title: '研发中心' }));
  });

  it('filters nodes by keyword when searchable is enabled', async () => {
    const user = userEvent.setup();

    render(<NeTree title="按组织过滤" dataSource={treeData} searchable searchPlaceholder="搜索组织" />);

    await user.type(screen.getByPlaceholderText('搜索组织'), '平台');

    expect(screen.getByText('平台工程组')).toBeInTheDocument();
    expect(screen.queryByText('产品体验组')).not.toBeInTheDocument();
  });

  it('allows parent nodes to collapse and expand their children', async () => {
    const user = userEvent.setup();

    render(<NeTree title="按组织过滤" dataSource={treeData} />);

    expect(screen.getByText('产品体验组')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '折叠 研发中心' }));

    expect(screen.queryByText('产品体验组')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '展开 研发中心' }));

    expect(screen.getByText('产品体验组')).toBeInTheDocument();
  });
});
