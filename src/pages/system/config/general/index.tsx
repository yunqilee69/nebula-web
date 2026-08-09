import { LoadingOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Spin,
  Switch,
  Tabs,
  Typography,
} from 'antd';
import type { TabsProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DictSelect } from '@/components/dict-select';
import { useNotice } from '@/hooks/use-notice';
import { paramService } from '@/services/param';
import { DataType, type DataType as ParamDataType } from '@/types/param';
import type { GeneralConfigDTO } from '@/types/param';
import { TAB_CONFIGS, valueToString } from './advance-config-data';
import type { AdvanceParamItem, AdvanceTab, ParamGroup } from './advance-config-data';

const { Text } = Typography;

/* ------------------------------------------------------------------ */
/*  Helper: build tab structure from backend DTO                       */
/* ------------------------------------------------------------------ */

function buildTabs(dto: GeneralConfigDTO): AdvanceTab[] {
  return TAB_CONFIGS.map((tab) => ({
    tabName: tab.tabName,
    groups: tab.groups.map((group) => ({
      groupName: group.groupName,
      params: group.fields.map((f) => ({
        paramKey: f.paramKey,
        paramName: f.paramName,
        description: f.description,
        paramValue: valueToString(dto[f.field]),
        dataType: f.dataType,
        optionCode: f.optionCode,
      })),
    })),
  }));
}

/** DTO 字符串值转对应类型 */
function parseValue(value: string, dataType: ParamDataType): boolean | number | string {
  if (dataType === DataType.BOOLEAN) return value === 'true' || value === '1';
  if (dataType === DataType.INT) {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  if (dataType === DataType.DOUBLE) {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return value;
}

/* ------------------------------------------------------------------ */
/*  Type-based inline editor                                           */
/* ------------------------------------------------------------------ */

interface ParamValueEditorProps {
  readonly dataType: ParamDataType;
  readonly optionCode?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function ParamValueEditor({ dataType, optionCode, value, onChange }: ParamValueEditorProps) {
  switch (dataType) {
    case DataType.BOOLEAN: {
      const checked = value === 'true' || value === '1';
      return (
        <Switch
          checked={checked}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          onChange={(next) => onChange(String(next))}
        />
      );
    }
    case DataType.INT:
    case DataType.DOUBLE: {
      const numValue = dataType === DataType.INT ? parseInt(value, 10) || 0 : parseFloat(value) || 0;
      return (
        <InputNumber<number>
          precision={dataType === DataType.INT ? 0 : undefined}
          min={0}
          style={{ width: 200 }}
          value={numValue}
          onChange={(next) => onChange(next != null ? String(next) : '0')}
        />
      );
    }
    case DataType.SINGLE:
      return (
        <DictSelect
          dictCode={optionCode ?? ''}
          allowClear
          style={{ width: 280 }}
          value={value || undefined}
          onChange={(next) => onChange(typeof next === 'string' ? next : '')}
        />
      );
    case DataType.MULTIPLE:
      return (
        <DictSelect
          dictCode={optionCode ?? ''}
          mode="multiple"
          allowClear
          style={{ width: 280 }}
          value={value ? JSON.parse(value) : []}
          onChange={(next) => onChange(Array.isArray(next) ? JSON.stringify(next) : '')}
        />
      );
    case DataType.STRING:
    default:
      return (
        <Input
          style={{ width: 280 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Single parameter row                                               */
/* ------------------------------------------------------------------ */

interface ParamRowProps {
  readonly param: AdvanceParamItem;
  readonly dirtyValue: string | undefined;
  readonly onValueChange: (value: string) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
}

function ParamRow({ param, dirtyValue, onValueChange, onSave, saving }: ParamRowProps) {
  const currentValue = dirtyValue ?? param.paramValue;
  const isDirty = dirtyValue !== undefined;

  return (
    <div className="flex items-start gap-4 border-b border-gray-50 px-4 py-3 last:border-0 transition-colors hover:bg-blue-50/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Text className="text-sm font-medium">{param.paramName}</Text>
        </div>
        <Text type="secondary" className="text-xs">{param.description}</Text>
        <Text code className="mt-0.5 text-[11px]" type="secondary">{param.paramKey}</Text>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ParamValueEditor
          dataType={param.dataType}
          optionCode={param.optionCode}
          value={currentValue}
          onChange={onValueChange}
        />
        {isDirty && (
          <Button type="primary" size="small" loading={saving} onClick={onSave}>
            保存
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group card                                                         */
/* ------------------------------------------------------------------ */

interface GroupCardProps {
  readonly group: ParamGroup;
  readonly dirtyMap: Record<string, string>;
  readonly savingKeys: ReadonlySet<string>;
  readonly onValueChange: (paramKey: string, value: string) => void;
  readonly onSaveParam: (param: AdvanceParamItem) => void;
}

function GroupCard({ group, dirtyMap, savingKeys, onValueChange, onSaveParam }: GroupCardProps) {
  if (group.params.length === 0) {
    return (
      <Card className="shadow-sm" styles={{ body: { padding: '32px 24px', textAlign: 'center' } }}>
        <Text type="secondary">暂无配置项</Text>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-blue-500" />
          <Text strong className="text-[15px]">{group.groupName}</Text>
          <Badge
            count={group.params.length}
            style={{ backgroundColor: '#f0f5ff', color: '#1677ff', fontSize: 11, fontWeight: 400 }}
          />
        </div>
      }
      className="shadow-sm"
      styles={{ body: { padding: 0 } }}
    >
      {group.params.map((param) => (
        <ParamRow
          key={param.paramKey}
          param={param}
          dirtyValue={dirtyMap[param.paramKey]}
          onValueChange={(value) => onValueChange(param.paramKey, value)}
          onSave={() => onSaveParam(param)}
          saving={savingKeys.has(param.paramKey)}
        />
      ))}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab panel                                                          */
/* ------------------------------------------------------------------ */

interface TabPanelProps {
  readonly tab: AdvanceTab;
  readonly onDirtyUpdate: (paramKey: string, value: string) => void;
  readonly onSaveParam: (param: AdvanceParamItem) => void;
  readonly onBatchSave: () => Promise<void>;
  readonly dirtyMap: Record<string, string>;
  readonly savingKeys: ReadonlySet<string>;
  readonly hasChanges: boolean;
}

function TabPanel({ tab, dirtyMap, savingKeys, onDirtyUpdate, onSaveParam, onBatchSave, hasChanges }: TabPanelProps) {

  return (
    <div className="flex flex-col gap-5">
      {tab.groups.map((group) => (
        <GroupCard
          key={group.groupName}
          group={group}
          dirtyMap={dirtyMap}
          savingKeys={savingKeys}
          onValueChange={onDirtyUpdate}
          onSaveParam={onSaveParam}
        />
      ))}

      {hasChanges && (
        <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between rounded-b-lg border-t bg-white px-6 py-4 shadow-lg">
          <Text type="secondary">
            <Text strong>{Object.keys(dirtyMap).length}</Text> 项未保存的更改
          </Text>
          <Button type="primary" size="large" onClick={() => void onBatchSave()}>
            批量保存全部更改
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export function GeneralConfigPage() {
  const [tabs, setTabs] = useState<AdvanceTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dirtyMap, setDirtyMap] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<ReadonlySet<string>>(() => new Set());
  const notice = useNotice();

  useEffect(() => {
    setLoading(true);
    setError(false);

    void paramService.getGeneralConfig()
      .then((dto) => {
        setTabs(buildTabs(dto));
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleValueChange = useCallback((paramKey: string, value: string) => {
    setDirtyMap((prev) => ({ ...prev, [paramKey]: value }));
  }, []);

  const saveParam = useCallback(
    async (param: AdvanceParamItem) => {
      const value = dirtyMap[param.paramKey];
      if (value === undefined) return;

      setSavingKeys((prev) => new Set(prev).add(param.paramKey));
      try {
        await paramService.saveOrUpdateByKey(param.paramKey, { paramValue: value });
        param.paramValue = value;
        setDirtyMap((prev) => {
          const next = { ...prev };
          delete next[param.paramKey];
          return next;
        });
        notice.success(`「${param.paramName}」已保存`);
      } catch {
        notice.error(`「${param.paramName}」保存失败`);
      } finally {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          next.delete(param.paramKey);
          return next;
        });
      }
    },
    [dirtyMap, notice],
  );

  const batchSave = useCallback(async () => {
    const dirtyEntries = Object.entries(dirtyMap);
    if (dirtyEntries.length === 0) return;

    const dto: GeneralConfigDTO = {};
    for (const [paramKey, value] of dirtyEntries) {
      // Find the field config for this paramKey
      for (const tab of tabs) {
        for (const group of tab.groups) {
          const param = group.params.find((p) => p.paramKey === paramKey);
          if (param) {
            const field = TAB_CONFIGS.flatMap((t) => t.groups.flatMap((g) => g.fields))
              .find((f) => f.paramKey === paramKey);
            if (field) {
              (dto as Record<string, unknown>)[field.field] = parseValue(value, param.dataType);
            }
            param.paramValue = value;
            break;
          }
        }
      }
    }

    try {
      await paramService.updateGeneralConfig(dto);
      setDirtyMap({});
      notice.success(`全部 ${dirtyEntries.length} 项已保存`);
    } catch {
      notice.error('批量保存失败，请重试');
    }
  }, [dirtyMap, tabs, notice]);

  const hasChanges = Object.keys(dirtyMap).length > 0;

  const tabItems = useMemo<TabsProps['items']>(
    () =>
      tabs.map((tab) => ({
        key: tab.tabName,
        label: tab.tabName,
        children: (
          <TabPanel
            tab={tab}
            dirtyMap={dirtyMap}
            savingKeys={savingKeys}
            hasChanges={hasChanges}
            onDirtyUpdate={handleValueChange}
            onSaveParam={saveParam}
            onBatchSave={batchSave}
          />
        ),
      })),
    [tabs, dirtyMap, savingKeys, hasChanges, handleValueChange, saveParam, batchSave],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="加载配置失败，请稍后重试" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-6">
        <Tabs
          defaultActiveKey="登录与注册"
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 24 }}
        />
      </div>
    </div>
  );
}

export default GeneralConfigPage;