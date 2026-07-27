import { Flex } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { authManagementService as defaultAuthManagementService } from '@/api/auth-management';
import type { AuthManagementService } from '@/api/auth-management';
import type { OrgOptionResp, OrgResp, OrgTreeResp } from '@/types/auth-management';
import {
  OrgFormDrawer,
  buildCreatePayload,
  buildUpdatePayload,
  type OrgDrawerFormValues,
} from './components/org-form-drawer';
import { OrgFormModal } from './components/org-form-modal';
import { OrgTable, type OrgTableHandle } from './components/org-table';
import { OrgTreePanel } from './components/org-tree-panel';

export interface OrgManagementPageProps {
  service?: AuthManagementService;
}

export function OrgManagementPage({ service: serviceProp }: OrgManagementPageProps) {
  const service = serviceProp ?? defaultAuthManagementService;
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const tableRef = useRef<OrgTableHandle>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string>();
  const [drawerInitialValues, setDrawerInitialValues] = useState<Partial<OrgDrawerFormValues>>();
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);
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

  const openCreateModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const openUpdateDrawer = useCallback(
    async (record: OrgResp) => {
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

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingOrgId(undefined);
    setDrawerInitialValues(undefined);
  }, []);

  const handleModalSubmit = useCallback(
    async (values: OrgDrawerFormValues) => {
      setModalSubmitting(true);
      try {
        await service.createOrg(buildCreatePayload(values));
        notice.success(t('auth.orgManagement.feedback.createSuccess'));
        closeModal();
        await refreshTreeAndOrgs();
        await tableRef.current?.reload();
      } catch (error: unknown) {
        notice.error(t('auth.orgManagement.feedback.createFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Org create failed', message);
      } finally {
        setModalSubmitting(false);
      }
    },
    [closeModal, notice, refreshTreeAndOrgs, service, t],
  );

  const handleDrawerSubmit = useCallback(
    async (values: OrgDrawerFormValues) => {
      if (!editingOrgId) return;
      setDrawerSubmitting(true);
      try {
        await service.updateOrg(buildUpdatePayload(editingOrgId, values));
        notice.success(t('auth.orgManagement.feedback.updateSuccess'));
        closeDrawer();
        await refreshTreeAndOrgs();
        await tableRef.current?.reload();
      } catch (error: unknown) {
        notice.error(t('auth.orgManagement.feedback.updateFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Org update failed', message);
      } finally {
        setDrawerSubmitting(false);
      }
    },
    [closeDrawer, editingOrgId, notice, refreshTreeAndOrgs, service, t],
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
            onCreate={openCreateModal}
            onEdit={(record) => void openUpdateDrawer(record)}
          />
        </div>
      </Flex>
      <OrgFormModal
        open={modalOpen}
        title={t('auth.orgManagement.modal.createTitle')}
        submitting={modalSubmitting}
        orgs={orgs}
        onClose={closeModal}
        onSubmit={(values) => void handleModalSubmit(values)}
      />
      <OrgFormDrawer
        open={drawerOpen}
        title={t('auth.orgManagement.modal.editTitle')}
        initialValues={drawerInitialValues}
        submitting={drawerSubmitting || detailLoading}
        orgs={orgs}
        onClose={closeDrawer}
        onSubmit={(values) => void handleDrawerSubmit(values)}
      />
    </>
  );
}

export default OrgManagementPage;
