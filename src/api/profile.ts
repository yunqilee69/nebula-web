import { request } from '@/request/request';
import type {
  BindOAuth2Req,
  ChangePasswordReq,
  LoginRecordPageReq,
  LoginRecordResp,
  OAuth2BindingListResp,
  PageResp,
  ProfileResp,
  UpdateProfileReq,
} from '@/types/profile';

export interface ProfileService {
  getProfile: () => Promise<ProfileResp>;
  updateProfile: (data: UpdateProfileReq) => Promise<ProfileResp>;
  changePassword: (data: ChangePasswordReq) => Promise<void>;
  listOAuth2Bindings: () => Promise<OAuth2BindingListResp>;
  bindOAuth2: (data: BindOAuth2Req) => Promise<string>;
  unbindOAuth2: (providerId: string) => Promise<boolean>;
  pageLoginRecords: (data: LoginRecordPageReq) => Promise<PageResp<LoginRecordResp>>;
}

export const profileService: ProfileService = {
  getProfile: () => request<ProfileResp>({ method: 'GET', url: '/api/auth/profile' }),
  updateProfile: (data) => request<ProfileResp>({ method: 'PUT', url: '/api/auth/profile', data }),
  changePassword: (data) => request<void>({ method: 'PUT', url: '/api/auth/profile/password', data }),
  listOAuth2Bindings: () => request<OAuth2BindingListResp>({ method: 'GET', url: '/api/auth/profile/oauth2/bindings' }),
  bindOAuth2: (data) => request<string>({ method: 'POST', url: '/api/auth/profile/oauth2/bindings', data }),
  unbindOAuth2: (providerId) => request<boolean>({ method: 'DELETE', url: `/api/auth/profile/oauth2/bindings/${providerId}` }),
  pageLoginRecords: (data) => request<PageResp<LoginRecordResp>>({ method: 'POST', url: '/api/auth/profile/login-records/page', data }),
};
