export type SlotFile = { path: string; content: string };
export type FileLinkingConfig = Record<'library' | 'input' | 'context' | 'output', SlotFile>;

export const EMPTY_FILE_LINKING_CONFIG: FileLinkingConfig = {
  library: { path: 'Link File', content: '' },
  input: { path: 'Link File', content: '' },
  context: { path: 'Link File', content: '' },
  output: { path: 'Link File', content: '' },
};

export type LinkedFiles = Record<'library' | 'input' | 'context' | 'output', File | null>;

export const EMPTY_LINKED_FILES: LinkedFiles = {
  library: null,
  input: null,
  context: null,
  output: null,
};
