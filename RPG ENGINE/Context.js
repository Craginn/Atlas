const detectdebug = false; // Change to false to remove Console.log(found)
function detectAction(terms, happened, hook, searchspace) {
  // Prevent multiple instances of an action
  const found = terms.find((term) =>
    searchspace.toLowerCase().includes(term.toLowerCase()),
  );
  if (found !== undefined) {
    if (detectdebug) {
      if (terms === Paw || terms === PTD) {
        console.log(found);
        console.log(state[happened]);
      }
    }
    if (!state[happened]) {
      hook();
      state[happened] = true;
    }
  } else {
    state[happened] = false;
  }
}

function getPotionHook() {
  addItem({
    name: "Health Potion",
    type: "consumable",
    effect: { health: 25 },
  });
}

let safearea = false;
/*function safeareaHook() {
  safearea = true
  state.logMessages['Output'].push(`-Safe Area-`)
  CommunityUtils.StoryCards.setSettings(PlayerCard, "Playerloc", "Safe Area")
}*/

const modifier = (text) => {
  if (state.PS.Name !== undefined) {
    let lastAction = splatContext(text).LA;

    //console.log(history)

    detectAction(
      ["you find a small bottle", "a glowing potion", "healing potion"],
      "lastPotionFoundThisTurn",
      getPotionHook,
      lastAction,
    );

    text = censor(text, "💡");
    text = censor(text, "🌀");
    text = censor(text, "❤️");
    text = censor(text, "💚");
    text = censor(text, "🍀");
    text = censor(text, "🧠");
    text = censor(text, "💪");
    text = censor(text, "👥");
    text = censor(text, "👁️‍🗨️");
    text = censor(text, "💥");
    text = censor(text, "🎯");
    text = censor(text, "🤔");
    text = censor(text, "🎲");
    text = censor(text, "🎒");
    text = censor(text, "🔄");
    text = censor(text, "🌟");
    text = censor(text, "⚔️");
    text = censor(text, "✨");
    text = censor(text, "🛡️");
    text = censor(text, "🎮");
    text = censor(text, "-");
    text = censor(text, "☠️");
    text = censor(text, "[");
    text = censor(text, "✅");
    text = censor(text, "|");
    text = censor(text, "💰💰");
    text = censor(text, "🛍️");

    /*let ctx = splatContext(text)
    ctx = inject(
      ctx, '[HP: ' + state.PS.health + ']\n') // Might need to change "HP:" to "Player starting HP:"
  
    text = unsplatContext(ctx)*/

    //LAtext();
    playerFood();
    printMonsterStats();
    tickMonsterCooldowns();
    tickAbilityCooldowns(); // decrement player ability cooldowns each turn
    tickStatusEffects(); // tick DoT damage on monsters, then expire effects
    companionCombatTick(); // ---- ALLY SYSTEM ---- party/summons act, then get hit

    // Playerpromt
    // The player-intent block is tuned from the actions parsed in Input
    // (state.PlayerActions / state.PlayerActionPrompt). The instructions the AI
    // sees change conditionally with what the player actually did this turn, and
    // multiple parsed actions each get their own beat.
    if (state.PlayerActionPrompt) {
      const actions = Array.isArray(state.PlayerActions)
        ? state.PlayerActions
        : [];
      const types = new Set(actions.map((a) => a.type));

      // Per-action-type guidance appended only when that kind of action occurred.
      const guidance = [];
      if (types.has("combat"))
        guidance.push(
          "- Resolve the combat action concretely: hits, damage, misses, or the enemy's reaction.",
        );
      if (types.has("magic") || types.has("skill"))
        guidance.push(
          "- Show the spell/skill being used and its visible effect on the target.",
        );
      if (types.has("inventory"))
        guidance.push("- Reflect the item being used and the effect it has.");
      if (types.has("interaction"))
        guidance.push(
          "- Include brief, in-character NPC dialogue where it fits.",
        );
      if (types.has("exploration"))
        guidance.push("- Reveal something concrete about the surroundings.");
      if (types.has("rest"))
        guidance.push("- Show the player recovering; keep the scene calm.");

      console.log(guidance);

      // ---- ALLY SYSTEM ----
      // Companions only read as present if the AI is told they are there.
      const party = getLivingCompanions();
      if (party.length) {
        guidance.push(
          `- The player is accompanied by ${party.map((c) => `${c.name} the ${c.role}`).join(", ")}; ` +
            `give each a brief beat of their own when they act, but never decide for the player.`,
        );
      }

      const multi =
        actions.length > 1
          ? "\n      - The player took MULTIPLE actions this turn; give EACH one its own numbered beat, in the order listed above."
          : "";

      // Determine output format based on action types
      let formatType = 'default';
      if (types.has("combat")) formatType = 'combat';
      else if (types.has("interaction")) formatType = 'interaction';
      else if (types.has("exploration")) formatType = 'exploration';

      const format = getOutputFormat(formatType);
      const rulesString = format.rules
        .map((rule) => `      - ${rule}`)
        .join("\n");
      const guidanceString = guidance.map((g) => `      ${g}`).join("\n");

      text =
        text +
        `${format.header}
      ${format.lineTemplate}

      Example:
      ${format.example}

      ## PLAYER INTENT
      ${state.PlayerActionPrompt}${multi}

      ## RULES
      ${rulesString}
      ${guidanceString}`;
    }

    return text; // This is what AI Dungeon expects
  }
};

console.log("Context hook loaded successfully.");

// Don't modify this part
modifier(text);
