import { BlockKind, BlockNode, makeBlock } from './types';

// The insertable block catalogue — what "populate the sections as the user
// requests" pulls from. Two tiers:
//
//   Actions  — AID-specific one-liners a beginner reaches for constantly.
//              These are prefilled `expression` blocks, so they're ordinary
//              code the moment they land; nothing about them is a special case.
//   Structure — the JS control-flow constructs, with empty slots ready to nest.

export interface PaletteEntry {
  id: string;
  label: string;
  group: 'Actions' | 'Logic' | 'Loops' | 'Data' | 'Advanced';
  hint: string;
  make: () => BlockNode;
}

const stmt = (expression: string) => () => makeBlock('expression', { expression });

export const PALETTE: PaletteEntry[] = [
  // ---------------------------------------------------------------- Actions
  {
    id: 'log', label: 'Log a message', group: 'Actions',
    hint: 'Print to the Sentinel log for debugging',
    make: stmt('log("message")'),
  },
  {
    id: 'setText', label: 'Change the text', group: 'Actions',
    hint: 'Replace what the player or AI sees',
    make: stmt('text = "new text"'),
  },
  {
    id: 'returnText', label: 'Return the text', group: 'Actions',
    hint: 'Every modifier must end with this',
    make: () => makeBlock('return', { argument: '{ text }' }),
  },
  {
    id: 'stop', label: 'Stop the turn', group: 'Actions',
    hint: 'Halt further processing',
    make: stmt('stop = true'),
  },
  {
    id: 'addCard', label: 'Add a Story Card', group: 'Actions',
    hint: 'Create a new card in the world',
    make: stmt('addStoryCard("keys", "entry", "Custom")'),
  },
  {
    id: 'updateCard', label: 'Update a Story Card', group: 'Actions',
    hint: 'Change an existing card by index',
    make: stmt('updateStoryCard(0, "keys", "entry", "Custom")'),
  },
  {
    id: 'removeCard', label: 'Remove a Story Card', group: 'Actions',
    hint: 'Delete a card by index',
    make: stmt('removeStoryCard(0)'),
  },
  {
    id: 'readPlot', label: 'Read Plot Essentials', group: 'Data',
    hint: 'Use your Plot Essentials text — plot.plotEssentials',
    make: stmt('log(plot.plotEssentials)'),
  },
  {
    id: 'findCard', label: 'Find a Story Card', group: 'Data',
    hint: 'Look a card up by keyword',
    make: stmt('const card = storyCards.find(c => c.keys.includes("keyword"))'),
  },
  {
    id: 'message', label: 'Show a message', group: 'Actions',
    hint: 'Surface a note to the player',
    make: stmt('state.message = "Something happened"'),
  },

  {
    id: 'call', label: 'Call a Function', group: 'Actions',
    hint: 'Run a function you defined — pick it from a list',
    make: () => makeBlock('call', { callee: '', args: '' }),
  },
  {
    id: 'rawInline', label: 'Write Code', group: 'Actions',
    hint: 'Free-form JavaScript, for anything no block covers',
    make: () => makeBlock('raw', { source: '' }),
  },

  // ------------------------------------------------------------------ Logic
  {
    id: 'if', label: 'If', group: 'Logic',
    hint: 'Run steps only when a condition is true',
    make: () => makeBlock('if', { test: 'true' }, { then: [], else: [] }),
  },
  {
    id: 'ifElse', label: 'If / Else', group: 'Logic',
    hint: 'One path when true, another when false',
    make: () =>
      makeBlock('if', { test: 'true' }, { then: [], else: [makeBlock('empty')] }),
  },
  {
    id: 'switch', label: 'Switch', group: 'Logic',
    hint: 'Pick one branch by value',
    make: () =>
      makeBlock('switch', { discriminant: 'value' }, {
        cases: [makeBlock('case', { test: '"a"' }, { body: [] })],
      }),
  },

  // ------------------------------------------------------------------ Loops
  {
    id: 'forOf', label: 'For Each', group: 'Loops',
    hint: 'Repeat once per item in a list',
    make: () =>
      makeBlock('forIn', { left: 'const item', operator: 'of', right: 'storyCards' }, { body: [] }),
  },
  {
    id: 'for', label: 'Count Loop', group: 'Loops',
    hint: 'Repeat a fixed number of times',
    make: () =>
      makeBlock('for', { init: 'let i = 0', test: 'i < 10', update: 'i++' }, { body: [] }),
  },
  {
    id: 'while', label: 'While', group: 'Loops',
    hint: 'Repeat while a condition holds',
    make: () => makeBlock('while', { test: 'true' }, { body: [] }),
  },

  // ------------------------------------------------------------------- Data
  {
    id: 'var', label: 'Set a Variable', group: 'Data',
    hint: 'Store a value under a name',
    make: () => makeBlock('var', { declKind: 'let', declarations: 'name = value' }),
  },
  {
    id: 'stateVar', label: 'Remember a Value', group: 'Data',
    hint: 'Store on state so it survives the turn',
    make: stmt('state.myValue = 1'),
  },
  {
    id: 'function', label: 'Function', group: 'Data',
    hint: 'A reusable named routine',
    make: () => makeBlock('function', { name: 'myFunction', params: '' }, { body: [] }),
  },

  // --------------------------------------------------------------- Advanced
  {
    id: 'try', label: 'Try / Catch', group: 'Advanced',
    hint: 'Attempt steps and handle failures',
    make: () =>
      makeBlock('try', { hasCatch: 'true', catchParam: 'e', hasFinally: 'false' }, {
        body: [], catch: [], finally: [],
      }),
  },
  {
    id: 'raw', label: 'Raw JavaScript', group: 'Advanced',
    hint: 'Write code directly when no block fits',
    make: () => makeBlock('raw', { source: '// your code here' }),
  },
];

export const PALETTE_GROUPS = ['Actions', 'Logic', 'Loops', 'Data', 'Advanced'] as const;

/** Which named slots a kind exposes, and how to label them in the UI. */
export const SLOTS_FOR: Partial<Record<BlockKind, Array<{ key: string; label: string }>>> = {
  if:       [{ key: 'then', label: 'Then' }, { key: 'else', label: 'Else' }],
  for:      [{ key: 'body', label: 'Repeat' }],
  forIn:    [{ key: 'body', label: 'For each' }],
  while:    [{ key: 'body', label: 'Repeat' }],
  doWhile:  [{ key: 'body', label: 'Repeat' }],
  function: [{ key: 'body', label: 'Does' }],
  block:    [{ key: 'body', label: 'Steps' }],
  switch:   [{ key: 'cases', label: 'Cases' }],
  case:     [{ key: 'body', label: 'Then' }],
  try:      [
    { key: 'body', label: 'Try' },
    { key: 'catch', label: 'On error' },
    { key: 'finally', label: 'Finally' },
  ],
};

/** Editable expression fields per kind, in display order. */
export const FIELDS_FOR: Partial<Record<BlockKind, Array<{ key: string; label: string; wide?: boolean }>>> = {
  if:         [{ key: 'test', label: 'when', wide: true }],
  while:      [{ key: 'test', label: 'while', wide: true }],
  doWhile:    [{ key: 'test', label: 'while', wide: true }],
  for:        [
    { key: 'init', label: 'start' },
    { key: 'test', label: 'while' },
    { key: 'update', label: 'each time' },
  ],
  forIn:      [
    { key: 'left', label: 'each' },
    { key: 'right', label: 'in', wide: true },
  ],
  switch:     [{ key: 'discriminant', label: 'on', wide: true }],
  case:       [{ key: 'test', label: 'is' }],
  var:        [{ key: 'declarations', label: 'set', wide: true }],
  function:   [{ key: 'name', label: 'name' }, { key: 'params', label: 'inputs' }],
  return:     [{ key: 'argument', label: 'value', wide: true }],
  throw:      [{ key: 'argument', label: 'error', wide: true }],
  // `call` is rendered by a bespoke editor (callee picker + args), so it
  // deliberately declares no generic fields here.
  expression: [{ key: 'expression', label: 'do', wide: true }],
  break:      [{ key: 'label', label: 'label' }],
  continue:   [{ key: 'label', label: 'label' }],
  try:        [{ key: 'catchParam', label: 'error as' }],
};
