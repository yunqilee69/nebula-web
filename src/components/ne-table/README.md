# NeTable

NeTable is a declarative, composable data table built on top of Ant Design's `Table`. It supports remote data fetching, slot-based composition for search/toolbar/pagination, and imperative control through `actionRef`.

## When to Use

Use NeTable when you need a table that:

- Fetches data from a remote API with pagination, filtering, and sorting
- Needs an optional search form that is opt-in (no search renders by default)
- Requires toolbar actions above the table (e.g., "Add", "Export")
- Should expose imperative reload/reset via a ref
- Should fill its parent container, leaving the space after the search block for the table area

If you just need a plain static table with no remote fetching or slots, use Ant Design's `Table` directly.

NeTable does not add page-level padding by default. Wrap full-page tables in `PageContainer` or another owning layout container when outer spacing is required.

## Usage Standards

Follow these standards when using NeTable for business list pages:

1. **Provide at least one search condition.** Business list pages should include a `<NeTable.Search>` slot with at least one meaningful filter so users can narrow large datasets. If a table truly has no searchable field and no remote filtering requirement, use Ant Design's `Table` directly instead of NeTable.

2. **Keep the action column fixed as the final right-side column.** Operation columns such as edit, delete, and detail actions must be the last column and should use `fixed="right"` with an explicit `width`. Also set `scroll={{ x: ... }}` on NeTable when the table has enough columns to overflow horizontally. This keeps row actions visible without requiring users to scroll to the far right.

3. **Add sorting only to necessary fields, and map sort fields explicitly.** Enable `sorter` only for columns that the backend supports. Backend sort fields are usually snake_case while frontend fields are usually camelCase, so do not blindly forward `dataIndex`; map the selected column key to the backend field name, such as `createTime -> create_time`. Only one field may be sorted at a time. Avoid Ant Design multi-column sorting (`sorter.multiple`) for NeTable request-driven tables, and normalize `params.sorter` to a single active sorter before sending the request.

4. **Enable row multi-select only when batch operations exist.** Do not add `rowSelection` just because the table supports it. Multi-select should be enabled only when the toolbar or page provides a real batch action, such as batch delete, batch enable/disable, or batch export.

## Supported Props

NeTable accepts the standard Ant Design `TableProps` for table rendering, including `columns`, `rowKey`, `pagination`, `rowSelection`, `scroll`, `size`, `bordered`, and table children such as `Table.Column`. NeTable wraps `dataSource`, `loading`, and `onChange` so it can support both controlled static data and request-driven data.

### `columns`

- **Type:** `TableProps<RecordType>['columns']`
- **Default:** `undefined`
- **Behavior:** Defines the default Ant Design table columns when `Table.Column` children are not used.

### `rowKey`

- **Type:** `TableProps<RecordType>['rowKey']`
- **Default:** Ant Design `Table` default
- **Behavior:** Identifies each row. Use a stable key such as `"id"` for request-driven tables.

### `pagination`

- **Type:** `TableProps<RecordType>['pagination']`
- **Default:** Ant Design pagination with NeTable-managed `current`, `pageSize`, and `total`
- **Behavior:** Configures pagination. Set `pagination={false}` to hide it. In request mode, NeTable owns `current`, `pageSize`, and `total` while preserving other pagination options.

### `children`

- **Type:** `ReactNode`
- **Default:** `undefined`
- **Behavior:** Supports NeTable slots and Ant Design table children. `NeTable.Search`, `NeTable.Toolbar`, `NeTable.Table`, and `NeTable.Pagination` are consumed as slots; all other children are passed to the underlying `Table`.

### `actionRef`

- **Type:** `Ref<NeTableAction>`
- **Default:** `undefined`
- **Behavior:** Attaches a ref that exposes `reload()` and `reset()` methods for imperative control.

### `dataSource`

- **Type:** `RecordType[]`
- **Default:** `[]`
- **Behavior:** Provides data directly. Ignored when `request` is set.

### `defaultQuery`

- **Type:** `Partial<Query>`
- **Default:** `{}`
- **Behavior:** Sets the initial query parameters passed to `request`.

### `defaultPageSize`

- **Type:** `number`
- **Default:** `10`
- **Behavior:** Sets the initial page size for pagination.

### `headerTitle`

- **Type:** `ReactNode`
- **Default:** `undefined`
- **Behavior:** Renders a title on the left side of the toolbar area.

### `loading`

- **Type:** `boolean`
- **Default:** `undefined`
- **Behavior:** Overrides the internal loading state when provided. Useful for externally controlled loading.

### `request`

- **Type:** `(params: NeTableRequestParams<Query>) => Promise<NeTableRequestResult<RecordType>>`
- **Default:** `undefined`
- **Behavior:** When provided, NeTable calls this function to fetch data. It manages pagination, loading, and data state internally. Also enables a reload button in the toolbar.

### `toolBarRender`

- **Type:** `(context: NeTableRenderContext<RecordType>) => ReactNode`
- **Default:** `undefined`
- **Behavior:** Renders custom content in the left-aligned toolbar area. Receives the current render context.

### `onRequestError`

- **Type:** `(error: unknown) => void`
- **Default:** `undefined`
- **Behavior:** Called when `request` throws an error.

### `onSearch`

- **Type:** `(query: Query) => void`
- **Default:** `undefined`
- **Behavior:** Called when the search form is submitted with the query values.

### `onReset`

- **Type:** `() => void`
- **Default:** `undefined`
- **Behavior:** Called when the table is reset (via `actionRef.reset()`).

### `onChange`

- **Type:** `TableProps['onChange']`
- **Default:** `undefined`
- **Behavior:** Called when pagination, filters, or sorter change. NeTable handles its own state updates before calling this callback.

## Slots

NeTable uses a slot-based composition pattern. Pass slot components as children:

### `NeTable.Search`

Renders a search block above the table. **By default, no search area is rendered.** Search only appears when you explicitly include `<NeTable.Search>`. The block includes a "搜索条件" heading and a built-in expand/collapse toggle. Expanded mode shows all search fields; collapsed mode clips the field area to one row while keeping the final top-level form item visible as the action area.

For inline Ant Design forms, put search and reset buttons in the last top-level `Form.Item` so they remain visible on the right when the search block is collapsed.

`children` can be a ReactNode or a render function receiving `NeTableSearchRenderContext`:

- `form` — Ant Design `FormInstance` for the search form
- `query` — Current query values
- `submit(values)` — Submits the search with the given values
- `reset()` — Resets the search form and table query
- `reload()` — Reloads current data

### `NeTable.Toolbar`

Renders left-aligned content in the table block toolbar above the table. `children` can be a ReactNode or a render function receiving `NeTableRenderContext`.

### `NeTable.Table`

Replaces the default Ant Design table with custom content. `children` can be a ReactNode or a render function receiving `NeTableRenderContext`. When omitted, NeTable renders its own `Table` with any non-slot children passed as table columns.

### `NeTable.Pagination`

Replaces the default pagination with custom content. `children` can be a ReactNode or a render function receiving `NeTableRenderContext`.

## Usage Examples

### Basic table with static data, no search

```tsx
import { NeTable } from 'nebula-web';

const data = [
  { id: '1', name: 'Ada' },
  { id: '2', name: 'Grace' },
];

<NeTable rowKey="id" dataSource={data} columns={[{ title: 'Name', dataIndex: 'name' }]} />
```

### Search slot

```tsx
import { NeTable } from 'nebula-web';
import { Button, Form, Input, Table } from 'antd';

<NeTable<UserRecord, { name?: string }> rowKey="id" request={fetchUsers}>
  <NeTable.Search<{ name?: string }>>
    {({ form, submit }) => (
      <Form form={form} layout="inline" onFinish={submit}>
        <Form.Item name="name" label="Name">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Search</Button>
        </Form.Item>
      </Form>
    )}
  </NeTable.Search>
  <Table.Column<UserRecord> title="Name" dataIndex="name" key="name" />
</NeTable>
```

### Toolbar slot

```tsx
import { NeTable } from 'nebula-web';
import { Button, Table } from 'antd';

<NeTable<UserRecord> rowKey="id" dataSource={data}>
  <NeTable.Toolbar>
    <Button type="primary">Add User</Button>
  </NeTable.Toolbar>
  <Table.Column<UserRecord> title="Name" dataIndex="name" key="name" />
</NeTable>
```

### Table.Column children

Non-slot children are passed through to the underlying Ant Design `Table`:

```tsx
import { NeTable } from 'nebula-web';
import { Table } from 'antd';

<NeTable<UserRecord> rowKey="id" dataSource={data}>
  <Table.Column<UserRecord> title="Name" dataIndex="name" key="name" />
  <Table.Column<UserRecord> title="Email" dataIndex="email" key="email" />
</NeTable>
```

### Remote data with request and actionRef

```tsx
import { NeTable } from 'nebula-web';
import { Table } from 'antd';
import { createRef } from 'react';
import type { NeTableAction } from 'nebula-web';

const actionRef = createRef<NeTableAction>();

<NeTable<UserRecord>
  actionRef={actionRef}
  rowKey="id"
  request={async ({ current, pageSize, query }) => {
    const res = await api.getUsers({ page: current, size: pageSize, ...query });
    return { data: res.list, total: res.total };
  }}
>
  <Table.Column<UserRecord> title="Name" dataIndex="name" key="name" />
</NeTable>

// Imperative control:
await actionRef.current?.reload(); // re-fetch current page
await actionRef.current?.reset();  // reset query to defaultQuery and re-fetch page 1
```
