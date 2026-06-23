import type { FormInstance, TableProps } from 'antd';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import type { ReactNode, Ref } from 'react';

export interface NeTableRequestParams<Query extends object> {
  current: number;
  pageSize: number;
  query: Query;
  filters: Record<string, FilterValue | null>;
  sorter: SorterResult<object> | SorterResult<object>[];
}

export interface NeTableRequestResult<RecordType extends object> {
  data: RecordType[];
  total?: number;
}

export interface NeTableAction {
  reload: () => Promise<void>;
  reset: () => Promise<void>;
}

export interface NeTableRenderContext<RecordType extends object> {
  dataSource: RecordType[];
  loading: boolean;
  reload: () => Promise<void>;
  reset: () => Promise<void>;
}

export interface NeTableSearchRenderContext<Query extends object> {
  form: FormInstance<Query>;
  query: Partial<Query>;
  submit: (values: Query) => void;
  reset: () => Promise<void>;
  reload: () => Promise<void>;
}

export interface NeTableSearchProps<Query extends object = Record<string, unknown>> {
  children: ReactNode | ((context: NeTableSearchRenderContext<Query>) => ReactNode);
}

export interface NeTableToolbarProps<RecordType extends object = object> {
  children: ReactNode | ((context: NeTableRenderContext<RecordType>) => ReactNode);
}

export interface NeTableTableProps<RecordType extends object = object> {
  children: ReactNode | ((context: NeTableRenderContext<RecordType>) => ReactNode);
}

export interface NeTablePaginationProps<RecordType extends object = object> {
  children: ReactNode | ((context: NeTableRenderContext<RecordType>) => ReactNode);
}

export interface NeTableProps<RecordType extends object, Query extends object = Record<string, unknown>>
  extends Omit<TableProps<RecordType>, 'dataSource' | 'loading' | 'onChange'> {
  actionRef?: Ref<NeTableAction>;
  dataSource?: RecordType[];
  defaultQuery?: Partial<Query>;
  defaultPageSize?: number;
  headerTitle?: ReactNode;
  loading?: boolean;
  request?: (params: NeTableRequestParams<Query>) => Promise<NeTableRequestResult<RecordType>>;
  toolBarRender?: (context: NeTableRenderContext<RecordType>) => ReactNode;
  onRequestError?: (error: unknown) => void;
  onSearch?: (query: Query) => void;
  onReset?: () => void;
  onChange?: TableProps<RecordType>['onChange'];
}
