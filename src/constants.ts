import { WorldState, Script, StoryCard, KnowledgeBase } from './types';

export const INITIAL_WORLD_STATE: WorldState = {};

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

// Ethereal (ghost) placeholder examples per Plot Component, shown when a field
// is empty. Written to match the real AID plot-component guidance in the docs
// (05-plot-components/ and 02-context/context-assembly-order.md).
export const PLOT_EXAMPLES: Record<
  'aiInstructions' | 'plotEssentials' | 'storySummary' | 'memoryBank' | 'authorsNote',
  string
> = {
  aiInstructions:
    'e.g. Write in third person, past tense. Keep a grim, low-fantasy tone. Never break character or mention that this is a game.',
  plotEssentials:
    'e.g. Kira is a exiled knight seeking the stolen Ember Crown. She distrusts mages. The Kingdom of Vale is on the brink of civil war. Put the most important facts first and last.',
  storySummary:
    'e.g. Kira left the ruined village of Ashford after learning the Crown was taken to Blackspire. She recruited the thief Doran and now approaches the fortress gates.',
  memoryBank:
    'Engine-managed in AI Dungeon (semantically retrieved memories). Shown here for testing — leave blank to mimic the real platform.',
  authorsNote:
    'e.g. Tense pacing. Emphasize the cold and Kira\'s exhaustion. (Keep to keywords or 1–4 short sentences.)',
};

// A coherent sample adventure used by the "Load Example" button so sections
// aren't empty during testing.
export const SAMPLE_KB: KnowledgeBase = {
  aiInstructions:
    'Write in third person, past tense, in a grim low-fantasy style. Stay in character at all times. Do not mention that this is a game or an AI.',
  plotEssentials:
    'Kira is an exiled knight hunting the stolen Ember Crown; she distrusts mages. The Kingdom of Vale teeters on civil war. Her ally Doran is a light-fingered thief with a hidden past.',
  storyCards: INITIAL_STORY_CARDS,
  storySummary:
    'After the sack of Ashford, Kira learned the Ember Crown was carried to the fortress of Blackspire. She freed the thief Doran from the stocks in exchange for his help, and the pair now stand before Blackspire\'s frozen gates.',
  memoryBank: '',
  recentHistory: '',
  authorsNote: 'Tense pacing. Emphasize the cold and Kira\'s exhaustion.',
};
