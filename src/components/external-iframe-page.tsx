interface ExternalIframePageProps {
  title: string;
  src: string;
}

export function ExternalIframePage({ title, src }: ExternalIframePageProps) {
  return (
    <iframe
      title={title}
      src={src}
      style={{ width: '100%', height: '100%', minHeight: 640, border: 0 }}
    />
  );
}
