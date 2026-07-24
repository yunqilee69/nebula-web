import { useCallback, useEffect, useMemo, useState } from 'react';
import { Col, Row, Spin } from 'antd';
import { PageContainer } from '@/components/page-container';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { permissionService as defaultPermissionService } from '@/services/permission';
import type { PermissionService } from '@/services/permission';
import type { PermissionDraftEffect, PermissionResourceGroup, PermissionSubject, PermissionSubjectType } from '@/types/permission';
import { createEffectMap, toSaveItems, type ResourceEffectMap } from './components/permission-page-shared';
import { ResourcePanel } from './components/resource-panel';
import { SubjectPanel } from './components/subject-panel';

export interface PermissionConfigPageProps {
  service?: PermissionService;
}

export function PermissionConfigPage({ service: serviceProp }: PermissionConfigPageProps) {
  const service = serviceProp ?? defaultPermissionService;
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState<PermissionSubjectType>('ORG');
  const [subjectKeyword, setSubjectKeyword] = useState('');
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [orgs, setOrgs] = useState<PermissionSubject[]>([]);
  const [roles, setRoles] = useState<PermissionSubject[]>([]);
  const [users, setUsers] = useState<PermissionSubject[]>([]);
  const [resources, setResources] = useState<PermissionResourceGroup[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<PermissionSubject>();
  const [effectMap, setEffectMap] = useState<ResourceEffectMap>({});

  useEffect(() => {
    let mounted = true;

    Promise.all([service.listSubjects(), service.listResourceGroups()])
      .then(([subjects, groups]) => {
        if (!mounted) return;
        setOrgs(subjects.orgs);
        setRoles(subjects.roles);
        setUsers(subjects.users);
        setResources(groups);
        setSelectedSubject(subjects.orgs[0] ?? subjects.roles[0] ?? subjects.users[0]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [service]);

  useEffect(() => {
    if (!selectedSubject) return;

    let mounted = true;

    service
      .pageSubjectPermissions({ subjectType: selectedSubject.type, subjectId: selectedSubject.id })
      .then((page) => {
        if (mounted) setEffectMap(createEffectMap(page.data));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        notice.error(t('auth.permissionConfig.feedback.loadFailed'));
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to load subject permissions', message);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSubject, service, notice, t]);

  const currentSubjects = useMemo(() => ({ orgs, roles, users }), [orgs, roles, users]);

  const handleSave = useCallback(async () => {
    if (!selectedSubject) return;

    setSaving(true);
    try {
      await service.saveSubjectPermissions({
        subjectType: selectedSubject.type,
        subjectId: selectedSubject.id,
        permissions: toSaveItems(effectMap),
      });
      notice.success(t('auth.permissionConfig.feedback.saveSuccess'));
    } finally {
      setSaving(false);
    }
  }, [selectedSubject, service, effectMap, notice, t]);

  const handleBulkEffectChange = useCallback(
    (effect: PermissionDraftEffect) => {
      const next: ResourceEffectMap = {};
      resources.forEach((group) => {
        group.menus.forEach((menu) => {
          next[`MENU:${menu.id}`] = effect;
          menu.buttons.forEach((button) => {
            next[`BUTTON:${button.id}`] = effect;
          });
        });
      });
      setEffectMap(next);
    },
    [resources],
  );

  if (loading) {
    return <Spin />;
  }

  return (
    <PageContainer>
      <Row gutter={16} align="top">
        <Col xs={24} lg={7} xl={6}>
          <SubjectPanel
            activeType={activeType}
            keyword={subjectKeyword}
            orgSubjects={currentSubjects.orgs}
            roleSubjects={currentSubjects.roles}
            userSubjects={currentSubjects.users}
            selectedSubject={selectedSubject}
            onTypeChange={(type) => {
              setActiveType(type);
              setSubjectKeyword('');
            }}
            onKeywordChange={setSubjectKeyword}
            onSelect={setSelectedSubject}
          />
        </Col>
        <Col xs={24} lg={17} xl={18}>
          <ResourcePanel
            keyword={resourceKeyword}
            groups={resources}
            effectMap={effectMap}
            saving={saving}
            onKeywordChange={setResourceKeyword}
            onEffectChange={(key, effect) => setEffectMap((prev) => ({ ...prev, [key]: effect }))}
            onBulkEffectChange={handleBulkEffectChange}
            onSave={handleSave}
          />
        </Col>
      </Row>
    </PageContainer>
  );
}

export default PermissionConfigPage;
