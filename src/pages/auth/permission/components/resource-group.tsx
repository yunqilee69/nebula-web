import { Collapse, Typography } from 'antd';
import type { PermissionDraftEffect, PermissionResourceGroup as PermissionResourceGroupType } from '@/types/permission';
import { createResourceKey } from './permission-page-shared';
import { ResourceRow } from './resource-row';

export interface ResourceGroupProps {
  group: PermissionResourceGroupType;
  effectMap: Record<string, PermissionDraftEffect>;
  onEffectChange: (key: string, effect: PermissionDraftEffect) => void;
}

export function ResourceGroup({ group, effectMap, onEffectChange }: ResourceGroupProps) {
  return (
    <Collapse
      defaultActiveKey={[group.key]}
      items={[
        {
          key: group.key,
          label: (
            <div>
              <Typography.Text strong>{group.name}</Typography.Text>
              {group.description ? <Typography.Text type="secondary"> · {group.description}</Typography.Text> : null}
            </div>
          ),
          children: group.menus.map((menu) => (
            <Collapse
              key={menu.id}
              defaultActiveKey={[menu.id]}
              items={[
                {
                  key: menu.id,
                  label: menu.name,
                  children: (
                    <>
                      <ResourceRow
                        resourceType="MENU"
                        resourceId={menu.id}
                        name={menu.name}
                        code={menu.code}
                        description={menu.path ?? menu.description}
                        effect={effectMap[createResourceKey('MENU', menu.id)] ?? 'none'}
                        onEffectChange={onEffectChange}
                      />
                      {menu.buttons.map((button) => (
                        <ResourceRow
                          key={button.id}
                          resourceType="BUTTON"
                          resourceId={button.id}
                          name={button.name}
                          code={button.code}
                          description={button.description}
                          effect={effectMap[createResourceKey('BUTTON', button.id)] ?? 'none'}
                          indent
                          onEffectChange={onEffectChange}
                        />
                      ))}
                    </>
                  ),
                },
              ]}
            />
          )),
        },
      ]}
    />
  );
}
