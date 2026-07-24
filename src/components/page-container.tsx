import { createStyles } from 'antd-style';
import type { PropsWithChildren } from 'react';

type PageContainerProps = PropsWithChildren;

const useStyles = createStyles(({ token }) => ({
  root: {
    boxSizing: 'border-box' as const,
    background: token.colorBgLayout,
  },
}));

export function PageContainer({ children }: PageContainerProps) {
  const { styles, cx } = useStyles();

  return (
    <div className={cx('flex h-full min-h-0 w-full flex-col', styles.root)}>
      {children}
    </div>
  );
}
