import { WorldState, Script, StoryCard, KnowledgeBase } from './types';

export const INITIAL_WORLD_STATE: WorldState = {
  location: 'Nexus',
  narrativeContext: 'The simulation has just begun.',
  history: [],
  characters: [],
  inventory: [],
  attributes: {
    day: 1,
  },
  flags: {},
};

export const DEFAULT_SCRIPTS: Script[] = [
  {
    id: 's1',
    name: 'Library',
    trigger: '',
    description: 'Reusable functions and classes. Link to Library File',
    code: '',
    active: true,
  },
  {
    id: 's2',
    name: 'Input Modifier',
    trigger: '',
    description: 'Modify the user input before processing. Link to Input File',
    code: '',
    active: true,
  },
  {
    id: 's3',
    name: 'Context Modifier',
    trigger: '',
    description: 'Modify the world state and narrative context. Link to Context File',
    code: '',
    active: true,
  },
  {
    id: 's4',
    name: 'Output Modifier',
    trigger: '',
    description: 'Modify the final output to the user. Link to Output File',
    code: '',
    active: true,
  }
];

export const INITIAL_STORY_CARDS: StoryCard[] = [
  {
    id: 'c1',
    title: 'The Golden Mug',
    content: 'A legendary artifact said to be hidden in this tavern.',
    keywords: ['mug', 'golden', 'artifact'],
    type: 'Custom',
    notes: 'This is the main quest hook.',
  },
];

export const INITIAL_KB: KnowledgeBase = {
  aiInstructions: 'You are a helpful AI assistant.',
  plotEssentials: 'The main plot is to find the Golden Mug.',
  storyCards: INITIAL_STORY_CARDS,
  storySummary: 'The user has just entered the tavern.',
  memoryBank: '',
  recentHistory: '',
  authorsNote: '',
};
