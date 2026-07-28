import type { NebulaPageReq } from '@/components/nebula-pro-table/params';

export const DataType = {
  STRING: 'STRING',
  INT: 'INT',
  DOUBLE: 'DOUBLE',
  BOOLEAN: 'BOOLEAN',
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE',
} as const;

export type DataType = (typeof DataType)[keyof typeof DataType];

export interface SystemParamDetailResp {
  id?: string;
  paramKey?: string;
  paramName?: string;
  description?: string;
  paramValue?: string;
  dataType?: DataType;
  optionCode?: string;
  moduleCode?: string;
  builtin?: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface SystemParamResp {
  id?: string;
  paramKey?: string;
  paramName?: string;
  description?: string;
  dataType?: DataType;
  moduleCode?: string;
  createTime?: string;
  updateTime?: string;
}

export interface SystemParamPageReq extends NebulaPageReq {
  paramKey?: string;
  paramName?: string;
  dataType?: DataType;
  moduleCode?: string;
}

export interface CreateSystemParamReq {
  paramKey: string;
  paramName: string;
  description?: string;
  paramValue?: string;
  dataType?: DataType;
  optionCode?: string;
  moduleCode?: string;
  builtin?: boolean;
}

export interface UpdateSystemParamReq {
  paramName: string;
  description?: string;
  paramValue?: string;
  dataType?: DataType;
  optionCode?: string;
  moduleCode?: string;
}

export interface ParamValueUpdateReq {
  paramKey: string;
  paramValue?: string;
}

export interface ParamValueUpdateResultResp {
  paramKey?: string;
  success?: boolean;
  message?: string;
}

export interface BatchUpdateResultResp {
  successCount?: number;
  failCount?: number;
  results?: ParamValueUpdateResultResp[];
}
