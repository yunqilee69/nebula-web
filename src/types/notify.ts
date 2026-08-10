import type { NebulaPageReq } from '@/components/nebula-pro-table/params';
import type { UserResp } from '@/types/auth-management';

export type ChannelType = 'SITE' | 'EMAIL' | (string & Record<never, never>);
export type AnnouncementStatus = 0 | 1 | 2;
export type AnnouncementTargetType = 'ALL' | 'USER' | 'ROLE' | 'ORG';
export type NotifyTemplateStatus = 0 | 1;
export type NotifySendStatus = 'SUCCESS' | 'FAILED';
export type ReceiverSourceType = Exclude<AnnouncementTargetType, 'ALL'>;

export interface ReceiverItem {
  readonly sourceType: ReceiverSourceType;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly users: readonly UserResp[];
}

export type TemplateVariable =
  | {
      readonly kind: 'CUSTOM';
      readonly name: string;
      readonly description?: string;
      readonly builtin: false;
    }
  | {
      readonly kind: 'BUILTIN';
      readonly name: string;
      readonly description: string;
      readonly builtin: true;
    };

export interface AnnouncementDto {
  readonly id: string;
  readonly title: string;
  readonly status: AnnouncementStatus;
  readonly publishTime: string;
  readonly expireTime?: string;
  readonly pinnedFlag: boolean;
  readonly sortNum: number;
  readonly popupFlag: boolean;
  readonly targetType: AnnouncementTargetType;
  readonly targetValues: readonly string[];
  readonly createTime?: string;
  readonly updateTime?: string;
}

export interface AnnouncementDetailDto extends AnnouncementDto {
  readonly content: string;
}

export interface CurrentAnnouncementDto {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly publishTime: string;
  readonly expireTime?: string;
  readonly pinnedFlag: boolean;
  readonly sortNum: number;
  readonly popupFlag: boolean;
  readonly readStatus: boolean;
  readonly readTime?: string;
  readonly createTime?: string;
  readonly updateTime?: string;
}

export interface AnnouncementPageReq extends NebulaPageReq {
  readonly title?: string;
  readonly status?: AnnouncementStatus;
  readonly targetType?: AnnouncementTargetType;
  readonly popupFlag?: boolean;
  readonly pinnedFlag?: boolean;
}

export interface CurrentAnnouncementPageReq extends NebulaPageReq {
  readonly readStatus?: boolean;
  readonly popupFlag?: boolean;
}

export interface CreateAnnouncementReq {
  readonly title: string;
  readonly content: string;
  readonly status?: AnnouncementStatus;
  readonly publishTime?: string;
  readonly expireTime?: string;
  readonly pinnedFlag?: boolean;
  readonly sortNum?: number;
  readonly popupFlag?: boolean;
  readonly targetType: AnnouncementTargetType;
  readonly targetValues?: readonly string[];
}

export type UpdateAnnouncementReq = CreateAnnouncementReq | Pick<CreateAnnouncementReq, 'status'>;

export interface NotifyTemplateDto {
  readonly id: string;
  readonly templateCode: string;
  readonly templateName: string;
  readonly channelType: ChannelType;
  readonly status: NotifyTemplateStatus;
  readonly builtinFlag: boolean;
  readonly createTime?: string;
  readonly updateTime?: string;
}

export interface NotifyTemplateDetailDto extends NotifyTemplateDto {
  readonly subjectTemplate?: string;
  readonly contentTemplate: string;
  readonly remark?: string;
}

export interface NotifyTemplatePageReq extends NebulaPageReq {
  readonly templateCode?: string;
  readonly templateName?: string;
  readonly channelType?: ChannelType;
  readonly status?: NotifyTemplateStatus;
}

export interface CreateNotifyTemplateReq {
  readonly templateCode: string;
  readonly templateName: string;
  readonly channelType: ChannelType;
  readonly subjectTemplate?: string;
  readonly contentTemplate: string;
  readonly status?: NotifyTemplateStatus;
  readonly builtinFlag?: boolean;
  readonly remark?: string;
}

export interface UpdateNotifyTemplateReq {
  readonly templateName: string;
  readonly subjectTemplate?: string;
  readonly contentTemplate: string;
  readonly status?: NotifyTemplateStatus;
  readonly builtinFlag?: boolean;
  readonly remark?: string;
}

export interface SendNotifyReq {
  readonly channelTypes: readonly ChannelType[];
  readonly templateCode?: string;
  readonly templateParams?: Readonly<Record<string, string>>;
  readonly subject?: string;
  readonly content?: string;
  readonly receiver?: string;
  readonly ccReceiver?: string;
  readonly receiverUserIds?: readonly string[];
  readonly bizType?: string;
  readonly bizNo?: string;
  readonly extJson?: string;
}

export interface NotifySendResultDto {
  readonly recordId: string;
  readonly siteMessageId?: string;
  readonly channelType: ChannelType;
  readonly receiver: string;
  readonly sendStatus: NotifySendStatus;
  readonly failReason?: string;
}

export type NotifySendResultList = readonly NotifySendResultDto[];

export interface NotifyRecordDto {
  readonly id: string;
  readonly channelType: ChannelType;
  readonly templateCode?: string;
  readonly subjectText?: string;
  readonly receiver: string;
  readonly sendStatus: NotifySendStatus;
  readonly sendTime?: string;
  readonly createTime?: string;
  readonly updateTime?: string;
}

export interface NotifyRecordDetailDto extends NotifyRecordDto {
  readonly bizType?: string;
  readonly bizNo?: string;
  readonly contentText: string;
  readonly ccReceiver?: string;
  readonly failReason?: string;
  readonly extJson?: string;
}

export interface NotifyRecordPageReq extends NebulaPageReq {
  readonly channelType?: ChannelType;
  readonly templateCode?: string;
  readonly sendStatus?: NotifySendStatus;
  readonly receiver?: string;
  readonly bizType?: string;
}

export interface SiteMessageDto {
  readonly id: string;
  readonly recordId: string;
  readonly receiverUserId: string;
  readonly title: string;
  readonly content: string;
  readonly readStatus: boolean;
  readonly readTime?: string;
  readonly createTime?: string;
  readonly updateTime?: string;
}

export interface SiteMessagePageReq extends NebulaPageReq {
  readonly receiverUserId?: string;
  readonly readStatus?: boolean;
  readonly createTimeFrom?: string;
  readonly createTimeTo?: string;
}

export interface SiteMessageReadStatusBatchReq {
  readonly ids: readonly string[];
}

export type UnreadSiteMessageCount = number;

export type AnnouncementResp = AnnouncementDto;
export type AnnouncementDetailResp = AnnouncementDetailDto;
export type CurrentAnnouncementResp = CurrentAnnouncementDto;
export type NotifyTemplateResp = NotifyTemplateDto;
export type NotifyTemplateDetailResp = NotifyTemplateDetailDto;
export type NotifySendResultResp = NotifySendResultDto;
export type NotifyRecordResp = NotifyRecordDto;
export type NotifyRecordDetailResp = NotifyRecordDetailDto;
export type SiteMessageResp = SiteMessageDto;
