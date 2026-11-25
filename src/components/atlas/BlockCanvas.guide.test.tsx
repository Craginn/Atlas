// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import BlockCanvas from './BlockCanvas';
import { Script } from '@/types';

afterEach(cleanup);

function Harness({ name, initial }: { name: string; initial: string }) {
  const [scripts, setScripts] = useState<Script[]>([
    { id: 's1', name, trigger: '', description: '', code: initial, active: true },
  ]);
  return (
    <>
      <BlockCanvas
        scripts={scripts}
        setScripts={setScripts}
        activeScriptId="s1"
        setActiveScriptId={() => {}}
        simInput="you draw a sword"
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

const bigLibrary = Array.from({ length: 30 }, (_, i) => `function helper${i}(x) {\n  return x + ${i};\n}`).join('\n');

describe('BlockCanvas for large scripts', () => {
  // Renders 30 blocks in jsdom; under a full parallel test run that can exceed the 5 s default.
  it('starts a big script with an empty canvas and a searchable outline', { timeout: 20_000 }, () => {
    render(<Harness name="Library" initial={bigLibrary} />);
    expect(screen.getByText('This script has 30 blocks.')).toBeTruthy();
    // Nothing drawn: no block chips on the canvas.
    expect(screen.queryAllByText('Function')).toHaveLength(0);
    // The outline lists them all and filters by search.
    expect(screen.getByText('helper29')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Find a block…'), { target: { value: 'helper17' } });
    expect(screen.queryByText('helper3')).toBeNull();
    // Opening one draws just that block.
    fireEvent.click(screen.getByText('helper17'));
    expect(screen.getAllByText('Function')).toHaveLength(1);
    expect(screen.getByText('A reusable function helper17(x)')).toBeTruthy();
    // The block it opened can still be collapsed (it used to be pinned open).
    fireEvent.click(screen.getByLabelText('Collapse block'));
    expect(screen.getByText('1 step(s) hidden')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Expand block'));
    expect(screen.queryByText('1 step(s) hidden')).toBeNull();
  });
});

describe('BlockCanvas guidance', () => {
  it('describes blocks in plain words', () => {
    render(<Harness name="Input Modifier" initial={'const modifier = (text) => {\n  state.gold += 5;\n  return { text };\n};\nmodifier(text);'} />);
    expect(screen.getByText('Add 5 to saved value gold')).toBeTruthy();
    expect(screen.getByText('Hand the text back to AI Dungeon')).toBeTruthy();
  });

  it('suggests the hook template for an empty hook, and adding it writes a working hook', () => {
    render(<Harness name="Input Modifier" initial="" />);
    fireEvent.click(screen.getByText(/^Help/));
    expect(screen.getByText('Start from the hook template')).toBeTruthy();
    fireEvent.click(screen.getByText('Add it'));
    expect(screen.getByTestId('code').textContent).toBe('const modifier = (text) => {\n  return { text };\n};\n\nmodifier(text);');
  });

  it('fills a condition from a plain-language recipe', () => {
    render(<Harness name="Input Modifier" initial={'if (true) {\n  log(1);\n}'} />);
    fireEvent.click(screen.getAllByLabelText('Open the recipe helper')[0]); // the If's condition
    fireEvent.click(screen.getByText("The player's text contains a word"));
    fireEvent.change(screen.getByPlaceholderText('sword'), { target: { value: 'Dragon' } });
    fireEvent.click(screen.getByText('Use this'));
    expect(screen.getByTestId('code').textContent).toContain('if (text.toLowerCase().includes("dragon")) {');
    // Shown on the block and as its outline row.
    expect(screen.getAllByText('If the text contains "dragon"').length).toBeGreaterThan(0);
  });
});
