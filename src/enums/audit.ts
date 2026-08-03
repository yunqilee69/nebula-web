import type { AuditCategory, AuditConsistency } from '@/types/audit';

/**
 * 审计分类标签颜色
 */
export const AUDIT_CATEGORY_TAG_COLOR: Record<AuditCategory, string> = {
  BUSINESS: 'blue',
  SECURITY: 'red',
} as const;

/**
 * 审计分类显示文本
 */
export const AUDIT_CATEGORY_LABEL: Record<AuditCategory, string> = {
  BUSINESS: '业务操作',
  SECURITY: '安全审计',
} as const;

/**
 * 一致性级别标签颜色
 */
export const AUDIT_CONSISTENCY_TAG_COLOR: Record<AuditConsistency, string> = {
  EVENTUAL: 'cyan',
  STRONG: 'purple',
} as const;

/**
 * 一致性级别显示文本
 */
export const AUDIT_CONSISTENCY_LABEL: Record<AuditConsistency, string> = {
  EVENTUAL: '最终一致性',
  STRONG: '强一致性',
} as const;

/**
 * 成功状态标签颜色映射
 */
export const SUCCESS_TAG_COLOR: Record<'true' | 'false', string> = {
  true: 'success',
  false: 'error',
} as const;