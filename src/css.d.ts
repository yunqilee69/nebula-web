declare module '*.css' {
  const css: string;
  export default css;
}

declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react';

  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
