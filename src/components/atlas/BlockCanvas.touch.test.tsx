// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import BlockCanvas from './BlockCanvas';
import { setLayoutMode, __resetLayoutModeForTests } from '@/hooks/use-layout-mode';
import { Script } from '@/types';

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  __resetLayoutModeForTests();
  // Touch support is a desktop-canvas concern; the compact layout has no canvas.
  setLayoutMode('desktop');
});

const script = (code: string): Script => ({
  id: 's1', name: 'Library', trigger: '', description: '', code, active: true,
});

function Harness({ initial }: { initial: string }) {
  const [scripts, setScripts] = useState<Script[]>([script(initial)]);
  return (
    <BlockCanvas
      scripts={scripts}
      setScripts={setScripts}
      activeScriptId="s1"
      setActiveScriptId={() => {}}
      simInput=""
      worldState={{} as never}
      knowledgeBase={{
        aiInstructions: '', plotEssentials: '', storySummary: '',
        memoryBank: '', recentHistory: '', authorsNote: '', storyCards: [],
      }}
      onApplyStoryCards={() => {}}
    />
  );
}

/**
 * jsdom implements neither TouchEvent nor Touch, and fireEvent.touchMove won't
 * reach a listener registered on `window` with addEventListener. Both are built
 * by hand: a plain Event with the `touches` array attached.
 */
function touchList(points: { x: number; y: number }[]) {
  return points.map(p => ({ clientX: p.x, clientY: p.y })) as unknown as TouchList;
}

// Dispatched straight at `window`, so it lands outside React's event system —
// `act` is what flushes the resulting state update before we assert.
function dispatchTouch(type: 'touchmove' | 'touchend', points: { x: number; y: number }[]) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'touches', { value: touchList(points) });
  act(() => {
    window.dispatchEvent(ev);
  });
  return ev;
}

/** The zoom readout is the only rendered view of the transform. */
const zoomPercent = () => screen.getByText(/^\d+%$/).textContent;

describe('BlockCanvas — touch input', () => {
  it('pans the canvas with one finger on the background', () => {
    render(<Harness initial="const a = 1;" />);
    const canvas = document.querySelector('.cursor-grab') as HTMLElement;

    // Pan is only visible via the background-position the grid is drawn at.
    const before = canvas.style.backgroundPosition;
    fireEvent.touchStart(canvas, { touches: [{ clientX: 100, clientY: 100 }] });
    dispatchTouch('touchmove', [{ x: 160, y: 140 }]);

    expect(canvas.style.backgroundPosition).not.toBe(before);
  });

  it('pinching two fingers apart zooms in, and together zooms out', () => {
    render(<Harness initial="const a = 1;" />);
    const canvas = document.querySelector('.cursor-grab') as HTMLElement;
    expect(zoomPercent()).toBe('100%');

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 100 }],
    });
    // Same midpoint, double the separation.
    dispatchTouch('touchmove', [{ x: 50, y: 100 }, { x: 250, y: 100 }]);
    expect(zoomPercent()).toBe('200%');

    dispatchTouch('touchend', []);

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 50, clientY: 100 }, { clientX: 250, clientY: 100 }],
    });
    dispatchTouch('touchmove', [{ x: 150, y: 100 }, { x: 150, y: 100 }]);
    // Fingers together is zero distance — clamped to the floor, not NaN.
    expect(zoomPercent()).toBe('30%');
  });

  it('snaps to a round zoom on release when the pinch lands close to one', () => {
    render(<Harness initial="const a = 1;" />);
    const canvas = document.querySelector('.cursor-grab') as HTMLElement;

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 100 }],
    });
    // 100px → 97px of separation, i.e. 97% — untouched while the pinch is live.
    dispatchTouch('touchmove', [{ x: 100, y: 100 }, { x: 197, y: 100 }]);
    expect(zoomPercent()).toBe('97%');

    dispatchTouch('touchend', []);
    expect(zoomPercent()).toBe('100%');
  });

  it('leaves a zoom that is deliberately between stops alone', () => {
    render(<Harness initial="const a = 1;" />);
    const canvas = document.querySelector('.cursor-grab') as HTMLElement;

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 100 }],
    });
    // 88% is outside the tolerance of both 75% and 100%.
    dispatchTouch('touchmove', [{ x: 100, y: 100 }, { x: 188, y: 100 }]);
    dispatchTouch('touchend', []);

    expect(zoomPercent()).toBe('88%');
  });

  it('clamps pinch zoom to the same bounds as the buttons', () => {
    render(<Harness initial="const a = 1;" />);
    const canvas = document.querySelector('.cursor-grab') as HTMLElement;

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 100 }],
    });
    // 10x the separation would be 1000% without a clamp.
    dispatchTouch('touchmove', [{ x: 0, y: 100 }, { x: 1000, y: 100 }]);
    expect(zoomPercent()).toBe('200%');
  });

  it('preventDefault on a drag move, so the page does not scroll underneath', () => {
    render(<Harness initial="const a = 1;" />);
    const canvas = document.querySelector('.cursor-grab') as HTMLElement;

    // No gesture in flight: the page keeps its normal scrolling.
    expect(dispatchTouch('touchmove', [{ x: 10, y: 10 }]).defaultPrevented).toBe(false);

    fireEvent.touchStart(canvas, { touches: [{ clientX: 100, clientY: 100 }] });
    expect(dispatchTouch('touchmove', [{ x: 120, y: 120 }]).defaultPrevented).toBe(true);
  });

  it('drags a block by touch and re-emits code on release', () => {
    render(<Harness initial="const a = 1;" />);
    const block = document.querySelector('.absolute.w-\\[560px\\]') as HTMLElement;
    expect(block.style.top).toBe('0px');

    fireEvent.touchStart(block, { touches: [{ clientX: 0, clientY: 0 }] });
    dispatchTouch('touchmove', [{ x: 0, y: 120 }]);

    expect(block.style.top).toBe('120px');
  });

  it('does not start a block drag from a field, which would steal the tap', () => {
    render(<Harness initial="const a = 1;" />);
    const block = document.querySelector('.absolute.w-\\[560px\\]') as HTMLElement;
    const input = block.querySelector('input') as HTMLElement;

    fireEvent.touchStart(input, { touches: [{ clientX: 0, clientY: 0 }] });
    dispatchTouch('touchmove', [{ x: 0, y: 120 }]);

    expect(block.style.top).toBe('0px');
  });
});
