import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions';

describe('hasPermission', () => {
  it('未声明权限要求时允许访问', () => {
    expect(hasPermission(['system:user:list'], undefined)).toBe(true);
  });

  it('用户拥有所需权限时允许访问', () => {
    expect(hasPermission(['system:user:list'], 'system:user:list')).toBe(true);
  });

  it('用户缺少所需权限时拒绝访问', () => {
    expect(hasPermission(['system:user:list'], 'system:user:delete')).toBe(false);
  });
});
