import { Flex } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { authManagementService as defaultAuthManagementService } from '@/services/auth-management';
import type { AuthManagementService } from '@/services/auth-management';
import type { OrgOptionResp, OrgResp, OrgTreeResp } from '@/types/auth-management';
import {
  OrgFormDrawer,
  buildCreatePayload,
  buildUpdatePayload,
  type OrgDrawerFormValues,
} from './components/org-form-drawer';
import { OrgTable, type OrgTableHandle } from './components/org-table';
import { OrgTreePanel } from './components/org-tree-panel';

export interface OrgManagementPageProps {
  service?: AuthManagementService;
}

type DrawerMode = 'create' | 'update';

export function OrgManagementPage({ service: serviceProp }: OrgManagementPageProps) {
  const service = serviceProp ?? defaultAuthManagementService;
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const tableRef = useRef<OrgTableHandle>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [drawerTitle, setDrawerTitle] = useState(t('auth.orgManagement.modal.createTitle'));
  const [editingOrgId, setEditingOrgId] = useState<string>();
  const [drawerInitialValues, setDrawerInitialValues] = useState<Partial<OrgDrawerFormValues>>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [tree, setTree] = useState<OrgTreeResp[]>([]);
  const [orgs, setOrgs] = useState<OrgOptionResp[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    service.getOrgTree().then(
      (data) => { if (!cancelled) setTree(data); },
      (error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.orgManagement.feedback.treeLoadFailed'));
          console.error('Failed to load org tree', error instanceof Error ? error.message : String(error));
        }
      },
    );
    service.listOrgs().then(
      (data) => { if (!cancelled) setOrgs(data); },
      (error: unknown) => {
        if (!cancelled) {
          notice.error(t('auth.orgManagement.feedback.listLoadFailed'));
          console.error('Failed to load org list', error instanceof Error ? error.message : String(error));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [service, notice, t]);

  const refreshTreeAndOrgs = useCallback(async () => {
    try {
      const [nextTree, nextOrgs] = await Promise.all([service.getOrgTree(), service.listOrgs()]);
      setTree(nextTree);
      setOrgs(nextOrgs);
    } catch (error: unknown) {
      notice.error(t('auth.orgManagement.feedback.refreshFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to refresh org tree/orgs', message);
    }
  }, [service, notice, t]);

  const openCreateDrawer = useCallback(() => {
    setDrawerMode('create');
    setDrawerTitle(t('auth.orgManagement.modal.createTitle'));
    setEditingOrgId(undefined);
    setDrawerInitialValues(undefined);
    setDrawerOpen(true);
  }, [t]);

  const openUpdateDrawer = useCallback(
    async (record: OrgResp) => {
      setDrawerMode('update');
      setDrawerTitle(t('auth.orgManagement.modal.editTitle'));
      setEditingOrgId(record.id);
      setDrawerInitialValues(undefined);
      setDrawerOpen(true);
      setDetailLoading(true);
      try {
        const detail = await service.getOrgDetail(record.id);
        setDrawerInitialValues({
          name: detail.name,
          code: detail.code,
          parentId: detail.parentId,
          type: detail.type,
          status: detail.status,
        });
      } catch (error: unknown) {
        notice.error(t('auth.orgManagement.feedback.detailLoadFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to load org detail', message);
        setDrawerOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [service, notice, t],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingOrgId(undefined);
    setDrawerInitialValues(undefined);
  }, []);

  const handleSubmit = useCallback(
    async (values: OrgDrawerFormValues) => {
      setSubmitting(true);
      try {
        if (drawerMode === 'create') {
          await service.createOrg(buildCreatePayload(values));
          notice.success(t('auth.orgManagement.feedback.createSuccess'));
        } else if (editingOrgId) {
          await service.updateOrg(buildUpdatePayload(editingOrgId, values));
          notice.success(t('auth.orgManagement.feedback.updateSuccess'));
        }
        closeDrawer();
        await refreshTreeAndOrgs();
        await tableRef.current?.reload();
      } catch (error: unknown) {
        notice.error(drawerMode === 'create' ? t('auth.orgManagement.feedback.createFailed') : t('auth.orgManagement.feedback.updateFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Org submit failed', message);
      } finally {
        setSubmitting(false);
      }
    },
    [closeDrawer, drawerMode, editingOrgId, notice, refreshTreeAndOrgs, service, t],
  );

  return (
    <>
      <Flex gap={16} style={{ height: '100%' }}>
        <div style={{ flex: '0 0 280px' }}>
          <OrgTreePanel tree={tree} selectedKey={selectedOrgId} onSelect={setSelectedOrgId} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <OrgTable
            ref={tableRef}
            service={service}
            parentId={selectedOrgId}
            onCreate={openCreateDrawer}
            onEdit={(record) => void openUpdateDrawer(record)}
          />
        </div>
      </Flex>
      <OrgFormDrawer
        open={drawerOpen}
        title={drawerTitle}
        initialValues={drawerInitialValues}
        submitting={submitting || detailLoading}
        orgs={orgs}
        onClose={closeDrawer}
        onSubmit={(values) => void handleSubmit(values)}
      />
    </>
  );
}

export default OrgManagementPage;
