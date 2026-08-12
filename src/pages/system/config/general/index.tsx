import { LoadingOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Switch,
  Tabs,
  Typography,
} from 'antd';
import type { TabsProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DictSelect } from '@/components/dict-select';
import { useNotice } from '@/hooks/use-notice';
import { notifyService } from '@/services/notify';
import { paramService } from '@/services/param';
import { DataType, type DataType as ParamDataType } from '@/types/param';
import type { GeneralConfigDTO } from '@/types/param';
import { TAB_CONFIGS, valueToString } from './advance-config-data';
import type { AdvanceParamItem, AdvanceTab, ParamGroup } from './advance-config-data';

const { Text } = Typography;

interface TestEmailFormValues {
  readonly receiver: string;
  readonly subject: string;
  readonly content: string;
}

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
      if (optionCode === 'password') {
        return (
          <Input.Password
            style={{ width: 280 }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }
      if (optionCode === 'notify_email_security') {
        return (
          <Select
            style={{ width: 280 }}
            value={value || undefined}
            options={[
              { label: 'NONE', value: 'NONE' },
              { label: 'STARTTLS', value: 'STARTTLS' },
              { label: 'SSL', value: 'SSL' },
            ]}
            onChange={(next) => onChange(next)}
          />
        );
      }
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
  readonly onTestEmail: () => void;
}

function GroupCard({ group, dirtyMap, savingKeys, onValueChange, onSaveParam, onTestEmail }: GroupCardProps) {
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
      extra={
        group.groupName === '邮件配置' ? (
          <Button type="primary" size="small" onClick={onTestEmail}>
            测试邮件配置
          </Button>
        ) : undefined
      }
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
  readonly onTestEmail: () => void;
  readonly dirtyMap: Record<string, string>;
  readonly savingKeys: ReadonlySet<string>;
  readonly hasChanges: boolean;
}

function TabPanel({ tab, dirtyMap, savingKeys, onDirtyUpdate, onSaveParam, onBatchSave, onTestEmail, hasChanges }: TabPanelProps) {

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
          onTestEmail={onTestEmail}
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
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailForm] = Form.useForm<TestEmailFormValues>();
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

  const openTestEmail = useCallback(() => {
    testEmailForm.setFieldsValue({
      subject: 'Nebula SMTP配置测试',
      content: '这是一封用于验证 Nebula 邮件通知配置是否有效的测试邮件。',
    });
    setTestEmailOpen(true);
  }, [testEmailForm]);

  const sendTestEmail = useCallback(async () => {
    const values = await testEmailForm.validateFields();
    setTestingEmail(true);
    try {
      await notifyService.testEmailNotify(values);
      notice.success('测试邮件发送成功');
      setTestEmailOpen(false);
      testEmailForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        notice.error(error.message || '测试邮件发送失败');
      } else {
        notice.error('测试邮件发送失败');
      }
    } finally {
      setTestingEmail(false);
    }
  }, [notice, testEmailForm]);

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
              onTestEmail={openTestEmail}
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
      <Modal
        title="测试邮件配置"
        open={testEmailOpen}
        confirmLoading={testingEmail}
        okText="发送测试邮件"
        cancelText="取消"
        onOk={() => void sendTestEmail()}
        onCancel={() => setTestEmailOpen(false)}
        destroyOnHidden
      >
        <Form<TestEmailFormValues>
          form={testEmailForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="receiver"
            label="收件人"
            rules={[
              { required: true, message: '请输入收件人邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="admin@example.com" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="主题"
            rules={[{ required: true, message: '请输入邮件主题' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入邮件内容' }]}
          >
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default GeneralConfigPage;
