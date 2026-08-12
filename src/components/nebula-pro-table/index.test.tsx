import { Button } from 'antd';
import { act, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProTable } from '.';
import type { NebulaProColumns } from '.';

interface DemoRecord {
  id: string;
  name: string;
}

const columns: NebulaProColumns<DemoRecord>[] = [
  { title: 'Name', dataIndex: 'name' },
];

class TestResizeObserver implements ResizeObserver {
  static instances: TestResizeObserver[] = [];

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }

  observe() {}

  unobserve() {}

  disconnect() {}

  trigger() {
    this.callback([], this);
  }
}

function setRect(element: Element | null, top: number, height: number) {
  if (!element) return;

  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: top + height,
      height,
      left: 0,
      right: 100,
      toJSON: () => ({}),
      top,
      width: 100,
      x: 0,
      y: top,
    }),
  });
}

function renderTable(props: Partial<React.ComponentProps<typeof NebulaProTable<DemoRecord>>> = {}) {
  return render(
    <NebulaProTable<DemoRecord>
      columns={columns}
      dataSource={[{ id: '1', name: 'Alpha' }]}
      pagination={false}
      search={false}
      {...props}
    />,
  );
}

beforeEach(() => {
  TestResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NebulaProTable layout', () => {
  it('wraps ProTable in a scoped flex container', () => {
    const { container } = renderTable();

    const wrapper = container.querySelector('.nebula-pro-table-wrapper');
    const proTable = wrapper?.querySelector('.nebula-pro-table-toolbar');

    expect(wrapper).toBeInTheDocument();
    expect(proTable).toBeInTheDocument();
  });

  it('keeps layout CSS scoped to NebulaProTable wrapper', () => {
    const layoutCss = readFileSync(`${process.cwd()}/src/components/nebula-pro-table/layout.css`, 'utf8');

    expect(layoutCss).toContain('.nebula-pro-table-wrapper');
    expect(layoutCss).toMatch(/\.nebula-pro-table-wrapper \{[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;/s);
    expect(layoutCss).toMatch(/\.nebula-pro-table-wrapper \.ant-pro-table-search \{[^}]*flex:\s*0 0 auto;/s);
    expect(layoutCss).toContain('.nebula-pro-table-wrapper .ant-pro-table > .ant-pro-card:not(.ant-pro-table-search)');
    expect(layoutCss).toMatch(/\.ant-table-container \{[^}]*flex:\s*1 1 auto;/s);
    expect(layoutCss).toMatch(/\.nebula-pro-table-wrapper \.ant-table-body \{[^}]*overflow-y:\s*auto;/s);
    expect(layoutCss).not.toMatch(/^\.ant-table-body/m);
  });

  it('measures vertical table scrolling while preserving consumer horizontal scroll', async () => {
    const { container } = renderTable({
      toolbar: false,
      scroll: { x: 640, y: 120 },
    });

    const wrapper = container.querySelector('.nebula-pro-table-wrapper');
    const tableBody = container.querySelector<HTMLElement>('.ant-table-body');
    const pagination = container.querySelector('.ant-table-pagination');

    setRect(wrapper, 120, 580);
    setRect(tableBody, 220, 300);
    setRect(pagination, 650, 48);

    act(() => {
      for (const observer of TestResizeObserver.instances) {
        observer.trigger();
      }
    });

    expect(tableBody).toBeInTheDocument();
    await waitFor(() => {
      expect(tableBody).toHaveStyle({ maxHeight: '480px' });
    });
    expect(tableBody).toHaveStyle({ overflowX: 'auto' });
  });
});

describe('NebulaProTable toolbar', () => {
  it('keeps built-in toolbar actions on the right when there are no custom buttons', () => {
    const toolbarCss = readFileSync(`${process.cwd()}/src/components/nebula-pro-table/toolbar.css`, 'utf8');

    expect(toolbarCss).toMatch(/\.nebula-pro-table-toolbar \.ant-pro-table-list-toolbar-right \{[^}]*justify-content:\s*flex-end;/s);
  });

  it('keeps custom toolbar buttons on the left while built-in actions stay available', () => {
    const toolbarCss = readFileSync(`${process.cwd()}/src/components/nebula-pro-table/toolbar.css`, 'utf8');
    const { container } = renderTable({
      toolBarRender: () => [<Button key="create">Create</Button>],
    });

    const customActions = container.querySelector<HTMLElement>(
      '.nebula-pro-table-toolbar .ant-pro-table-list-toolbar-right > div:not(.ant-pro-table-list-toolbar-setting-items)',
    );
    const builtInActions = container.querySelector<HTMLElement>(
      '.nebula-pro-table-toolbar .ant-pro-table-list-toolbar-setting-items',
    );

    expect(customActions).toHaveTextContent('Create');
    expect(toolbarCss).toContain(
      '.nebula-pro-table-toolbar .ant-pro-table-list-toolbar-right > div:not(.ant-pro-table-list-toolbar-setting-items):first-child',
    );
    expect(toolbarCss).toMatch(/> div:not\(\.ant-pro-table-list-toolbar-setting-items\):first-child \{[^}]*justify-content:\s*flex-start;/s);
    expect(builtInActions).toBeInTheDocument();
  });

  it('hides the whole toolbar when toolbar is false', () => {
    const { container } = renderTable({ toolbar: false });

    expect(container.querySelector('.ant-pro-table-list-toolbar')).not.toBeInTheDocument();
  });
});
