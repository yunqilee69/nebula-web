import { OrgTree } from '@/components/org-tree';
import type { OrgTreeResp } from '@/types/auth-management';

interface OrgTreePanelProps {
  tree: OrgTreeResp[];
  selectedKey?: string;
  onSelect: (orgId: string) => void;
}

export function OrgTreePanel({ tree, selectedKey, onSelect }: OrgTreePanelProps) {
  return (
    <OrgTree
      dataSource={tree}
      selectedKey={selectedKey}
      onSelect={(orgId) => onSelect(orgId)}
    />
  );
}