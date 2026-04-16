import { SimulationResult, WorldState, KnowledgeBase } from '../types';

const mockWorldState: WorldState = {
  location: 'Nexus',
  characters: [],
  inventory: [],
  attributes: { day: 1 },
  narrativeContext: 'The simulation has just begun.',
};

export async function runSimulation(input: string, knowledgeBase?: KnowledgeBase): Promise<SimulationResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const newNarrativeContext = `The user performed the action: "${input}". The world is now in a new state.`;

  return {
    narration: `AI-generated narration for: "${input}".`,
    influenceLevel: Math.random(),
    triggeredCards: [],
    newState: {
      ...mockWorldState,
      narrativeContext: newNarrativeContext,
      attributes: { day: (mockWorldState.attributes.day as number) + 1 },
    },
    output: newNarrativeContext,
    reasoning: JSON.stringify({
      thought: "The user is trying to interact with the world. Updating narrative context.",
      confidence: 0.95
    }, null, 2)
  };
}

export async function runAnalysis(code: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    suggestions: [
      { line: 3, message: 'Consider renaming this variable for clarity.' },
      { line: 8, message: 'This function could be optimized.' },
    ],
    summary: 'The code is generally well-structured.'
  };
}
