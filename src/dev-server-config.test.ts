import { describe, expect, it } from 'vitest';
import { devServerProxy, localBackendBaseURL } from './dev-server-config';

describe('development server API wiring', () => {
  it('uses same-origin API requests and proxies them to the local backend', () => {
    expect(localBackendBaseURL).toBe('/');
    expect(devServerProxy).toMatchObject({
      '/api': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
    });
  });
});
