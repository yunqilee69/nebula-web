import type { AuthManagementService } from '@/api/auth-management';
import type { UserResp } from '@/types/auth-management';
import type { ChannelType, ReceiverItem, SendNotifyReq } from '@/types/notify';

export type SendPlanCounts = {
  readonly channelCount: number;
  readonly selectedUserCount: number;
  readonly siteRecipientCount: number;
  readonly emailRecipientCount: number;
  readonly emailExcludedCount: number;
};

export type ValidSendPlan = {
  readonly kind: 'VALID';
  readonly request: SendNotifyReq;
  readonly counts: SendPlanCounts;
};

type InvalidSendPlan = {
  readonly kind: 'INVALID';
  readonly reason: 'CHANNELS_REQUIRED' | 'RECIPIENTS_REQUIRED' | 'EMAIL_RECIPIENTS_REQUIRED';
};

type SendPlanInput = {
  readonly channelTypes?: readonly ChannelType[];
  readonly receiverItems: readonly ReceiverItem[];
  readonly templateCode: string;
  readonly templateChannelType?: ChannelType;
  readonly templateParams: Readonly<Record<string, string>>;
};

type ReceiverUserService = Pick<AuthManagementService, 'pageUsers'>;

type ResolvedSource = {
  readonly sourceType: 'ROLE' | 'ORG';
  readonly sourceId: string;
  readonly pageSize?: number;
};

function assertNever(value: never): never {
  throw new TypeError(`Unexpected receiver source: ${String(value)}`);
}

export function mergeReceiverUsers(items: readonly ReceiverItem[]): readonly UserResp[] {
  const userIds = new Set<string>();
  const users: UserResp[] = [];

  for (const item of items) {
    for (const user of item.users) {
      if (userIds.has(user.id)) continue;
      userIds.add(user.id);
      users.push(user);
    }
  }

  return users;
}

export function extractCustomTemplateVariables(
  subjectTemplate: string | undefined,
  contentTemplate: string,
): readonly string[] {
  const variables: string[] = [];
  const seen = new Set<string>();
  const source = `${subjectTemplate ?? ''}\n${contentTemplate}`;

  for (const match of source.matchAll(/\$\{([^}]+)\}/g)) {
    const name = match[1]?.trim();
    if (!name || name.startsWith('notify.') || seen.has(name)) continue;
    seen.add(name);
    variables.push(name);
  }

  return variables;
}

export function createSendPlan(input: SendPlanInput): ValidSendPlan | InvalidSendPlan {
  const channelTypes = input.templateChannelType ? [input.templateChannelType] : input.channelTypes ?? [];

  if (channelTypes.length === 0) {
    return { kind: 'INVALID', reason: 'CHANNELS_REQUIRED' };
  }

  const users = mergeReceiverUsers(input.receiverItems);
  if (users.length === 0) {
    return { kind: 'INVALID', reason: 'RECIPIENTS_REQUIRED' };
  }

  const emailUsers = users.filter((user) => Boolean(user.email?.trim()));
  const includesEmail = channelTypes.includes('EMAIL');
  if (includesEmail && emailUsers.length === 0) {
    return { kind: 'INVALID', reason: 'EMAIL_RECIPIENTS_REQUIRED' };
  }

  const request: SendNotifyReq = {
    channelTypes,
    templateCode: input.templateCode,
    templateParams: input.templateParams,
    receiverUserIds: users.map((user) => user.id),
    ...(includesEmail
      ? { receiver: emailUsers.map((user) => user.email?.trim() ?? '').join(',') }
      : {}),
  };

  return {
    kind: 'VALID',
    request,
    counts: {
      channelCount: channelTypes.length,
      selectedUserCount: users.length,
      siteRecipientCount: channelTypes.includes('SITE') ? users.length : 0,
      emailRecipientCount: includesEmail ? emailUsers.length : 0,
      emailExcludedCount: includesEmail ? users.length - emailUsers.length : 0,
    },
  };
}

export async function loadAllUsersForSource(
  service: ReceiverUserService,
  source: ResolvedSource,
): Promise<readonly UserResp[]> {
  const pageSize = source.pageSize ?? 100;
  const users: UserResp[] = [];
  let pageNum = 1;
  let total = 0;

  do {
    const filter = (() => {
      switch (source.sourceType) {
        case 'ROLE':
          return { roleId: source.sourceId };
        case 'ORG':
          return { orgId: source.sourceId };
        default:
          return assertNever(source.sourceType);
      }
    })();
    const page = await service.pageUsers({ pageNum, pageSize, ...filter });
    users.push(...page.data);
    total = page.total;
    pageNum += 1;
  } while (users.length < total);

  return users;
}
