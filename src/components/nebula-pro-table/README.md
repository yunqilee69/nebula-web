# NebulaProTable

`NebulaProTable` is the Nebula adapter around Ant Design ProComponents `ProTable`.

Use it for backend paginated Nebula pages. Its `request` receives Nebula backend pagination fields:

- `pageNum`
- `pageSize`
- `orderName`
- `orderType`

The adapter maps ProTable `current`, `pageSize`, search params, and sorter into that backend shape, then maps Nebula `PageResp<T> { data, total }` back into ProTable `{ data, total, success }`.

```tsx
<NebulaProTable<UserResp, UserQuery>
  columns={columns}
  request={(params) => userService.pageUsers(params)}
/>
```
