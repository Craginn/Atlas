// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import Index from './Index';

afterEach(cleanup);

/**
 * useIsMobile reads window.innerWidth and matchMedia, neither of which jsdom
 * varies on its own — set both to simulate a phone vs. a desktop viewport.
 */
function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: width < 768,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  // The Docs view pulls in markdown content; nothing here needs the network.
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Index shell — mobile', () => {
  it('renders the drawer trigger at phone width and hides it on desktop', () => {
    setViewport(390);
    render(<Index />);
    expect(screen.queryByLabelText('Open navigation')).toBeTruthy();

    cleanup();
    setViewport(1440);
    render(<Index />);
    expect(screen.queryByLabelText('Open navigation')).toBeNull();
  });

  it('opens the nav drawer and closes it again via the close button', () => {
    setViewport(390);
    render(<Index />);

    // Closed initially: the explorer's nav items are not mounted.
    expect(screen.queryByRole('button', { name: 'Story Cards' })).toBeNull();

    fireEvent.click(screen.getByLabelText('Open navigation'));
    expect(screen.getByRole('button', { name: 'Story Cards' })).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Close navigation'));
    expect(screen.queryByRole('button', { name: 'Story Cards' })).toBeNull();
  });

  it('dismisses the drawer once a destination is chosen', () => {
    setViewport(390);
    render(<Index />);

    fireEvent.click(screen.getByLabelText('Open navigation'));
    fireEvent.click(screen.getByRole('button', { name: 'Story Cards' }));

    // Drawer gone, and the chosen view is now showing.
    expect(screen.queryByRole('button', { name: 'Story Cards' })).toBeNull();
    expect(screen.getByText(/Trigger Simulator/i)).toBeTruthy();
  });

  it('keeps the explorer docked (no drawer) on desktop', () => {
    setViewport(1440);
    render(<Index />);
    // Docked explorer is always mounted, and has no close affordance.
    expect(screen.getByRole('button', { name: 'Story Cards' })).toBeTruthy();
    expect(screen.queryByLabelText('Close navigation')).toBeNull();
  });
});
