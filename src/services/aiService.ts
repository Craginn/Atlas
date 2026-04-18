import { INITIAL_KB, INITIAL_WORLD_STATE } from '../constants';
import { SimulationResult, KnowledgeBase } from '../types';

export async function runSimulation(input: string, knowledgeBase?: KnowledgeBase): Promise<SimulationResult> {
  const activeKnowledgeBase = knowledgeBase ?? INITIAL_KB;
  await new Promise(resolve => setTimeout(resolve, 1500));

  const currentDay = typeof INITIAL_WORLD_STATE.attributes?.day === 'number'
    ? INITIAL_WORLD_STATE.attributes.day
    : 1;
  const nextDay = currentDay + 1;
  const triggeredCards = activeKnowledgeBase.storyCards
    .filter(card =>
      card.keywords.some(keyword => input.toLowerCase().includes(keyword.toLowerCase()))
    )
    .map(card => card.id);

  const storySummary = activeKnowledgeBase.storySummary
    ? `Current summary: ${activeKnowledgeBase.storySummary}`
    : 'The world is waiting for the next move.';
  const plotDirection = activeKnowledgeBase.plotEssentials
    ? `Plot focus: ${activeKnowledgeBase.plotEssentials}`
    : 'Plot focus is still being defined.';
  const newNarrativeContext = `${storySummary} ${plotDirection} The user performed the action: "${input}".`;

  return {
    narration: `${newNarrativeContext} Day ${nextDay} begins.`,
    influenceLevel: Math.random(),
    triggeredCards,
    newState: {
      ...INITIAL_WORLD_STATE,
      narrativeContext: newNarrativeContext,
      history: [...(INITIAL_WORLD_STATE.history ?? []), input],
      attributes: {
        ...(INITIAL_WORLD_STATE.attributes ?? {}),
        day: nextDay,
      },
    },
    output: newNarrativeContext,
    reasoning: JSON.stringify({
      thought: `Updated the story state using plot context and matched ${triggeredCards.length} story card(s).`,
      confidence: 0.95,
      day: nextDay,
    }, null, 2)
  };
}

export async function runAnalysis(_code: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    suggestions: [
      { line: 3, message: 'Consider renaming this variable for clarity.' },
      { line: 8, message: 'This function could be optimized.' },
    ],
    summary: 'The code is generally well-structured.'
  };
}
