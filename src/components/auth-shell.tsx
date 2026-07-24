import { Card, Typography } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';
import { useNebulaBrand } from '@/providers/brand-context';

interface AuthShellProps {
  children: ReactNode;
}

const useStyles = createStyles(({ token }) => ({
  root: {
    backgroundColor: token.colorBgLayout,
    padding: token.paddingLG,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  },
  header: {
    marginBottom: token.marginLG,
  },
  title: {
    margin: 0,
    color: token.colorTextHeading,
    textAlign: 'center' as const,
  },
}));

export function AuthShell({ children }: AuthShellProps) {
  const brand = useNebulaBrand();
  const { styles, cx } = useStyles();

  return (
    <div className={cx('flex min-h-dvh items-center justify-center', styles.root)}>
      <Card className={styles.card}>
        <div className={cx('flex items-center justify-center', styles.header)}>
          <Typography.Title level={3} className={styles.title}>
            {brand.name}
          </Typography.Title>
        </div>
        {children}
      </Card>
    </div>
  );
}
