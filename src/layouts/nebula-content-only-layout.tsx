import { Layout, theme as antdTheme } from 'antd';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;

interface NebulaContentOnlyLayoutProps {
  children?: ReactNode;
}

export function NebulaContentOnlyLayout({ children }: NebulaContentOnlyLayoutProps) {
  const { token } = antdTheme.useToken();

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content
        role="main"
        style={{
          minHeight: 0,
          padding: token.paddingLG,
          background: token.colorBgLayout,
        }}
      >
        {children ?? <Outlet />}
      </Content>
    </Layout>
  );
}
