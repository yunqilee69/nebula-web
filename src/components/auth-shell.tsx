import { Card, Flex, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { useNebulaBrand } from '@/app/brand-context';

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  const { token } = theme.useToken();
  const brand = useNebulaBrand();

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        backgroundColor: token.colorBgLayout,
        padding: token.paddingLG,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
        }}
      >
        <Flex vertical align="center" style={{ marginBottom: token.marginLG }}>
          <Typography.Title
            level={3}
            style={{
              margin: 0,
              color: token.colorTextHeading,
              textAlign: 'center',
            }}
          >
            {brand.name}
          </Typography.Title>
        </Flex>
        {children}
      </Card>
    </Flex>
  );
}
