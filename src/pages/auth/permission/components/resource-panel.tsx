import { Button, Card, Empty, Flex, Input } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { PermissionDraftEffect, PermissionResourceGroup as PermissionResourceGroupType } from '@/types/permission';
import { filterResourceGroups, type ResourceEffectMap } from './permission-page-shared';
import { ResourceGroup } from './resource-group';

export interface ResourcePanelProps {
  keyword: string;
  groups: PermissionResourceGroupType[];
  effectMap: ResourceEffectMap;
  saving?: boolean;
  onKeywordChange: (keyword: string) => void;
  onEffectChange: (key: string, effect: PermissionDraftEffect) => void;
  onBulkEffectChange: (effect: PermissionDraftEffect) => void;
  onSave: () => void;
}

export function ResourcePanel({
  keyword,
  groups,
  effectMap,
  saving = false,
  onKeywordChange,
  onEffectChange,
  onBulkEffectChange,
  onSave,
}: ResourcePanelProps) {
  const { t } = useNebulaI18n();
  const filteredGroups = filterResourceGroups(groups, keyword);

  return (
    <Card
      title={t('auth.permissionConfig.resourcesTitle')}
      extra={<Button type="primary" loading={saving} onClick={onSave}>{t('auth.permissionConfig.actions.save')}</Button>}
      styles={{ body: { padding: 14 } }}
    >
      <Flex wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
        <Input.Search
          aria-label={t('auth.permissionConfig.search.resourceAriaLabel')}
          placeholder={t('auth.permissionConfig.search.resourcePlaceholder')}
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          style={{ width: 320 }}
        />
        <Button disabled={saving} onClick={() => onBulkEffectChange('none')}>{t('auth.permissionConfig.actions.bulkNone')}</Button>
        <Button disabled={saving} onClick={() => onBulkEffectChange('Allow')}>{t('auth.permissionConfig.actions.bulkAllow')}</Button>
      </Flex>
      {filteredGroups.length === 0 ? (
        <Empty description={t('auth.permissionConfig.empty.resources')} />
      ) : (
        <Flex vertical gap={12} style={{ width: '100%' }}>
          {filteredGroups.map((group) => (
            <ResourceGroup
              key={group.key}
              group={group}
              effectMap={effectMap}
              onEffectChange={onEffectChange}
            />
          ))}
        </Flex>
      )}
    </Card>
  );
}
