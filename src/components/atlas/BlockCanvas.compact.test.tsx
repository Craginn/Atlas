// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import BlockCanvas from './BlockCanvas';
import { setLayoutMode, __resetLayoutModeForTests } from '@/hooks/use-layout-mode';
import { Script } from '@/types';

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  __resetLayoutModeForTests();
});

const script = (code: string): Script => ({
  id: 's1', name: 'Library', trigger: '', description: '', code, active: true,
});

function Harness({ initial }: { initial: string }) {
  const [scripts, setScripts] = useState<Script[]>([script(initial)]);
  return (
    <>
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
      <pre data-testid="code">{scripts[0].code}</pre>
    </>
  );
}

describe('BlockCanvas — compact layout', () => {
  it('drops the zoom controls, which have no meaning without the canvas transform', () => {
    setLayoutMode('desktop');
    render(<Harness initial="const a = 1;" />);
    expect(screen.queryByLabelText('Zoom in')).toBeTruthy();

    cleanup();
    setLayoutMode('mobile');
    render(<Harness initial="const a = 1;" />);
    expect(screen.queryByLabelText('Zoom in')).toBeNull();
  });

  it('offers reorder buttons in place of dragging, disabled at the ends', () => {
    setLayoutMode('mobile');
    render(<Harness initial={'const a = 1;\nconst b = 2;'} />);

    const up = screen.getAllByLabelText('Move block up');
    const down = screen.getAllByLabelText('Move block down');
    expect(up).toHaveLength(2);
    // Nothing above the first block, nothing below the last.
    expect((up[0] as HTMLButtonElement).disabled).toBe(true);
    expect((down[1] as HTMLButtonElement).disabled).toBe(true);
    expect((up[1] as HTMLButtonElement).disabled).toBe(false);
  });

  it('reordering rewrites the generated code, since order is what runs', () => {
    setLayoutMode('mobile');
    render(<Harness initial={'const a = 1;\nconst b = 2;'} />);

    const before = screen.getByTestId('code').textContent ?? '';
    expect(before.indexOf('const a')).toBeLessThan(before.indexOf('const b'));

    // Move the second block above the first.
    fireEvent.click(screen.getAllByLabelText('Move block up')[1]);

    const after = screen.getByTestId('code').textContent ?? '';
    expect(after.indexOf('const b')).toBeLessThan(after.indexOf('const a'));
  });

  it('keeps the canvas surface on desktop', () => {
    setLayoutMode('desktop');
    render(<Harness initial="const a = 1;" />);
    expect(screen.queryByLabelText('Move block up')).toBeNull();
    expect(screen.queryByLabelText('Reset view')).toBeTruthy();
  });
});
