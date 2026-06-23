import { createRequestClient } from './create-request-client';
import type { NebulaRequestConfig, NebulaRequestFn } from './types';
import type { AxiosError } from 'axios';
import { getStoredAccessToken, getStoredRefreshToken, saveAuthTokens, clearAuthTokens } from '@/auth/token-session';
import { notifySessionExpired } from '@/auth/session-expired';
import { notice } from '@/app/notice';
import type { LoginResp } from '@/auth/types';

let notifying = false;
const defaultHttpErrorMessage = '接口请求出错，请稍后重试';

function getHttpErrorMessage(error: AxiosError) {
  const data = error.response?.data;

  if (data && typeof data === 'object' && 'message' in data) {
    const message = data.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }

  return error.message.trim() || defaultHttpErrorMessage;
}

function handleSessionExpired() {
  if (!getStoredAccessToken() && !getStoredRefreshToken()) return;
  if (notifying) return;
  notifying = true;
  clearAuthTokens();
  notifySessionExpired();
  setTimeout(() => { notifying = false; }, 0);
}

export const requestClient = createRequestClient({
  getToken: getStoredAccessToken,
  refreshToken: async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await request<LoginResp>({
        method: 'POST',
        url: '/api/auth/refresh',
        data: { refreshToken },
        _nebulaSkipAuthRefresh: true,
      });

      if (!response.accessToken) return null;

      saveAuthTokens(response);
      return response.accessToken;
    } catch {
      return null;
    }
  },
  onRefreshFailed: () => {
    handleSessionExpired();
  },
  onUnauthorized: () => {
    handleSessionExpired();
  },
  onError: (error) => {
    if (error.response?.status === 401) return;
    notice.error(getHttpErrorMessage(error));
  },
  onBusinessError: (message) => {
    notice.error(message);
  },
});

export const request: NebulaRequestFn = async <T,>(config: NebulaRequestConfig) => {
  const result: unknown = await requestClient.request(config);
  return result as T;
};
