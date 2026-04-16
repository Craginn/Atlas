import { runOfflineSimulation } from './offlineSimulationService';
import { runSimulation as runRemoteSimulation } from './aiService';
import { WorldState, Script, SimulationMode, SimulationResult, KnowledgeBase } from '../types';

const SCRIPT_EXECUTION_ORDER = ['Library', 'Input Modifier', 'Context Modifier', 'Output Modifier'];

const simulateStep = async (
  input: string,
  worldState: WorldState,
  scripts: Script[],
  mode: SimulationMode = 'remote',
  knowledgeBase?: KnowledgeBase
): Promise<SimulationResult> => {
  console.log(`--- Scripting Service: Starting simulation step in '${mode}' mode ---`);

  const executedScriptIds: string[] = [];
  let currentState = JSON.parse(JSON.stringify(worldState));
  const heimdallLogs: any[] = [];
  const executedCode: { [scriptName: string]: string } = {};
  let reasoningLog: string | undefined = undefined;
  let modifiedInput = input;
  let modifiedContext = knowledgeBase?.memoryBank || '';
  let modifiedOutput = '';

  if (mode === 'local' || mode === 'hybrid') {
    const activeScripts = scripts.filter(s => s.active && s.code && s.code.trim().length > 0);

    activeScripts.sort((a, b) => {
      const indexA = SCRIPT_EXECUTION_ORDER.indexOf(a.name);
      const indexB = SCRIPT_EXECUTION_ORDER.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const libraryScript = activeScripts.find(s => s.name === 'Library');
    const libraryCode = libraryScript ? libraryScript.code : '';

    for (const script of activeScripts) {
        executedScriptIds.push(script.id);
        executedCode[script.name] = script.code;

        const isModifier = script.name !== 'Library';
        let currentInput = modifiedInput;
        if (script.name === 'Context Modifier') {
            currentInput = modifiedContext;
        } else if (script.name === 'Output Modifier') {
            currentInput = modifiedOutput;
        }

        const stateBefore = JSON.parse(JSON.stringify(currentState));
        console.log(`[ScriptingService] Executing script: ${script.name}`);
        console.log(`[ScriptingService] State before: ${JSON.stringify(stateBefore)}`);
        
        // Only prepend library code for modifier scripts, not for the Library script itself
        const codeToExecute = script.name === 'Library' ? script.code : libraryCode + '\n' + script.code;
        const { newState, logs: scriptLogs, result } = await runOfflineSimulation(codeToExecute, currentState, currentInput, isModifier);
        const stateAfter = JSON.parse(JSON.stringify(newState));
        
        console.log(`[ScriptingService] State after: ${JSON.stringify(stateAfter)}`);
        
        const stateChanged = JSON.stringify(stateBefore) !== JSON.stringify(stateAfter);
        console.log(`[ScriptingService] State changed: ${stateChanged}`);
        if (scriptLogs && scriptLogs.length > 0) {
          console.log(`[ScriptingService] Script logs: ${scriptLogs.join(' | ')}`);
        }

        heimdallLogs.push({
            scriptName: script.name,
            before: stateBefore,
            after: stateAfter,
            logs: scriptLogs,
            stateChanged,
        });

        currentState = newState;

        if (result && result.text) {
            if (script.name === 'Input Modifier') {
                modifiedInput = result.text;
            } else if (script.name === 'Context Modifier') {
                modifiedContext = result.text;
            } else if (script.name === 'Output Modifier') {
                modifiedOutput = result.text;
            }
        }
    }

    if (heimdallLogs.length > 0) {
      reasoningLog = JSON.stringify(heimdallLogs, null, 2);
    }
  }

  if (mode === 'local') {
    const outputMessage = `Local simulation complete. ${executedScriptIds.length} script(s) executed.`;
    console.log('[ScriptingService] Final currentState being returned:', JSON.stringify(currentState));
    return {
      newState: currentState,
      output: modifiedOutput || outputMessage,
      narration: modifiedOutput || outputMessage,
      reasoning: reasoningLog,
      executedCode,
      triggeredCards: [],
      influenceLevel: 0,
      triggeredScriptIds: executedScriptIds,
    };
  }

  const updatedKnowledgeBase = { ...knowledgeBase, memoryBank: modifiedContext };
  const remoteResult = await runRemoteSimulation(modifiedInput, updatedKnowledgeBase);
  const finalReasoning = mode === 'hybrid' && reasoningLog ? reasoningLog : remoteResult.reasoning;

  return {
    ...remoteResult,
    reasoning: finalReasoning,
    executedCode: { ...remoteResult.executedCode, ...executedCode },
    triggeredScriptIds: [...(remoteResult.triggeredScriptIds || []), ...executedScriptIds],
  };
};

export const ScriptingService = { simulateStep };
