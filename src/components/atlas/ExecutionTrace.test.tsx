// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import ExecutionTrace from './ExecutionTrace';

afterEach(cleanup);

// A real turn's shape: the Library boots inside every hook, so its two boot
// lines repeat three times across the run and carry no per-hook information.
const turn = [
  {
    scriptName: 'Input Modifier',
    stateChanged: true,
    logs: [
      '[DEBUG] Library concatenated and executed before the Input Modifier hook.',
      'Library loaded successfully.',
      'Input hook loaded successfully.',
      'basecode |RPG Engine Guide|',
      '[DEBUG] Modified Text: "|RPG Engine Guide|"',
    ],
  },
  {
    scriptName: 'Context Modifier',
    stateChanged: false,
    logs: [
      '[DEBUG] Library concatenated and executed before the Context Modifier hook.',
      'Library loaded successfully.',
      'Context hook loaded successfully.',
      '[DEBUG] Modified Text: ""',
    ],
  },
  {
    scriptName: 'Output Modifier',
    stateChanged: true,
    logs: [
      '[DEBUG] Library concatenated and executed before the Output Modifier hook.',
      'Library loaded successfully.',
      '[DEBUG] Modified Text: "k"',
    ],
  },
];

describe('ExecutionTrace', () => {
  it('shows one section per hook, in fire order', () => {
    render(<ExecutionTrace trace={turn} />);
    const names = screen.getAllByText(/^(Input|Context|Output) Modifier$/).map(n => n.textContent);
    expect(names).toEqual(['Input Modifier', 'Context Modifier', 'Output Modifier']);
  });

  it('collapses the repeated Library boot lines into one note per hook', () => {
    render(<ExecutionTrace trace={turn} />);
    // Three hooks each logged it; it must not appear as six more log lines.
    expect(screen.queryByText('Library loaded successfully.')).toBeNull();
    expect(screen.getAllByText(/Library ran first/)).toHaveLength(3);
  });

  it('surfaces each hook\'s returned text as its result, not as a log line', () => {
    render(<ExecutionTrace trace={turn} />);
    expect(screen.getByText('"|RPG Engine Guide|"')).toBeTruthy();
    // The empty Context return is shown as "" rather than silently omitted.
    expect(screen.getByText('""')).toBeTruthy();
    expect(screen.queryByText(/\[DEBUG\] Modified Text/)).toBeNull();
  });

  it('flags the hook that threw, not the whole run', () => {
    render(<ExecutionTrace trace={[
      { scriptName: 'Input Modifier', logs: ['fine'] },
      { scriptName: 'Output Modifier', logs: ['[DEBUG] EXECUTION ERROR Hook: "Output Modifier"'] },
    ]} />);
    expect(screen.getByText(/EXECUTION ERROR/)).toBeTruthy();
  });

  it('can collapse a hook section', () => {
    render(<ExecutionTrace trace={turn} />);
    expect(screen.getByText('basecode |RPG Engine Guide|')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Input Modifier/ }));
    expect(screen.queryByText('basecode |RPG Engine Guide|')).toBeNull();
  });

  it('says so when there is nothing to show', () => {
    render(<ExecutionTrace trace={[]} />);
    expect(screen.getByText(/No execution yet/)).toBeTruthy();
  });
});
