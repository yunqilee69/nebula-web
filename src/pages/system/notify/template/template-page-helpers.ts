import { NEBULA_TABLE_DEFAULT_PAGE_SIZE } from '@/components/nebula-pro-table/params';
import type { NebulaPageReq } from '@/components/nebula-pro-table/params';
import type { NotifyService } from '@/services/notify';
import type {
  ChannelType,
  CreateNotifyTemplateReq,
  NotifyTemplateDetailResp,
  NotifyTemplatePageReq,
  NotifyTemplateStatus,
  TemplateVariable,
  UpdateNotifyTemplateReq,
} from '@/types/notify';

export const NOTIFY_CHANNEL_TYPE = 'NOTIFY_CHANNEL_TYPE';

export const SYSTEM_TEMPLATE_VARIABLES = [
  { kind: 'BUILTIN', name: 'notify.currentDateTime', description: '当前日期时间', builtin: true },
  { kind: 'BUILTIN', name: 'notify.currentDate', description: '当前日期', builtin: true },
  { kind: 'BUILTIN', name: 'notify.currentTime', description: '当前时间', builtin: true },
  { kind: 'BUILTIN', name: 'notify.timestamp', description: '当前时间戳', builtin: true },
  { kind: 'BUILTIN', name: 'notify.year', description: '当前年份', builtin: true },
  { kind: 'BUILTIN', name: 'notify.month', description: '当前月份', builtin: true },
  { kind: 'BUILTIN', name: 'notify.day', description: '当前日期中的日', builtin: true },
  { kind: 'BUILTIN', name: 'notify.hour', description: '当前小时', builtin: true },
  { kind: 'BUILTIN', name: 'notify.minute', description: '当前分钟', builtin: true },
  { kind: 'BUILTIN', name: 'notify.second', description: '当前秒', builtin: true },
  { kind: 'BUILTIN', name: 'notify.dayOfWeek', description: '当前星期', builtin: true },
  { kind: 'BUILTIN', name: 'notify.templateCode', description: '当前模板编码（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.channelType', description: '当前发送渠道（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.bizType', description: '业务类型（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.bizNo', description: '业务编号（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.receiver', description: '当前接收地址（自动）', builtin: true },
  { kind: 'BUILTIN', name: 'notify.receiverUserId', description: '当前接收用户 ID（自动）', builtin: true },
] as const satisfies readonly TemplateVariable[];

export type NotifyTemplateService = Pick<
  NotifyService,
  | 'pageNotifyTemplates'
  | 'getNotifyTemplate'
  | 'createNotifyTemplate'
  | 'updateNotifyTemplate'
  | 'deleteNotifyTemplate'
  | 'sendNotify'
>;

export interface NotifyTemplateTableQuery {
  readonly templateCode?: string;
  readonly templateName?: string;
  readonly channelType?: ChannelType;
  readonly status?: NotifyTemplateStatus;
}

export interface NotifyTemplateFormValues {
  readonly templateCode: string;
  readonly templateName: string;
  readonly channelType: ChannelType;
  readonly subjectTemplate?: string;
  readonly contentTemplate: string;
  readonly status: NotifyTemplateStatus;
  readonly remark?: string;
}

export type NotifyTemplateFormState =
  | Readonly<{ mode: 'create' }>
  | Readonly<{ mode: 'update'; templateId: string }>;

export function extractCustomTemplateVariables(
  subjectTemplate: string | undefined,
  contentTemplate: string,
): readonly TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const names = new Set<string>();
  const pattern = /\$\{([A-Za-z_][A-Za-z0-9_.-]*)\}/g;

  for (const template of [subjectTemplate ?? '', contentTemplate]) {
    for (const match of template.matchAll(pattern)) {
      const name = match[1];
      if (!name || name.startsWith('notify.') || names.has(name)) continue;
      names.add(name);
      variables.push({ kind: 'CUSTOM', name, builtin: false });
    }
  }

  return variables;
}

export function buildNotifyTemplatePageReq(
  params: NotifyTemplateTableQuery & Partial<NebulaPageReq>,
): NotifyTemplatePageReq {
  const templateCode = normalizeOptionalText(params.templateCode);
  const templateName = normalizeOptionalText(params.templateName);

  return {
    pageNum: params.pageNum ?? 1,
    pageSize: params.pageSize ?? NEBULA_TABLE_DEFAULT_PAGE_SIZE,
    ...(templateCode ? { templateCode } : {}),
    ...(templateName ? { templateName } : {}),
    ...(params.channelType ? { channelType: params.channelType } : {}),
    ...(params.status !== undefined ? { status: params.status } : {}),
    ...(params.orderName ? { orderName: params.orderName } : {}),
    ...(params.orderType ? { orderType: params.orderType } : {}),
  };
}

export function toCreateNotifyTemplateReq(values: NotifyTemplateFormValues): CreateNotifyTemplateReq {
  return {
    templateCode: values.templateCode.trim(),
    templateName: values.templateName.trim(),
    channelType: values.channelType,
    contentTemplate: values.contentTemplate.trim(),
    status: values.status,
    ...optionalTemplateFields(values),
  };
}

export function toUpdateNotifyTemplateReq(values: NotifyTemplateFormValues): UpdateNotifyTemplateReq {
  return {
    templateName: values.templateName.trim(),
    contentTemplate: values.contentTemplate.trim(),
    status: values.status,
    ...optionalTemplateFields(values),
  };
}

export function toNotifyTemplateFormValues(
  detail: NotifyTemplateDetailResp,
): Partial<NotifyTemplateFormValues> {
  return {
    templateCode: detail.templateCode,
    templateName: detail.templateName,
    channelType: detail.channelType,
    contentTemplate: detail.contentTemplate,
    status: detail.status,
    ...(detail.subjectTemplate ? { subjectTemplate: detail.subjectTemplate } : {}),
    ...(detail.remark ? { remark: detail.remark } : {}),
  };
}

function optionalTemplateFields(
  values: NotifyTemplateFormValues,
): Pick<CreateNotifyTemplateReq, 'subjectTemplate' | 'remark'> {
  const subjectTemplate = normalizeOptionalText(values.subjectTemplate);
  const remark = normalizeOptionalText(values.remark);
  return {
    ...(subjectTemplate ? { subjectTemplate } : {}),
    ...(remark ? { remark } : {}),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
