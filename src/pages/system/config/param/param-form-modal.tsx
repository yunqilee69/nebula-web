import { Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { dictService } from '@/services/dict';
import type { DictItemTreeResp, DictTypeDetailResp } from '@/types/dict';
import { DataType } from '@/types/param';
import { buildParamValueRules, ParamValueInput } from './components/param-value-input';
import { PARAM_DATA_TYPE_VALUES, assertNever, paramI18n, usesDictionaryOptions } from './param-page-helpers';
import type { ParamFormMode, ParamFormValues } from './param-page-helpers';

const DICT_TYPE_SELECT_PAGE_SIZE = 500;
const PARAM_MODULE_DICT_CODE = 'param_module';

type ParamSelectOption = Readonly<{ label: string; value: string; disabled?: boolean }>;
type ModuleOptionsLoadResult =
  | Readonly<{ kind: 'loaded'; options: ParamSelectOption[] }>
  | Readonly<{ kind: 'failed' }>;

interface ParamFormModalProps {
  readonly form: FormInstance<ParamFormValues>;
  readonly mode: ParamFormMode;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly translate: (key: string) => string;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

function getModalTitle(mode: ParamFormMode, translate: (key: string) => string): string {
  switch (mode) {
    case 'create':
      return translate(paramI18n.modal.createTitle);
    case 'update':
      return translate(paramI18n.modal.editTitle);
    default:
      return assertNever(mode);
  }
}

function mapDictTypesToOptionCodeOptions(types: readonly DictTypeDetailResp[]): ParamSelectOption[] {
  return types.map((type) => ({
    label: type.name || type.code,
    value: type.code,
  }));
}

function normalizeModuleOptionValue(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function mapDictItemsToModuleOptions(items: readonly DictItemTreeResp[]): ParamSelectOption[] {
  return items.flatMap((item) => {
    const children = mapDictItemsToModuleOptions(item.children ?? []);
    const value = normalizeModuleOptionValue(item.itemValue);
    if (!value) return children;
    return [
      {
        label: normalizeModuleOptionValue(item.name) ?? value,
        value,
        disabled: item.enabled === false,
      },
      ...children,
    ];
  });
}

function hasSelectableOption(options: readonly ParamSelectOption[]): boolean {
  return options.some((option) => option.disabled !== true);
}

function withSelectedOption(options: readonly ParamSelectOption[], selectedValue: string | undefined): ParamSelectOption[] {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) return [...options];
  return [{ label: selectedValue, value: selectedValue }, ...options];
}

function showModuleOptionsError(translate: (key: string) => string): void {
  Modal.error({
    title: translate(paramI18n.feedback.moduleOptionsLoadFailedTitle),
    content: translate(paramI18n.feedback.moduleOptionsLoadFailed),
  });
}

export function ParamFormModal({
  form,
  mode,
  open,
  submitting,
  detailLoading,
  translate,
  onSubmit,
  onCancel,
}: ParamFormModalProps) {
  const dataType = Form.useWatch('dataType', form) ?? DataType.STRING;
  const optionCode = Form.useWatch('optionCode', form);
  const selectedOptionCode = typeof optionCode === 'string' ? optionCode : undefined;
  const moduleCode = Form.useWatch('moduleCode', form);
  const selectedModuleCode = typeof moduleCode === 'string' ? moduleCode : undefined;
  const disabled = submitting || detailLoading;
  const showOptionCode = usesDictionaryOptions(dataType);
  const [optionCodeOptions, setOptionCodeOptions] = useState<ParamSelectOption[]>([]);
  const [optionCodeLoading, setOptionCodeLoading] = useState(false);
  const [moduleOptions, setModuleOptions] = useState<ParamSelectOption[]>([]);
  const [moduleOptionsLoading, setModuleOptionsLoading] = useState(false);

  const dataTypeOptions = useMemo(
    () => PARAM_DATA_TYPE_VALUES.map((value) => ({ label: translate(paramI18n.dataTypes[value]), value })),
    [translate],
  );
  const displayedOptionCodeOptions = useMemo(() => {
    return withSelectedOption(optionCodeOptions, selectedOptionCode);
  }, [optionCodeOptions, selectedOptionCode]);
  const displayedModuleOptions = useMemo(() => {
    return withSelectedOption(moduleOptions, selectedModuleCode);
  }, [moduleOptions, selectedModuleCode]);
  const valueRules = useMemo(() => buildParamValueRules(), []);

  useEffect(() => {
    if (!showOptionCode) form.setFieldValue('optionCode', undefined);
  }, [form, showOptionCode]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setModuleOptions([]);
    setModuleOptionsLoading(true);

    void dictService.listItemsByCode(PARAM_MODULE_DICT_CODE)
      .then(
        (items): ModuleOptionsLoadResult => ({ kind: 'loaded', options: mapDictItemsToModuleOptions(items) }),
        (): ModuleOptionsLoadResult => ({ kind: 'failed' }),
      )
      .then((result) => {
        if (!active) return;
        switch (result.kind) {
          case 'loaded':
            setModuleOptions(result.options);
            if (!hasSelectableOption(result.options)) showModuleOptionsError(translate);
            break;
          case 'failed':
            setModuleOptions([]);
            showModuleOptionsError(translate);
            break;
          default:
            assertNever(result);
        }
      })
      .finally(() => {
        if (active) setModuleOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, translate]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setOptionCodeOptions([]);
    setOptionCodeLoading(true);

    void dictService.pageTypes({ pageNum: 1, pageSize: DICT_TYPE_SELECT_PAGE_SIZE })
      .then((page) => mapDictTypesToOptionCodeOptions(page.data), () => [])
      .then((nextOptions) => {
        if (active) setOptionCodeOptions(nextOptions);
      })
      .finally(() => {
        if (active) setOptionCodeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  return (
    <Modal
      title={getModalTitle(mode, translate)}
      open={open}
      confirmLoading={submitting}
      okText={translate(paramI18n.actions.save)}
      cancelText={translate(paramI18n.actions.cancel)}
      onOk={onSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        disabled={disabled}
        initialValues={{ dataType: DataType.STRING }}
      >
        <Form.Item name="paramKey" label={translate(paramI18n.fields.paramKey)} rules={[{ required: true, message: translate(paramI18n.validation.paramKeyRequired) }]}>
          <Input disabled={mode === 'update'} placeholder={translate(paramI18n.placeholders.paramKey)} />
        </Form.Item>
        <Form.Item name="paramName" label={translate(paramI18n.fields.paramName)} rules={[{ required: true, message: translate(paramI18n.validation.paramNameRequired) }]}>
          <Input placeholder={translate(paramI18n.placeholders.paramName)} />
        </Form.Item>
        <Form.Item name="dataType" label={translate(paramI18n.fields.dataType)} rules={[{ required: true, message: translate(paramI18n.validation.dataTypeRequired) }]}>
          <Select options={dataTypeOptions} placeholder={translate(paramI18n.placeholders.dataType)} />
        </Form.Item>
        <Form.Item name="paramValue" label={translate(paramI18n.fields.paramValue)} rules={valueRules}>
          <ParamValueInput
            dataType={dataType}
            optionCode={selectedOptionCode}
          />
        </Form.Item>
        <Form.Item name="moduleCode" label={translate(paramI18n.fields.moduleCode)}>
          <Select
            allowClear
            disabled={disabled}
            loading={moduleOptionsLoading}
            options={displayedModuleOptions}
            placeholder={translate(paramI18n.placeholders.moduleCode)}
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
        <Form.Item name="description" label={translate(paramI18n.fields.description)}>
          <Input.TextArea rows={3} placeholder={translate(paramI18n.placeholders.description)} />
        </Form.Item>
        {showOptionCode ? (
          <Form.Item name="optionCode" label={translate(paramI18n.fields.optionCode)}>
            <Select
              allowClear
              disabled={disabled}
              loading={optionCodeLoading}
              options={displayedOptionCodeOptions}
              placeholder={translate(paramI18n.placeholders.optionCode)}
              showSearch={{ optionFilterProp: 'label' }}
            />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
