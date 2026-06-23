import { Flex, Select, Tag, Typography, theme } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { PermissionDraftEffect, PermissionResourceType } from '@/types/permission';
import { createEffectOptions, createResourceKey } from './permission-page-shared';

export interface ResourceRowProps {
  resourceType: PermissionResourceType;
  resourceId: string;
  name: string;
  code: string;
  description?: string;
  effect: PermissionDraftEffect;
  indent?: boolean;
  onEffectChange: (key: string, effect: PermissionDraftEffect) => void;
}

export function ResourceRow({
  resourceType,
  resourceId,
  name,
  code,
  description,
  effect,
  indent = false,
  onEffectChange,
}: ResourceRowProps) {
  const { token } = theme.useToken();
  const { t } = useNebulaI18n();
  const key = createResourceKey(resourceType, resourceId);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '132px minmax(0, 1fr) 96px',
        gap: 12,
        alignItems: 'center',
        padding: indent ? '8px 12px 8px 42px' : '8px 12px',
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Select
        aria-label={`${name}${t('auth.permissionConfig.effects.ariaLabel')}`}
        value={effect}
        options={createEffectOptions(t)}
        onChange={(value) => onEffectChange(key, value)}
      />
      <Flex vertical style={{ minWidth: 0 }}>
        <Typography.Text strong>{name}</Typography.Text>
        <Typography.Text type="secondary" ellipsis>
          {description ?? code}
        </Typography.Text>
      </Flex>
      <Tag>{resourceType}</Tag>
    </div>
  );
}
