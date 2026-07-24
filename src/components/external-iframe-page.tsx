import styles from './external-iframe-page.module.css';

interface ExternalIframePageProps {
  title: string;
  src: string;
}

export function ExternalIframePage({ title, src }: ExternalIframePageProps) {
  return (
    <iframe
      title={title}
      src={src}
      className={styles.frame}
    />
  );
}
