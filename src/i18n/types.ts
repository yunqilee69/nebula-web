/**
 * Internationalization resource type definitions.
 * 
 * - NebulaLocale: Supported language identifiers
 * - Nebula*Messages: Message shapes for each business domain
 * - NebulaMessages: Root message structure aggregating all domains
 * - NebulaMessageKey: Type-safe dot-notation paths (e.g., 'auth.roleManagement.title')
 */
export type NebulaLocale = 'zh-CN' | 'en-US';

export interface NebulaCommonMessages {
  languageZh: string;
  languageEn: string;
  empty: {
    noModules: string;
  };
  actions: {
    confirm: string;
    cancel: string;
  };
  pagination: {
    total: string;
  };
}

export interface NebulaTabContextMenuMessages {
  refresh: string;
  closeCurrent: string;
  closeLeft: string;
  closeRight: string;
  closeOthers: string;
  openInNewWindow: string;
  ariaLabel: string;
}

export interface NebulaHeaderUserMessages {
  anonymous: string;
  menuAriaLabel: string;
  profile: string;
  preferences: string;
  logout: string;
  preferencesTitle: string;
  themeLabel: string;
  languageLabel: string;
  light: string;
  dark: string;
  zhCN: string;
  enUS: string;
  save: string;
  cancel: string;
  profilePlaceholder: string;
}

export interface NebulaLayoutMessages {
  sidebarCollapse: string;
  sidebarExpand: string;
  breadcrumbAriaLabel: string;
  sidebarAriaLabel: string;
  tabContextMenu: NebulaTabContextMenuMessages;
  headerUser: NebulaHeaderUserMessages;
  tabRenameAriaLabel: string;
  tabReorderHandleAriaLabel: string;
}

export interface NebulaRoleManagementMessages {
  title: string;
  unconfiguredTitle: string;
  unconfiguredDescription: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    status: string;
    createTime: string;
    updateTime: string;
    actions: string;
  };
  fields: {
    name: string;
    code: string;
    status: string;
    permissionIds: string;
    description: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  placeholders: {
    name: string;
    code: string;
    status: string;
    formName: string;
    formCode: string;
    permissionIds: string;
    description: string;
  };
  validation: {
    nameRequired: string;
    nameLength: string;
    codeRequired: string;
    codeLength: string;
    statusRequired: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  feedback: {
    listLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
  };
  confirm: {
    deleteTitle: string;
  };
}

export interface NebulaMenuManagementMessages {
  title: string;
  unconfiguredTitle: string;
  unconfiguredDescription: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    manageButtons: string;
    createButton: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    type: string;
    path: string;
    sort: string;
    status: string;
    createTime: string;
    updateTime: string;
    actions: string;
  };
  fields: {
    parentId: string;
    rootMenu: string;
    name: string;
    code: string;
    type: string;
    path: string;
    icon: string;
    component: string;
    sort: string;
    status: string;
    hidden: string;
    externalUrl: string;
    visibleInBreadcrumb: string;
    visibleInTab: string;
    activeMenuPath: string;
    remark: string;
    buttonName: string;
    buttonCode: string;
    buttonType: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
    buttonTitle: string;
    createButtonTitle: string;
    editButtonTitle: string;
  };
  placeholders: {
    name: string;
    code: string;
    type: string;
    path: string;
    icon: string;
    component: string;
    status: string;
    parentId: string;
    externalUrl: string;
    remark: string;
    buttonName: string;
    buttonCode: string;
    buttonType: string;
  };
  validation: {
    nameRequired: string;
    nameLength: string;
    codeRequired: string;
    codeLength: string;
    pathRequired: string;
    externalUrlRequired: string;
    externalUrlFormat: string;
    typeRequired: string;
    statusRequired: string;
    buttonNameRequired: string;
    buttonCodeRequired: string;
  };
  types: {
    catalog: string;
    menu: string;
    iframe: string;
    external: string;
  };
  buttonTypes: {
    add: string;
    edit: string;
    delete: string;
    export: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  feedback: {
    listLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    buttonListLoadFailed: string;
    buttonDetailLoadFailed: string;
    buttonCreateSuccess: string;
    buttonUpdateSuccess: string;
    buttonDeleteSuccess: string;
  };
  confirm: {
    deleteTitle: string;
    buttonDeleteTitle: string;
  };
}

export interface NebulaUserManagementMessages {
  title: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    username: string;
    nickname: string;
    status: string;
    role: string;
    org: string;
    actions: string;
  };
  fields: {
    username: string;
    password: string;
    nickname: string;
    email: string;
    phone: string;
    roles: string;
    orgs: string;
    status: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  placeholders: {
    username: string;
    password: string;
    nickname: string;
    email: string;
    phone: string;
    roles: string;
    orgs: string;
    status: string;
  };
  validation: {
    usernameRequired: string;
    passwordRequired: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  feedback: {
    optionsLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    createFailed: string;
    updateFailed: string;
  };
  confirm: {
    deleteTitle: string;
  };
}

export interface NebulaOrgManagementMessages {
  title: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    type: string;
    status: string;
    actions: string;
  };
  fields: {
    name: string;
    code: string;
    parentId: string;
    type: string;
    status: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  placeholders: {
    name: string;
    code: string;
    parentId: string;
    type: string;
    status: string;
  };
  validation: {
    nameRequired: string;
    codeRequired: string;
    typeRequired: string;
  };
  types: {
    company: string;
    department: string;
    team: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  tree: {
    title: string;
    searchPlaceholder: string;
    rootCount: string;
  };
  feedback: {
    treeLoadFailed: string;
    listLoadFailed: string;
    refreshFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    createFailed: string;
    updateFailed: string;
    deleteFailed: string;
  };
}

export interface NebulaPermissionConfigMessages {
  title: string;
  subjectsTitle: string;
  resourcesTitle: string;
  tabs: {
    org: string;
    role: string;
    user: string;
  };
  search: {
    subjectAriaLabel: string;
    subjectPlaceholder: string;
    resourceAriaLabel: string;
    resourcePlaceholder: string;
  };
  orgListTitle: string;
  empty: {
    orgs: string;
    subjects: string;
    resources: string;
  };
  effects: {
    none: string;
    allow: string;
    deny: string;
    ariaLabel: string;
  };
  actions: {
    save: string;
    bulkNone: string;
    bulkAllow: string;
  };
  feedback: {
    loadFailed: string;
    saveSuccess: string;
  };
}

export interface NebulaProfileInfoMessages {
  title: string;
  sections: {
    basic: string;
    oauth2: string;
    loginRecords: string;
  };
  actions: {
    save: string;
    refresh: string;
    bind: string;
    unbind: string;
  };
  fields: {
    username: string;
    nickname: string;
    avatar: string;
    email: string;
    phone: string;
    status: string;
    createTime: string;
  };
  columns: {
    loginType: string;
    loginIp: string;
    userAgent: string;
    loginTime: string;
    success: string;
    failReason: string;
  };
  placeholders: {
    nickname: string;
    avatar: string;
    email: string;
    phone: string;
  };
  validation: {
    email: string;
    phone: string;
  };
  status: {
    enabled: string;
    disabled: string;
    bound: string;
    unbound: string;
    success: string;
    failed: string;
  };
  empty: {
    oauth2: string;
    loginRecords: string;
    notProvided: string;
  };
  confirm: {
    unbindTitle: string;
  };
  feedback: {
    profileLoadFailed: string;
    profileUpdateSuccess: string;
    profileUpdateFailed: string;
    oauth2LoadFailed: string;
    bindUnavailable: string;
    unbindSuccess: string;
    unbindFailed: string;
    loginRecordsLoadFailed: string;
  };
}

export interface NebulaButtonManagementMessages {
  title: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    status: string;
    createTime: string;
    updateTime: string;
    actions: string;
  };
  fields: {
    name: string;
    code: string;
    type: string;
    sort: string;
    status: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  placeholders: {
    name: string;
    code: string;
    type: string;
  };
  validation: {
    nameRequired: string;
    codeRequired: string;
  };
  buttonTypes: {
    add: string;
    edit: string;
    delete: string;
    export: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  tree: {
    title: string;
    searchPlaceholder: string;
    rootCount: string;
    emptyText: string;
  };
  feedback: {
    treeLoadFailed: string;
    listLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    deleteFailed: string;
  };
  confirm: {
    deleteTitle: string;
  };
}

export interface NebulaButtonPermissionMessages {
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  actions: {
    save: string;
    allowAll: string;
    denyAll: string;
    clearAll: string;
    allowAllMenu: string;
    denyAllMenu: string;
    clearAllMenu: string;
  };
  effects: {
    none: string;
    allow: string;
    deny: string;
  };
  feedback: {
    saveSuccess: string;
    saveFailed: string;
  };
}

export interface NebulaAuthMessages {
  roleManagement: NebulaRoleManagementMessages;
  menuManagement: NebulaMenuManagementMessages;
  userManagement: NebulaUserManagementMessages;
  orgManagement: NebulaOrgManagementMessages;
  permissionConfig: NebulaPermissionConfigMessages;
  profileInfo: NebulaProfileInfoMessages;
  buttonManagement: NebulaButtonManagementMessages;
  buttonPermission: NebulaButtonPermissionMessages;
  select: NebulaSelectMessages;
}

export interface NebulaSelectMessages {
  selectedSingle: string;
  selectedMultiple: string;
  allRoles: string;
  allOrgs: string;
}

export interface NebulaMessages {
  common: NebulaCommonMessages;
  layout: NebulaLayoutMessages;
  auth: NebulaAuthMessages;
}

/** Recursive type that generates all dot-notation paths to string leaves. */
type StringLeafPath<T> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Key
    : T[Key] extends object
      ? `${Key}.${StringLeafPath<T[Key]>}`
      : never;
}[keyof T & string];

export type NebulaMessageKey = StringLeafPath<NebulaMessages>;
