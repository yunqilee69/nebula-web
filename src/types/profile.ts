export interface PageResp<T> {
  data: T[];
  total: number;
}

export interface ProfileResp {
  id: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status?: number;
  createTime?: string;
}

export interface UpdateProfileReq {
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface OAuth2BindingResp {
  providerId: string;
  providerName?: string;
  bound: boolean;
  providerUserId?: string;
  linkedAt?: string;
}

export interface OAuth2BindingListResp {
  providers: OAuth2BindingResp[];
}

export interface BindOAuth2Req {
  providerId: string;
  code: string;
  state: string;
}

export interface LoginRecordPageReq {
  pageNum: number;
  pageSize: number;
}

export interface LoginRecordResp {
  id: string;
  loginType?: string;
  loginIp?: string;
  ip?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  location?: string;
  loginTime?: string;
  success?: boolean;
  successFlag?: boolean;
  failReason?: string;
}
