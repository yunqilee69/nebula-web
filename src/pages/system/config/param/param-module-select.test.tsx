import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dictService } from '@/services/dict';
import type { SystemParamDetailResp } from '@/types/param';
import {
  createParamService,
  enabledFeatureItem,
  featureFlagDictType,
  getModalByTitle,
  getSelectTrigger,
  paramRecord,
  renderParamManagementPage,
  systemModuleItem,
} from './index.test-helpers';

vi.mock('@/services/dict', () => ({
  dictService: {
    pageTypes: vi.fn(),
    listItemsByCode: vi.fn(),
  },
}));

const pageTypes = vi.mocked(dictService.pageTypes);
const listItemsByCode = vi.mocked(dictService.listItemsByCode);
const PARAM_MODULE_DICT_CODE = 'param_module';

describe('ParamManagementPage module selector', () => {
  beforeEach(() => {
    pageTypes.mockResolvedValue({ data: [featureFlagDictType], total: 1 });
    listItemsByCode.mockImplementation((dictCode) => {
      if (dictCode === PARAM_MODULE_DICT_CODE) return Promise.resolve([systemModuleItem]);
      if (dictCode === featureFlagDictType.code) return Promise.resolve([enabledFeatureItem]);
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    cleanup();
    pageTypes.mockReset();
    listItemsByCode.mockReset();
  });

  it('renders module code as a Select loaded from the param_module dictionary', async () => {
    const user = userEvent.setup();
    renderParamManagementPage();

    await user.click(await screen.findByRole('button', { name: /新增参数/ }));
    await waitFor(() => expect(getModalByTitle('新增参数')).toBeInTheDocument());
    const modal = getModalByTitle('新增参数');

    await waitFor(() => expect(listItemsByCode).toHaveBeenCalledWith(PARAM_MODULE_DICT_CODE));
    await user.click(getSelectTrigger(modal, 'moduleCode'));

    expect(await screen.findByText('System Module')).toBeInTheDocument();
  });

  it('keeps an existing detail module value visible when it is not in loaded options', async () => {
    const user = userEvent.setup();
    const detail: SystemParamDetailResp = {
      ...paramRecord,
      moduleCode: 'legacy-module',
      paramName: 'Legacy Module Param',
      paramValue: 'legacy-secret',
    };
    const service = createParamService({ getParam: vi.fn().mockResolvedValue(detail) });
    renderParamManagementPage(service);

    await screen.findByText('security.token');
    await user.click(screen.getByRole('button', { name: /编辑/ }));
    await waitFor(() => expect(getModalByTitle('编辑参数')).toBeInTheDocument());
    const modal = getModalByTitle('编辑参数');

    await waitFor(() => expect(listItemsByCode).toHaveBeenCalledWith(PARAM_MODULE_DICT_CODE));
    await user.click(getSelectTrigger(modal, 'moduleCode'));

    expect(await screen.findByRole('option', { name: 'legacy-module' })).toBeInTheDocument();
  });

  it.each([
    ['loading fails', () => Promise.reject(new Error('param module dictionary missing'))],
    ['no usable options load', () => Promise.resolve([{ ...systemModuleItem, itemValue: '   ' }])],
  ])('shows a modal error when param_module %s', async (_caseName, loadParamModules) => {
    const user = userEvent.setup();
    const modalError = vi.spyOn(Modal, 'error').mockImplementation(() => ({
      destroy: vi.fn(),
      update: vi.fn(),
    }));
    listItemsByCode.mockImplementation((dictCode) => {
      if (dictCode === PARAM_MODULE_DICT_CODE) return loadParamModules();
      if (dictCode === featureFlagDictType.code) return Promise.resolve([enabledFeatureItem]);
      return Promise.resolve([]);
    });
    renderParamManagementPage();

    await user.click(await screen.findByRole('button', { name: /新增参数/ }));

    await waitFor(() => expect(listItemsByCode).toHaveBeenCalledWith(PARAM_MODULE_DICT_CODE));
    await waitFor(() => {
      expect(modalError).toHaveBeenCalledWith(expect.objectContaining({
        content: '请先配置可用的参数模块字典项',
      }));
    });
    modalError.mockRestore();
  });
});
