// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import BlockCanvas from './BlockCanvas';
import { Script } from '@/types';

afterEach(cleanup);

const script = (code: string): Script => ({
  id: 's1', name: 'Library', trigger: '', description: '', code, active: true,
});

/**
 * The canvas owns block state but pushes generated code up via setScripts.
 * This harness holds that state so we can assert on what the editor would save.
 */
function Harness({ initial, onCode }: { initial: string; onCode?: (c: string) => void }) {
  const [scripts, setScripts] = useState<Script[]>([script(initial)]);
  const [activeId, setActiveId] = useState('s1');
  return (
    <>
      <BlockCanvas
        scripts={scripts}
        setScripts={next => {
          setScripts(next);
          onCode?.(next[0].code);
        }}
        activeScriptId={activeId}
        setActiveScriptId={setActiveId}
        simInput="you draw a sword"
        worldState={{} as never}
        knowledgeBase={{
          aiInstructions: '', plotEssentials: 'A ruined keep.', storySummary: '',
          memoryBank: '', recentHistory: '', authorsNote: '', storyCards: [],
        }}
        onApplyStoryCards={() => {}}
      />
      <pre data-testid="code">{scripts[0].code}</pre>
    </>
  );
}

describe('BlockCanvas', () => {
  it('turns uploaded code into blocks', () => {
    render(<Harness initial={'if (a) {\n  log("hi");\n}'} />);
    // The If becomes a box, and the nested call becomes a box inside it.
    expect(screen.getByText('If')).toBeTruthy();
    expect(screen.getByText('Do')).toBeTruthy();
    expect((screen.getByDisplayValue('a') as HTMLInputElement).value).toBe('a');
    expect(screen.getByDisplayValue('log("hi")')).toBeTruthy();
  });

  it('shows nested slots so blocks can contain blocks', () => {
    render(<Harness initial={'if (a) {\n  log("hi");\n}'} />);
    expect(screen.getByText('Then')).toBeTruthy();
    // The nested "add step" affordance is what populates a section on request.
    expect(screen.getAllByText('add step').length).toBeGreaterThan(0);
  });

  it('writes edited fields back out as code', () => {
    render(<Harness initial={'if (a) {\n  log("hi");\n}'} />);
    fireEvent.change(screen.getByDisplayValue('a'), { target: { value: 'b > 2' } });
    expect(screen.getByTestId('code').textContent).toContain('if (b > 2)');
  });

  it('adds a block from the palette into a nested slot', () => {
    render(<Harness initial={'if (a) {\n}'} />);
    fireEvent.click(screen.getAllByText('add step')[0]);
    fireEvent.click(screen.getByText('Log a message'));

    const code = screen.getByTestId('code').textContent ?? '';
    expect(code).toContain('log("message")');
    // It must land *inside* the if, not after it.
    expect(code.indexOf('log("message")')).toBeGreaterThan(code.indexOf('if (a)'));
    expect(code.trim().endsWith('}')).toBe(true);
  });

  it('adds a top-level block when no slot is targeted', () => {
    render(<Harness initial={'log("first");'} />);
    fireEvent.click(screen.getByText('Add Block'));
    fireEvent.click(screen.getByText('Return the text'));
    expect(screen.getByTestId('code').textContent).toContain('return { text };');
  });

  it('preserves unparseable code instead of blanking the script', () => {
    const broken = 'function nope( {';
    render(<Harness initial={broken} />);
    expect(screen.getByText(/shown as raw code/)).toBeTruthy();
    expect(screen.getByDisplayValue(broken)).toBeTruthy();
  });

  it('deletes a block', () => {
    render(<Harness initial={'log("a");\nlog("b");'} />);
    const deletes = screen.getAllByLabelText('Delete block');
    fireEvent.click(deletes[0]);
    const code = screen.getByTestId('code').textContent ?? '';
    expect(code).not.toContain('log("a")');
    expect(code).toContain('log("b")');
  });

  // ---------------------------------------------------------- scratch run order
  it('numbers blocks by the order they were picked, not their canvas order', () => {
    render(<Harness initial={'log("a");\nlog("b");'} />);
    const badges = screen.getAllByLabelText('Add to run order');
    expect(badges).toHaveLength(2);

    fireEvent.click(badges[1]); // pick the *second* block first
    fireEvent.click(screen.getAllByLabelText('Add to run order')[0]);

    // Click order is run order, which is what makes the ordering user-controlled.
    expect(screen.getByLabelText(/currently step 1/)).toBeTruthy();
    expect(screen.getByLabelText(/currently step 2/)).toBeTruthy();
    const second = screen.getByLabelText('Remove from run order (currently step 1)');
    expect(second.textContent).toBe('1');
  });

  it('drops a deleted block out of the run order', () => {
    render(<Harness initial={'log("a");\nlog("b");'} />);
    fireEvent.click(screen.getAllByLabelText('Add to run order')[0]);
    expect(screen.getByText('Run (1)')).toBeTruthy();

    fireEvent.click(screen.getAllByLabelText('Delete block')[0]);
    // A stale id would otherwise keep the count at 1 and resolve to nothing.
    expect(screen.getByText('Run')).toBeTruthy();
  });

  it('offers raw JavaScript as a nestable block so slots can hold code', () => {
    render(<Harness initial={'if (a) {\n}'} />);
    fireEvent.click(screen.getAllByText('add step')[0]);
    fireEvent.click(screen.getByText('Raw JavaScript'));

    const code = screen.getByTestId('code').textContent ?? '';
    expect(code).toContain('// your code here');
    expect(code.indexOf('// your code here')).toBeGreaterThan(code.indexOf('if (a)'));
  });

  // -------------------------------------------------------------- calling code
  it('offers declared functions in the Call block picker', () => {
    render(<Harness initial={'function greet() {\n  log("hi");\n}'} />);
    fireEvent.click(screen.getByText('Add Block'));
    fireEvent.click(screen.getByText('Call a Function'));

    const picker = screen.getByRole('combobox') as HTMLSelectElement;
    expect([...picker.options].map(o => o.value)).toContain('greet');

    fireEvent.change(picker, { target: { value: 'greet' } });
    expect(screen.getByTestId('code').textContent).toContain('greet();');
  });

  it('passes arguments through the Call block', () => {
    render(<Harness initial={'function greet(name) {\n  log(name);\n}'} />);
    fireEvent.click(screen.getByText('Add Block'));
    fireEvent.click(screen.getByText('Call a Function'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'greet' } });
    fireEvent.change(screen.getByPlaceholderText('arguments'), { target: { value: '"world"' } });
    expect(screen.getByTestId('code').textContent).toContain('greet("world");');
  });

  it('tells you when nothing could pick a function yet', () => {
    render(<Harness initial={'log("a");'} />);
    fireEvent.click(screen.getByText('Add Block'));
    fireEvent.click(screen.getByText('Call a Function'));
    expect(screen.getByText(/No functions defined yet/)).toBeTruthy();
  });

  it('keeps code fields out of a phone keyboard\'s autocapitalize', () => {
    // `Console.log` instead of `console.log` is a runtime-only failure, so the
    // guard belongs on the field rather than in a validator.
    render(<Harness initial={'log("hi");'} />);
    const field = screen.getByDisplayValue('log("hi")');
    expect(field.getAttribute('autocapitalize')).toBe('none');
    expect(field.getAttribute('autocorrect')).toBe('off');
  });

  it('closes the palette after a pick so the canvas is clickable again', () => {
    render(<Harness initial={'log("a");'} />);
    fireEvent.click(screen.getByText('Add Block'));
    expect(screen.getByPlaceholderText('Search blocks…')).toBeTruthy();
    fireEvent.click(screen.getByText('Log a message'));
    expect(screen.queryByPlaceholderText('Search blocks…')).toBeNull();
  });

  it('does not re-parse its own write-back (keeps canvas state stable)', () => {
    render(<Harness initial={'log("x");'} />);
    const input = screen.getByDisplayValue('log("x")');
    fireEvent.change(input, { target: { value: 'log("y")' } });
    // If the effect re-parsed our own output, the field would be recreated and
    // lose focus/identity mid-typing. Same element, new value.
    expect((screen.getByDisplayValue('log("y")') as HTMLInputElement)).toBe(input);
  });

  it('lets a raw block be edited directly', () => {
    render(<Harness initial={'class Foo {}'} />);
    const area = screen.getByDisplayValue('class Foo {}');
    fireEvent.change(area, { target: { value: 'class Bar {}' } });
    expect(screen.getByTestId('code').textContent).toContain('class Bar {}');
  });

  it('collapses a block to hide its steps', () => {
    render(<Harness initial={'if (a) {\n  log("hi");\n}'} />);
    fireEvent.click(screen.getByLabelText('Collapse block'));
    expect(screen.getByText(/step\(s\) hidden/)).toBeTruthy();
  });
});
