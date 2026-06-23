import { Button, Flex, Form, Table, theme as antdTheme } from 'antd';
import type { FilterValue, SorterResult, TableCurrentDataSource } from 'antd/es/table/interface';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Children, cloneElement, isValidElement, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import type {
  NeTablePaginationProps,
  NeTableProps,
  NeTableRequestResult,
  NeTableRenderContext,
  NeTableSearchProps,
  NeTableTableProps,
  NeTableToolbarProps,
} from './types';

interface NeTableSlots<RecordType extends object, Query extends object> {
  search?: ReactElement<NeTableSearchProps<Query>>;
  toolbar?: ReactElement<NeTableToolbarProps<RecordType>>;
  table?: ReactElement<NeTableTableProps<RecordType>>;
  pagination?: ReactElement<NeTablePaginationProps<RecordType>>;
  tableChildren: ReactNode[];
}

type NeTableSlotName = 'search' | 'toolbar' | 'table' | 'pagination';

interface NeTableSlotComponent {
  __NE_TABLE_SLOT?: NeTableSlotName;
}

const neTableLayoutCss = `
.ne-table-ant-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.ne-table-ant-wrapper > .ant-spin,
.ne-table-ant-wrapper > .ant-spin-nested-loading,
.ne-table-ant-wrapper .ant-spin-container {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.ne-table-ant-wrapper .ant-table {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.ne-table-ant-wrapper .ant-table-container,
.ne-table-ant-wrapper .ant-table-content,
.ne-table-ant-wrapper .ant-table-content > table {
  height: 100%;
}

.ne-table-ant-wrapper .ant-table-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ne-table-ant-wrapper .ant-table-header {
  flex-shrink: 0;
}

.ne-table-ant-wrapper .ant-table-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto !important;
}

.ne-table-ant-wrapper .ant-table-body > table {
  height: 100%;
}

.ne-table-ant-wrapper .ant-table-pagination {
  flex-shrink: 0;
  margin-top: auto;
  padding-inline: 20px;
}
`;

function NeTableSearch<Query extends object = Record<string, unknown>>({ children }: NeTableSearchProps<Query>) {
  return <>{children}</>;
}

function NeTableToolbar<RecordType extends object = object>({ children }: NeTableToolbarProps<RecordType>) {
  return <>{children}</>;
}

function NeTableTable<RecordType extends object = object>({ children }: NeTableTableProps<RecordType>) {
  return <>{children}</>;
}

function NeTablePagination<RecordType extends object = object>({ children }: NeTablePaginationProps<RecordType>) {
  return <>{children}</>;
}

Object.assign(NeTableSearch, { __NE_TABLE_SLOT: 'search' as const });
Object.assign(NeTableToolbar, { __NE_TABLE_SLOT: 'toolbar' as const });
Object.assign(NeTableTable, { __NE_TABLE_SLOT: 'table' as const });
Object.assign(NeTablePagination, { __NE_TABLE_SLOT: 'pagination' as const });

function isElementOfSlot<Props>(child: ReactNode, type: (props: Props) => ReactElement | null, slotName: NeTableSlotName): child is ReactElement<Props> {
  if (!isValidElement(child)) return false;
  if (child.type === type) return true;
  if (typeof child.type !== 'function') return false;

  return (child.type as NeTableSlotComponent).__NE_TABLE_SLOT === slotName;
}

function parseNeTableSlots<RecordType extends object, Query extends object>(children: ReactNode): NeTableSlots<RecordType, Query> {
  const slots: NeTableSlots<RecordType, Query> = { tableChildren: [] };

  Children.forEach(children, (child) => {
    if (isElementOfSlot<NeTableSearchProps<Query>>(child, NeTableSearch, 'search')) {
      slots.search = child;
      return;
    }

    if (isElementOfSlot<NeTableToolbarProps<RecordType>>(child, NeTableToolbar, 'toolbar')) {
      slots.toolbar = child;
      return;
    }

    if (isElementOfSlot<NeTableTableProps<RecordType>>(child, NeTableTable, 'table')) {
      slots.table = child;
      return;
    }

    if (isElementOfSlot<NeTablePaginationProps<RecordType>>(child, NeTablePagination, 'pagination')) {
      slots.pagination = child;
      return;
    }

    if (child !== null && child !== undefined) {
      slots.tableChildren.push(child);
    }
  });

  return slots;
}

function renderSlotChild<Context>(children: ReactNode | ((context: Context) => ReactNode), context: Context) {
  return typeof children === 'function' ? children(context) : children;
}

function normalizeSorterField(field: SorterResult<object>['field']) {
  if (Array.isArray(field)) return field.map((item) => String(item));
  if (field === undefined) return undefined;
  return String(field);
}

function normalizeSorterKey(columnKey: SorterResult<object>['columnKey']) {
  if (columnKey === undefined) return undefined;
  return String(columnKey);
}

function createRequestKey<Query extends object>(
  nextQuery: Partial<Query>,
  nextCurrent: number,
  nextPageSize: number,
  filters: Record<string, FilterValue | null>,
  sorter: SorterResult<object> | SorterResult<object>[],
) {
  const sorterItems = (Array.isArray(sorter) ? sorter : [sorter]).map((item) => ({
    field: normalizeSorterField(item.field),
    order: item.order,
    columnKey: normalizeSorterKey(item.columnKey),
  }));

  return JSON.stringify({
    current: nextCurrent,
    pageSize: nextPageSize,
    query: nextQuery,
    filters,
    sorter: sorterItems,
  });
}

interface SearchFormElementProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface NeTableSearchAreaProps<Query extends object> {
  searchSlot: ReactElement<NeTableSearchProps<Query>>;
  query: Partial<Query>;
  submitSearch: (values: Query) => void;
  reset: () => Promise<void>;
  reload: () => Promise<void>;
  registerResetFormFn: (fn: (() => void) | null) => void;
}

function NeTableSearchArea<Query extends object = Record<string, unknown>>({
  searchSlot,
  query,
  submitSearch,
  reset,
  reload,
  registerResetFormFn,
}: NeTableSearchAreaProps<Query>) {
  const { token } = antdTheme.useToken();
  const [form] = Form.useForm<Query>();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    registerResetFormFn(() => form.resetFields());
    return () => registerResetFormFn(null);
  }, [form, registerResetFormFn]);

  const searchContent = renderSlotChild(searchSlot.props.children, {
    form,
    query,
    submit: submitSearch,
    reset,
    reload,
  });

  const fieldStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))',
    gap: `${token.marginSM}px ${token.marginMD}px`,
    maxHeight: collapsed ? token.controlHeight : 220,
    overflow: 'hidden',
    transition: 'max-height 180ms ease',
    minWidth: 0,
  };

  const actionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    minHeight: token.controlHeight,
    paddingLeft: token.paddingSM,
    whiteSpace: 'nowrap',
  };

  const wrappedSearchContent = isValidElement<SearchFormElementProps>(searchContent)
    ? (() => {
        const formChildren = Children.toArray(searchContent.props.children);
        const actionChild = formChildren.length > 1 ? formChildren[formChildren.length - 1] : null;
        const fieldChildren = actionChild ? formChildren.slice(0, -1) : formChildren;

        return cloneElement<SearchFormElementProps>(
          searchContent,
          {
            className: [searchContent.props.className, 'ne-table-search-form'].filter(Boolean).join(' '),
            style: {
              ...searchContent.props.style,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: token.marginMD,
              alignItems: 'start',
              width: '100%',
            },
          },
          <div data-testid="ne-table-search-fields" style={fieldStyle}>{fieldChildren}</div>,
          actionChild ? <div style={actionStyle}>{actionChild}</div> : null,
        );
      })()
    : <div data-testid="ne-table-search-fields" style={fieldStyle}>{searchContent}</div>;

  return (
    <div
      aria-expanded={!collapsed}
      data-testid="ne-table-search"
      style={{
        padding: `${token.paddingMD}px ${token.paddingMD}px ${token.paddingSM}px`,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <Flex align="center" justify="space-between" gap={token.marginMD} wrap style={{ marginBottom: token.marginMD }}>
        <Flex align="center" gap={token.marginXS} style={{ fontWeight: token.fontWeightStrong }}>
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 16,
              borderRadius: 2,
              background: token.colorPrimary,
            }}
          />
          <span>搜索条件</span>
        </Flex>
        <Button type="link" onClick={() => setCollapsed((value) => !value)} style={{ paddingInline: token.paddingXS }}>
          {collapsed ? '展开' : '收起'}
        </Button>
      </Flex>
      {wrappedSearchContent}
    </div>
  );
}

function NeTableRoot<RecordType extends object, Query extends object = Record<string, unknown>>({
  actionRef,
  children,
  dataSource: controlledDataSource,
  defaultPageSize = 10,
  defaultQuery,
  headerTitle,
  loading: controlledLoading,
  pagination,
  request,
  toolBarRender,
  onChange,
  onRequestError,
  onReset,
  onSearch,
  ...tableProps
}: NeTableProps<RecordType, Query>) {
  const { token } = antdTheme.useToken();
  const resetFormFnRef = useRef<(() => void) | null>(null);
  const registerResetFormFn = useCallback((fn: (() => void) | null) => {
    resetFormFnRef.current = fn;
  }, []);
  const slots = useMemo(() => parseNeTableSlots<RecordType, Query>(children), [children]);
  const [query, setQuery] = useState<Partial<Query>>(defaultQuery ?? {});
  const [dataSource, setDataSource] = useState<RecordType[]>(controlledDataSource ?? []);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, FilterValue | null>>({});
  const [sorter, setSorter] = useState<SorterResult<RecordType> | SorterResult<RecordType>[]>([]);
  const manualFetchRef = useRef(false);
  const inFlightRequestRef = useRef<{
    key: string;
    promise: Promise<NeTableRequestResult<RecordType>>;
  } | null>(null);

  useEffect(() => {
    if (!request) {
      setDataSource(controlledDataSource ?? []);
    }
  }, [controlledDataSource, request]);

  const loadData = useCallback(
    async (nextQuery: Partial<Query>, nextCurrent: number, nextPageSize: number) => {
      if (!request) return;

      setLoading(true);
      try {
        const requestKey = createRequestKey(
          nextQuery,
          nextCurrent,
          nextPageSize,
          filters,
          sorter as SorterResult<object> | SorterResult<object>[],
        );
        const existingRequest = inFlightRequestRef.current;
        const promise = existingRequest?.key === requestKey
          ? existingRequest.promise
          : request({
              current: nextCurrent,
              pageSize: nextPageSize,
              query: nextQuery as Query,
              filters,
              sorter: sorter as SorterResult<object> | SorterResult<object>[],
            });

        if (promise !== existingRequest?.promise) {
          inFlightRequestRef.current = { key: requestKey, promise };
        }

        const result = await promise.finally(() => {
          if (inFlightRequestRef.current?.promise === promise) {
            inFlightRequestRef.current = null;
          }
        });
        setDataSource(result.data);
        setTotal(result.total ?? result.data.length);
      } catch (error) {
        onRequestError?.(error);
      } finally {
        setLoading(false);
      }
    },
    [filters, onRequestError, request, sorter],
  );

  const reload = useCallback(async () => {
    await loadData(query, current, pageSize);
  }, [current, loadData, pageSize, query]);

  const reset = useCallback(async () => {
    const nextQuery = (defaultQuery ?? {}) as Partial<Query>;
    resetFormFnRef.current?.();
    manualFetchRef.current = true;
    setQuery(nextQuery);
    setCurrent(1);
    onReset?.();
    await loadData(nextQuery, 1, pageSize);
  }, [defaultQuery, loadData, onReset, pageSize]);

  useImperativeHandle(actionRef, () => ({ reload, reset }), [reload, reset]);

  useEffect(() => {
    if (request) {
      if (manualFetchRef.current) {
        manualFetchRef.current = false;
        return;
      }
      void loadData(query, current, pageSize);
    }
  }, [current, loadData, pageSize, query, request]);

  const submitSearch = useCallback(
    (values: Query) => {
      setQuery(values);
      setCurrent(1);
      onSearch?.(values);
    },
    [onSearch],
  );

  const renderContext: NeTableRenderContext<RecordType> = {
    dataSource,
    loading: controlledLoading ?? loading,
    reload,
    reset,
  };

  const mergedPagination = pagination === false
    ? false
    : {
        current,
        pageSize,
        total: request ? total : pagination?.total,
        showSizeChanger: true,
        showTotal: (itemTotal: number) => `\u5171 ${itemTotal} \u6761`,
        ...pagination,
      };

  const handleTableChange: NonNullable<NeTableProps<RecordType, Query>['onChange']> = (nextPagination, nextFilters, nextSorter, extra: TableCurrentDataSource<RecordType>) => {
    setCurrent(nextPagination.current ?? 1);
    setPageSize(nextPagination.pageSize ?? defaultPageSize);
    setFilters(nextFilters);
    setSorter(nextSorter);
    onChange?.(nextPagination, nextFilters, nextSorter, extra);
  };

  const hasToolbar = Boolean(headerTitle || slots.toolbar || toolBarRender || request);
  const mergedScroll: NeTableProps<RecordType, Query>['scroll'] = {
    ...tableProps.scroll,
    y: tableProps.scroll?.y ?? '100%',
  };
  const rootStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: 0,
  };
  const panelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'hidden',
    padding: 0,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    boxShadow: token.boxShadowTertiary,
  };
  const tableNode = slots.table ? (
    renderSlotChild(slots.table.props.children, renderContext)
  ) : (
    <Table<RecordType>
      {...tableProps}
      dataSource={dataSource}
      loading={controlledLoading ?? loading}
      pagination={mergedPagination}
      scroll={mergedScroll}
      className={['ne-table-ant-wrapper', tableProps.className].filter(Boolean).join(' ')}
      style={{ ...tableProps.style, display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
      rootClassName="ne-table-ant-fill"
      onChange={handleTableChange}
    >
      {slots.tableChildren}
    </Table>
  );

  return (
    <Flex className="ne-table-root" vertical gap={token.marginMD} style={rootStyle}>
      <style>{neTableLayoutCss}</style>
      {slots.search ? (
        <NeTableSearchArea<Query>
          searchSlot={slots.search}
          query={query}
          submitSearch={submitSearch}
          reset={reset}
          reload={reload}
          registerResetFormFn={registerResetFormFn}
        />
      ) : null}

      <div data-testid="ne-table-table-block" style={panelStyle}>
        {hasToolbar ? (
          <Flex data-testid="ne-table-toolbar" align="center" justify="flex-start" gap={token.marginSM} wrap style={{ padding: token.paddingMD }}>
            {slots.toolbar ? renderSlotChild(slots.toolbar.props.children, renderContext) : null}
            {toolBarRender ? toolBarRender(renderContext) : null}
          </Flex>
        ) : null}

        {tableNode}

        {slots.pagination ? renderSlotChild(slots.pagination.props.children, renderContext) : null}
      </div>
    </Flex>
  );
}

type NeTableComponent = (<RecordType extends object, Query extends object = Record<string, unknown>>(
  props: NeTableProps<RecordType, Query>,
) => ReactElement) & {
  Search: typeof NeTableSearch;
  Toolbar: typeof NeTableToolbar;
  Table: typeof NeTableTable;
  Pagination: typeof NeTablePagination;
};

export const NeTable = NeTableRoot as NeTableComponent;

NeTable.Search = NeTableSearch;
NeTable.Toolbar = NeTableToolbar;
NeTable.Table = NeTableTable;
NeTable.Pagination = NeTablePagination;
