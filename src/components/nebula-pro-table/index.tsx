import { ProTable } from '@ant-design/pro-components';
import type { ProTableProps } from '@ant-design/pro-components';
import type { SortOrder } from 'antd/es/table/interface';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { buildNebulaTableRequestParams, NEBULA_TABLE_DEFAULT_PAGE_SIZE } from './params';
import type { NebulaPageReq, NebulaPageResp, ProTableRawParams } from './params';
import './layout.css';
import './toolbar.css';

const NEBULA_TABLE_INITIAL_SCROLL_Y = '100%';
const NEBULA_TABLE_MIN_BODY_HEIGHT = 120;

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function getStyleSize(value: string) {
  const size = Number.parseFloat(value);
  return Number.isFinite(size) ? size : 0;
}

function getBlockSize(element: Element | null) {
  if (!(element instanceof HTMLElement)) return 0;

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.height + getStyleSize(style.marginTop) + getStyleSize(style.marginBottom);
}

function getBoundedBottom(wrapper: HTMLElement) {
  let bottom = window.innerHeight;
  let element: HTMLElement | null = wrapper;

  while (element) {
    const rect = element.getBoundingClientRect();
    if (rect.height > 0) {
      bottom = Math.min(bottom, rect.bottom);
    }
    element = element.parentElement;
  }

  return bottom;
}

const DEFAULT_TABLE_OPTIONS: ProTableProps<Record<string, any>, Record<string, any>, any>['options'] = {
  density: true,
  fullScreen: true,
  reload: true,
  setting: true,
};

export type NebulaProTableRequest<RecordType, Query extends object> = (
  params: Query & NebulaPageReq,
) => Promise<NebulaPageResp<RecordType>>;

export interface NebulaProTableProps<
  RecordType extends Record<string, any>,
  Query extends object = Record<string, any>,
  ValueType = 'text',
> extends Omit<ProTableProps<RecordType, Query & Record<string, any>, ValueType>, 'request' | 'toolbar'> {
  request?: NebulaProTableRequest<RecordType, Query>;
  toolbar?: ProTableProps<RecordType, Query & Record<string, any>, ValueType>['toolbar'] | false;
}

export function NebulaProTable<
  RecordType extends Record<string, any>,
  Query extends object = Record<string, any>,
  ValueType = 'text',
>({ request, pagination, className, toolbar, toolBarRender, options, scroll, ...props }: NebulaProTableProps<RecordType, Query, ValueType>): ReactElement {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tableBodyHeight, setTableBodyHeight] = useState<number>();

  const wrappedRequest: ProTableProps<RecordType, Query & Record<string, any>, ValueType>['request'] = request
    ? async (params, sort) => {
        const page = await request(
          buildNebulaTableRequestParams<Query>(
            params as ProTableRawParams<Query>,
            sort as Record<string, SortOrder>,
          ),
        );

        return {
          data: page.data,
          total: page.total,
          success: true,
        };
      }
    : undefined;

  const mergedPagination = pagination === false
    ? false
    : {
        defaultPageSize: NEBULA_TABLE_DEFAULT_PAGE_SIZE,
        showSizeChanger: true,
        ...pagination,
      };

  const mergedClassName = `nebula-pro-table-toolbar${className ? ` ${className}` : ''}`;
  const hideToolbar = toolbar === false;
  const mergedOptions = hideToolbar ? false : (options ?? DEFAULT_TABLE_OPTIONS);
  const mergedToolBarRender = hideToolbar ? false : toolBarRender;
  const mergedToolbar = hideToolbar ? undefined : toolbar;

  const updateTableBodyHeight = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const tableBody = wrapper.querySelector<HTMLElement>('.ant-table-body');
    const tableContainer = wrapper.querySelector<HTMLElement>('.ant-table-container');
    const bodyTop = tableBody?.getBoundingClientRect().top ?? tableContainer?.getBoundingClientRect().top;
    if (bodyTop === undefined) return;

    const paginationHeight = getBlockSize(wrapper.querySelector('.ant-table-pagination'));
    const availableHeight = Math.floor(getBoundedBottom(wrapper) - bodyTop - paginationHeight);
    if (availableHeight <= 0) return;

    const nextHeight = Math.max(NEBULA_TABLE_MIN_BODY_HEIGHT, availableHeight);
    setTableBodyHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
  }, []);

  useBrowserLayoutEffect(() => {
    const animationFrame = window.requestAnimationFrame(updateTableBodyHeight);
    return () => window.cancelAnimationFrame(animationFrame);
  });

  useBrowserLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    updateTableBodyHeight();
    window.addEventListener('resize', updateTableBodyHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateTableBodyHeight);
    }

    const resizeObserver = new ResizeObserver(updateTableBodyHeight);
    resizeObserver.observe(wrapper);
    const proTable = wrapper.querySelector('.ant-pro-table');
    if (proTable) resizeObserver.observe(proTable);
    const tableWrapper = wrapper.querySelector('.ant-table-wrapper');
    if (tableWrapper) resizeObserver.observe(tableWrapper);

    return () => {
      window.removeEventListener('resize', updateTableBodyHeight);
      resizeObserver.disconnect();
    };
  }, [updateTableBodyHeight]);

  const mergedScroll = useMemo(
    () => ({ ...scroll, y: tableBodyHeight ?? NEBULA_TABLE_INITIAL_SCROLL_Y }),
    [scroll, tableBodyHeight],
  );

  return (
    <div ref={wrapperRef} className="nebula-pro-table-wrapper">
      <ProTable<RecordType, Query & Record<string, any>, ValueType>
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        options={mergedOptions}
        pagination={mergedPagination}
        scroll={mergedScroll}
        {...props}
        className={mergedClassName}
        request={wrappedRequest}
        toolbar={mergedToolbar}
        toolBarRender={mergedToolBarRender}
      />
    </div>
  );
}

export type { ActionType as NebulaProTableAction, ProColumns as NebulaProColumns } from '@ant-design/pro-components';
export type { NebulaPageReq, NebulaPageResp } from './params';
