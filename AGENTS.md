# Project Coding Guidelines

## React Hooks Organization

When adding or moving React hooks, keep hook placement intentional and consistent:

- Put shared, cross-page hooks in `src/hooks/`.
  - Examples: `useTheme`, `useLocale`, `useMediaQuery`, `useMounted`, `useDebounce`.
- Put feature-specific hooks next to the feature that owns them.
  - Example: `src/features/user/hooks/use-user-profile.ts` for user-profile-only logic.
- Do not place business-only hooks in the global hooks directory just because they are hooks.
- Theme switching and language switching are app-wide concerns, so their hooks should live in `src/hooks/`.
- If a hook is a small wrapper around a provider or context, keep the provider and hook paired by purpose:
  - Provider: `src/providers/theme-provider.tsx`
  - Hook: `src/hooks/use-theme.ts`
- Prefer kebab-case file names and camelCase hook exports:
  - File: `src/hooks/use-theme.ts`
  - Export: `useTheme`

Before creating a new hook, check whether a shared hook already exists in `src/hooks/` or a feature-level `hooks/` directory. Reuse or extend existing hooks when it preserves clear ownership.

### Hook Comments

Keep hook comments sparse and purposeful:

- Do not comment obvious React or store operations, such as simple selectors, setters, or returned fields.
- Add comments only when they explain a non-obvious boundary, compatibility decision, browser/runtime constraint, or business rule.
- Prefer clear names over comments. If a comment only repeats the function name or implementation, remove it.
- For compatibility re-exports, a short comment is acceptable only when consumers need migration context.

## Page and Business Resource Organization

Keep route pages, page-private components, and reusable business resources separated by ownership.

### Pages

- Put route pages under `src/pages/`.
- Page file paths map directly to hash routes:
  - `src/pages/dashboard.tsx` -> `host/#/dashboard`
  - `src/pages/auth/user/index.tsx` -> `host/#/auth/user`
- Prefer directory pages with `index.tsx` when a page has related private files.
  - Example: use `src/pages/auth/user/index.tsx` when the user page also has page-only components.
- Put page-private components under the owning page directory.
  - Example: `src/pages/auth/user/components/user-table.tsx`
- When a page-private component is an expected replacement boundary for downstream projects, keep it directly beside the page entry instead of burying it under `components/`.
  - Example: `src/pages/auth/role/index.tsx` and `src/pages/auth/role/role-form-modal.tsx`.
  - Use this for page-owned modals, forms, drawers, and panels that consumers may override wholesale while keeping the route page intact.
- Do not import private files from another page directory. If something is reused across pages, move it to a shared directory first.

### Components

Keep shared component directories focused on one reusable base component each.

- Put cross-page reusable components in `src/components/`.
- Use one directory per base component.
  - Example: `src/components/data-table/`
- Keep the component props and component-only related types in a separate file inside the component directory.
  - Example: `src/components/data-table/data-table.types.ts`
- If a type is reused globally or shared across business domains, define it in `src/types/` instead of the component directory.
- Add a `README.md` to every component directory. The README should explain:
  - What the component does and when to use it.
  - All supported props.
  - The purpose and behavior of each prop.
  - Usage examples that cover common scenarios.
- Add tests for every shared component. Cover the important usage scenarios, prop combinations, and edge cases so the documented behavior and actual behavior stay aligned.

### Business Resources

Place reusable business resources in directories that are siblings of `src/pages/`, not inside page directories:

```text
src/
├── pages/          # Route pages; paths map to hash routes
├── services/       # Business and page API requests
├── types/          # Shared business type definitions
├── enums/          # Shared business enums
├── constants/      # Shared business constants
├── components/     # Cross-page reusable components
├── hooks/          # Cross-page reusable hooks
└── utils/          # Shared utilities
```

- Put API request modules in `src/services/`, grouped by business domain.
  - Example: `src/services/user.ts`
- Put shared business types in `src/types/`.
  - Example: `src/types/user.ts`
- Put shared enums in `src/enums/`.
  - Example: `src/enums/user.ts`
- Put shared constants in `src/constants/`.
  - Example: `src/constants/user.ts`
- Keep page directories focused on rendering and page-specific composition. Cross-module API methods, enums, constants, and types belong in the shared sibling directories above.
