import type {
  PermissionDraftEffect,
  PermissionEffect,
  PermissionGrantResp,
  PermissionResourceGroup,
  PermissionSubject,
  SaveSubjectPermissionItem,
} from '@/types/permission';
import type { NebulaMessageKey } from '@/i18n/types';

export const SUBJECT_TABS = [
  { key: 'ORG', labelKey: 'auth.permissionConfig.tabs.org' },
  { key: 'ROLE', labelKey: 'auth.permissionConfig.tabs.role' },
  { key: 'USER', labelKey: 'auth.permissionConfig.tabs.user' },
] as const;

export function createEffectOptions(t: (key: NebulaMessageKey) => string): Array<{ label: string; value: PermissionDraftEffect }> {
  return [
    { label: t('auth.permissionConfig.effects.none'), value: 'none' },
    { label: t('auth.permissionConfig.effects.allow'), value: 'Allow' },
    { label: t('auth.permissionConfig.effects.deny'), value: 'Deny' },
  ];
}

export type ResourceEffectMap = Record<string, PermissionDraftEffect>;

export function createResourceKey(resourceType: string, resourceId: string) {
  return `${resourceType}:${resourceId}`;
}

export function createEffectMap(grants: PermissionGrantResp[]): ResourceEffectMap {
  return grants.reduce<ResourceEffectMap>((map, grant) => {
    map[createResourceKey(grant.resourceType, grant.resourceId)] = grant.effect;
    return map;
  }, {});
}

export function toSaveItems(effectMap: ResourceEffectMap): SaveSubjectPermissionItem[] {
  return Object.entries(effectMap)
    .filter(([, effect]) => effect !== 'none')
    .map(([key, effect]) => {
      const [resourceType, resourceId] = key.split(':');
      return {
        resourceType: resourceType as SaveSubjectPermissionItem['resourceType'],
        resourceId,
        effect: effect as PermissionEffect,
        scope: 'ALL',
      };
    });
}

export function filterSubjects(subjects: PermissionSubject[], keyword: string): PermissionSubject[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return subjects;

  return subjects.filter((subject) =>
    `${subject.name} ${subject.code} ${subject.description ?? ''}`.toLowerCase().includes(normalized),
  );
}

export function filterResourceGroups(groups: PermissionResourceGroup[], keyword: string): PermissionResourceGroup[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return groups;

  return groups
    .map((group) => ({
      ...group,
      menus: group.menus
        .map((menu) => ({
          ...menu,
          buttons: menu.buttons.filter((button) =>
            `${button.name} ${button.code} ${button.description ?? ''}`.toLowerCase().includes(normalized),
          ),
        }))
        .filter((menu) => {
          const menuMatches = `${menu.name} ${menu.code} ${menu.path ?? ''} ${menu.description ?? ''}`
            .toLowerCase()
            .includes(normalized);
          return menuMatches || menu.buttons.length > 0;
        }),
    }))
    .filter((group) => {
      const groupMatches = `${group.name} ${group.key} ${group.description ?? ''}`.toLowerCase().includes(normalized);
      return groupMatches || group.menus.length > 0;
    });
}
