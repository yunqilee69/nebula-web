import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageContainer } from './page-container';

describe('PageContainer styling', () => {
  it('uses Tailwind layout utilities for the page shell', () => {
    const { container } = render(
      <PageContainer>
        <h1>Content</h1>
      </PageContainer>,
    );

    const page = container.firstElementChild;

    expect(page).toHaveClass('flex', 'h-full', 'min-h-0', 'w-full', 'flex-col');
    expect(screen.getByRole('heading', { name: 'Content' })).toBeInTheDocument();
  });
});
