import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NebulaProvider } from './nebula-provider';

function getFavicon(): HTMLLinkElement | null {
  return document.head.querySelector('link[rel="icon"]');
}

describe('NebulaProvider brand metadata', () => {
  afterEach(() => {
    document.title = '';
    getFavicon()?.remove();
    document.head.querySelector('[data-nebula-viewport-style]')?.remove();
  });

  it('syncs document title from brand title', async () => {
    render(<NebulaProvider brand={{ name: 'Acme', title: 'Acme Console' }}>content</NebulaProvider>);

    await waitFor(() => {
      expect(document.title).toBe('Acme Console');
    });
  });

  it('syncs favicon href from brand faviconHref', async () => {
    render(<NebulaProvider brand={{ faviconHref: '/acme.svg' }}>content</NebulaProvider>);

    await waitFor(() => {
      expect(getFavicon()).toHaveAttribute('href', '/acme.svg');
    });
  });

  it('installs viewport reset styles for app shell layouts', () => {
    render(<NebulaProvider>content</NebulaProvider>);

    const style = document.head.querySelector('[data-nebula-viewport-style]');
    expect(style).toHaveTextContent('html, body, #root');
    expect(style).toHaveTextContent('margin: 0');
    expect(style).toHaveTextContent('overflow: hidden');
  });
});
