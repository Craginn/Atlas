// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import Director from './Director';

afterEach(cleanup);

const base = {
  onExecute: vi.fn(), isProcessing: false,
  input: '', context: '', output: '', opening: '',
  setInput: vi.fn(), setContext: vi.fn(), setOutput: vi.fn(), setOpening: vi.fn(),
};

describe('Director Output box', () => {
  it('keeps the original order and appends Output last', () => {
    render(<Director {...base} result="" />);
    const labels = screen.getAllByText(/^(Input|Context|AI Call|Output)$/).map(n => n.textContent);
    console.log('ORDER ->', labels);
    expect(labels).toEqual(['Input', 'Context', 'AI Call', 'Output']);
  });

  it('shows the run result', () => {
    render(<Director {...base} result={'\nWhat is your name?'} />);
    expect(screen.getByText(/What is your name\?/)).toBeTruthy();
    expect(screen.getByText(/read-only/i)).toBeTruthy();
  });

  it('shows a placeholder before any run, and is not an editable field', () => {
    render(<Director {...base} result="" />);
    expect(screen.getByText(/Sent to the player after the Output hook runs/)).toBeTruthy();
    // Opening + the three input boxes are textareas — Output must not be one.
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });
});

describe('Director Opening box', () => {
  // There is one Execute button. Pasting the opening and pressing it must run
  // the opening as the turn's action — the earlier design needed a second,
  // separate button, so pressing Execute silently sent an empty action instead.
  it('sends the Opening as the action when Input is empty', () => {
    const onExecute = vi.fn();
    render(<Director {...base} onExecute={onExecute} result="" opening="RPG Engine Guide" output="k" />);
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    expect(onExecute).toHaveBeenCalledWith('RPG Engine Guide', '', 'k', 'do');
  });

  it('prefers Input over Opening when both have text', () => {
    const onExecute = vi.fn();
    render(<Director {...base} onExecute={onExecute} result="" input="elf" opening="RPG Engine Guide" />);
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    expect(onExecute).toHaveBeenCalledWith('elf', '', '', 'do');
  });

  it('says which of the two it will send', () => {
    const { unmount } = render(<Director {...base} result="" opening="RPG Engine Guide" />);
    expect(screen.getByRole('button', { name: /execute \(opening\)/i })).toBeTruthy();
    unmount();
    render(<Director {...base} result="" input="elf" opening="RPG Engine Guide" />);
    expect(screen.getByRole('button', { name: /^execute$/i })).toBeTruthy();
  });

  it('ignores a whitespace-only Input rather than sending it', () => {
    const onExecute = vi.fn();
    render(<Director {...base} onExecute={onExecute} result="" input="   " opening="RPG Engine Guide" />);
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    expect(onExecute).toHaveBeenCalledWith('RPG Engine Guide', '', '', 'do');
  });

  it('switches action kind and sends it; Continue ignores the Input', () => {
    const onExecute = vi.fn();
    render(<Director {...base} onExecute={onExecute} result="" input="elf" opening="RPG Engine Guide" />);

    fireEvent.click(screen.getByRole('button', { name: /^say$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^execute$/i }));
    expect(onExecute).toHaveBeenLastCalledWith('elf', '', '', 'say');

    // The "Continue" kind toggle and the "Execute (Continue)" run button have
    // distinct names, so selecting Continue then running sends no action at all.
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    fireEvent.click(screen.getByRole('button', { name: /execute \(continue\)/i }));
    expect(onExecute).toHaveBeenLastCalledWith('', '', '', 'continue');
  });
});

describe('Director misdirected-answer warning', () => {
  it('names the mix-up when the answer went into AI Call instead of Input', () => {
    render(<Director {...base} result="Invalid option. Choose: human, elf, dwarf" misdirectedAnswer />);
    expect(screen.getByText(/No action was sent/)).toBeTruthy();
    expect(screen.getByText(/Put the action in/i)).toBeTruthy();
  });

  it('stays quiet on a normal run', () => {
    render(<Director {...base} result="\nWhat is your race?" />);
    expect(screen.queryByText(/No action was sent/)).toBeNull();
  });

  it('labels which box is the player and which is the AI', () => {
    render(<Director {...base} result="" />);
    expect(screen.getByText(/The player's action/)).toBeTruthy();
    expect(screen.getByText(/The AI's reply, not the player's/)).toBeTruthy();
  });
});
