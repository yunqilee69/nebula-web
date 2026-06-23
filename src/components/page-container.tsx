import { theme as antdTheme } from 'antd';
import type { PropsWithChildren } from 'react';

type PageContainerProps = PropsWithChildren;

export function PageContainer({ children }: PageContainerProps) {
  const { token } = antdTheme.useToken();

  return (
    <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          background: token.colorBgLayout,
      }}
    >
      {children}
    </div>
  );
}
