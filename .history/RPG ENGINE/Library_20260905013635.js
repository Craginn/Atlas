//const response = text.slice(You.length, text.length - 2).toLowerCase() Use when needed
const Say = '\n> You say "';
const Response = "\n> /";
const You = "\n> You ";
const Youchar = "\n>";
const Story = "story";
const Continue = "continue";
let DO = You;
const Empty = "\u200B";
const GlobalVision = 25;
const Input = history[history.length - 1]?.text;
const empty = "\u200B";
const GroupRegex = /(\d+)\s+([a-z0-9 ]+?)\b/gi;
const SingleRegex = /\b(?:a|an|the)\s+([a-z0-9 ]+?)\b/gi;
const FindSC = storyCards.findIndex((c) => c.title === ""); //if (i >= 0) removeStoryCard(i);
let History_Logs = true;

/*const conflictWord = ["attack", "stab", "destroy", "break", "steal", "ruin", "burn", "smash", "sabotage", "disrupt", "vandalize", "overthrow", "assassinate", "plunder", "rob", "ransack", "raid", "hijack", "detonate", "explode", "ignite", "collapse", "demolish", "shatter", "strike", "slap", "obliterate", "annihilate", "corrupt", "infect", "poison", "curse", "hex", "summon", "conjure", "mutate", "provoke", "riot", "revolt", "mutiny", "rebel", "resist", "intimidate", "blackmail", "manipulate", "brainwash", "lie", "cheat", "swindle", "disarm", "fire", "hack", "overload", "flood", "drown", "rot", "dissolve", "slaughter", "terminate", "execute", "drama", "conflict", "evil", "kill", "slay", "defeat", "fight", "doom", "slice", "pain", "dying", "die", "perish", "blood"]

const calmingWords = ["calm", "rest", "relax", "meditate", "sleep", "comfort", "hug", "smile", "forgive", "mend", "repair", "plant", "sing", "dance", "celebrate", "collaborate", "share", "give", "donate", "protect", "shelter", "trust", "hope", "dream", "revive", "eat", "drink", "balance", "cheer", "laugh", "play", "build", "bake", "craft", "cook", "empathize", "apologize", "befriend", "admire", "sympathize", "thank", "appreciate", "cherish", "love", "pet", "respect", "restore", "guide", "teach", "learn", "daydream", "wander", "explore", "discover", "reflect", "happy", "joy", "kind", "heal", "help", "assist"]*/

/*function LAtext() {
    let text = ""
    text += `A Noble Legion guide approaches and says, "Here is your identification bracelet. Please ensure you never take it off. Follow me to the labyrinths top level safe haven. As you enter through the safe haven entrance, you can hear the bustling sounds of the havens shops, adventurers, and vendors. The guide leads you up the stairs and into the tavern area, before bowing and leaving you.`
    const newtext = text
    if (newtext) {
        text
    } else {
        console.log("cant add text")
    }
    return tex
}*/

// ---- RPG World Configuration ----------------------------------------------
// A Story Card ("RPG Config") holds the world settings. Settings use
// `> Name: value` lines, the same shape CommunityUtils.StoryCards.setSettings
// writes.
// NOTE: definitions only here — getRpgConfig references CommunityUtils (a const
// initialized further down), so it must only be CALLED at runtime from a hook,
// never at top-level load (which would hit CommunityUtils' TDZ).

// Master kill-switch for the RPG config card. While false, /new player is never
// blocked, the card's Enabled flag is ignored, and the card is NOT auto-created
// — the engine simply runs on RPG_CONFIG_DEFAULTS. A card the user made by hand
// is still read (Game Mode, Difficulty, Permadeath, Survival keep working).
// Flip to true to re-arm the gate and let the engine create the card.
const RPG_CONFIG_GATE_ENABLED = false;

const RPG_CONFIG_CARD_KEYS = "RPG Config";
const RPG_CONFIG_DEFAULTS = {
  Enabled: false, // master gate — must be true to create a player
  "Game Mode": "open-world", // open-world | rogue-like
  Difficulty: "medium", // easy | medium | hard
  Permadeath: false, // is death final
  Survival: true, // hunger/thirst/fatigue systems on/off
};
// Guidance goes ABOVE the settings on purpose: if an editor collapses the
// newlines, trailing prose would otherwise glue onto the last setting's value.
const RPG_CONFIG_HEADER =
  "RPG world configuration. Edit the values below to tune the world.\n" +
  "Game Mode: open-world | rogue-like   Difficulty: easy | medium | hard\n";

// Render the canonical entry (header + one setting per line) from a values map.
function buildRpgConfigEntry(values) {
  let entry = RPG_CONFIG_HEADER;
  for (const name of Object.keys(RPG_CONFIG_DEFAULTS)) {
    const v =
      values && values[name] !== undefined
        ? values[name]
        : RPG_CONFIG_DEFAULTS[name];
    entry += `\n> ${name}: ${v}`;
  }
  return entry;
}
const RPG_CONFIG_ENTRY = buildRpgConfigEntry(RPG_CONFIG_DEFAULTS);

// Read one `> Name: value` setting. Deliberately NOT line-anchored: story card
// editors can collapse the newlines, which would make a `^>`-anchored regex miss
// every setting and silently fall back to defaults (so "Enabled: true" wouldn't
// take). Capture stops at the next `>` so collapsed entries still parse.
function readRpgSetting(card, settingName, defaultValue) {
  if (!card || typeof card.entry !== "string") return defaultValue;
  const match = card.entry.match(
    new RegExp(`>\\s*${settingName}:\\s*([^>\\n]*)`, "i"),
  );
  if (!match || typeof match[1] !== "string") return defaultValue;

  const value = match[1].trim();
  if (!value) return defaultValue;
  const lower = value.toLowerCase();

  // Exact booleans, then a prefix check so a collapsed entry that glued prose
  // onto the final value (e.g. "falseGame Mode: ...") still reads correctly.
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (lower.startsWith("true")) return true;
  if (lower.startsWith("false")) return false;

  const num = parseFloat(value);
  if (!isNaN(num) && isFinite(value)) return num;
  return value;
}

// Find the config card and parse it into state.rpgConfig. Runtime-only.
// The card is only created while the gate is armed; with the gate off a missing
// card is fine — readRpgSetting falls back to RPG_CONFIG_DEFAULTS.
function getRpgConfig() {
  const card = CommunityUtils.StoryCards.find(
    RPG_CONFIG_CARD_KEYS,
    RPG_CONFIG_GATE_ENABLED,
    RPG_CONFIG_ENTRY,
    "Custom",
  );
  const cfg = {
    enabled: readRpgSetting(card, "Enabled", RPG_CONFIG_DEFAULTS.Enabled),
    gameMode: readRpgSetting(
      card,
      "Game Mode",
      RPG_CONFIG_DEFAULTS["Game Mode"],
    ),
    difficulty: readRpgSetting(
      card,
      "Difficulty",
      RPG_CONFIG_DEFAULTS.Difficulty,
    ),
    permadeath: readRpgSetting(
      card,
      "Permadeath",
      RPG_CONFIG_DEFAULTS.Permadeath,
    ),
    survival: readRpgSetting(card, "Survival", RPG_CONFIG_DEFAULTS.Survival),
    card,
  };
  repairRpgConfigCard(card, cfg);
  state.rpgConfig = cfg;
  return cfg;
}

// Self-heal: if the card's settings are not on their own lines, rewrite it in the
// canonical shape (preserving the values just parsed) so later reads and
// setSettings writes — which ARE line-anchored — behave.
function repairRpgConfigCard(card, cfg) {
  if (!card || typeof card.entry !== "string") return;
  if (/^>\s*Enabled:/m.test(card.entry)) return; // already well-formed

  const newEntry = buildRpgConfigEntry({
    Enabled: cfg.enabled,
    "Game Mode": cfg.gameMode,
    Difficulty: cfg.difficulty,
    Permadeath: cfg.permadeath,
    Survival: cfg.survival,
  });
  try {
    const idx = storyCards.findIndex((c) => c.id === card.id);
    if (idx !== -1) {
      updateStoryCard(idx, card.keys, newEntry, card.type);
      card.entry = newEntry;
    } else {
      console.error(
        `repairRpgConfigCard: config card not found to rewrite (id ${card.id}).`,
      );
    }
  } catch (e) {
    console.error(
      `repairRpgConfigCard: failed rewriting the config card: ${e && e.message ? e.message : e}`,
    );
  }
}

// ---- Config-driven engine tuning -------------------------------------------
// These read the card fresh each call (find() is id-cached) so edits to the
// config card take effect immediately, without restarting the run.

// World Difficulty shifts EVERY stat-check DC. The per-check `difficulty`
// argument still names how hard that particular task is.
const RPG_DIFFICULTY_DC_SHIFT = { easy: -3, medium: 0, hard: 3 };
function rpgDifficultyShift() {
  const shift =
    RPG_DIFFICULTY_DC_SHIFT[String(getRpgConfig().difficulty).toLowerCase()];
  return typeof shift === "number" ? shift : 0;
}

// Rogue-like always plays for keeps, regardless of the Permadeath toggle.
function isPermadeath() {
  const cfg = getRpgConfig();
  return cfg.permadeath === true || cfg.gameMode === "rogue-like";
}

// Survival drives the hunger/thirst/fatigue tick in playerFood().
function isSurvivalOn() {
  return getRpgConfig().survival !== false;
}

// Game Mode decides where a new character wakes up.
function rpgStartingLocation() {
  return getRpgConfig().gameMode === "rogue-like"
    ? { location: "dungeon", playerloc: "dungeon entrance" }
    : { location: "safe haven", playerloc: "safe area" };
}

// Resolve player death per the config: permadeath ends the run, otherwise the
// player wakes wounded back at the safe haven.
function healTarget(amount, targetName) {
  if (!state.PS) return;

  // 1. Resolve Target
  let target = null;

  // If targetName is the player's name, target the player
  if (targetName === state.PS.Name) {
    target = state.PS;
  } else {
    // Otherwise, look for a companion in the party
    target = findCompanion(targetName);
  }

  if (!target) {
    console.error(`healTarget: Target ${targetName} not found.`);
    return;
  }

  // 2. Apply Heal
  const healValue = Math.max(0, Math.round(amount));
  const oldHealth = target.health;

  // Ensure we don't exceed maxHealth
  target.health = Math.min(target.maxHealth, target.health + healValue);

  const actualHealed = target.health - oldHealth;

  if (actualHealed > 0) {
    state.logMessages["Output"].push(
      `✨ ${target.name || target.Name} was healed for ${actualHealed} HP! ❤️ ${target.health}/${target.maxHealth}`,
    );
  }
}

function applyDamageToPlayer(amount, damageType = "physical", distance = 0) {
  if (!state.PS) return;

  // Proximity scaling: Melee range (dist < 30) = 100%, Ranged/Far = 80%
  let scaledAmount = distance < 30 ? amount : amount * 0.8;

  const effective = calculateEffectiveStats();
  const resType = damageType.toLowerCase();
  const resistPercent = effective.resistances[resType] || 0;

  // 1. Resistance (percentage reduction)
  let damage = scaledAmount * (1 - resistPercent / 100);

  // 2. Armor (flat reduction for physical only)
  if (resType === "physical") {
    damage -= effective.armor;
  }

  // 3. Clamp
  damage = Math.max(0, Math.round(damage));

  if (damage <= 0) {
    state.logMessages["Output"].push(
      `🛡️ ${state.PS.Name} completely blocked the ${damageType} attack!`,
    );
    return;
  }

  // 4. Barrier absorption
  if (state.PS.barrier > 0) {
    const absorbed = Math.min(state.PS.barrier, damage);
    state.PS.barrier -= absorbed;
    damage -= absorbed;
    state.logMessages["Output"].push(
      `🛡️ Barrier absorbed ${absorbed} damage! (Remaining: ${state.PS.barrier})`,
    );
  }

  // 5. Health update
  state.PS.health -= damage;
  state.logMessages["Output"].push(
    `💥 ${state.PS.Name} takes ${damage} ${damageType} damage! ❤️ ${state.PS.health}/${effective.maxHealth}`,
  );

  // 6. Death check
  if (state.PS.health <= 0) {
    handlePlayerDeath(damageType);
  }
}

function handlePlayerDeath(source) {
  if (!state.PS) return;
  state.PS.health = 0;
  state.PS.combatstatus = "None";

  if (isPermadeath()) {
    state.PS.dead = true;
    state.engineStart = false;
    state.logMessages["Output"].push(
      `☠️ ${state.PS.Name || "You"} has fallen for good${source ? ` (${source})` : ""}. ` +
        `Permadeath is on — type /new player to begin again.`,
    );
    return;
  }

  const revive = Math.max(1, Math.floor(getEffectiveStat("maxHealth") / 2));
  state.PS.health = revive;
  const start = rpgStartingLocation();
  state.PS.location = start.location;
  state.PS.playerloc = start.playerloc;
  if (state.MS) state.MS.activeMonsters = [];
  state.logMessages["Output"].push(
    `💀 You collapse${source ? ` from ${source}` : ""}... and wake at ${start.location} with ${revive} HP.`,
  );
}

// Gate for character creation. Returns { allowed, message }. While armed it
// ensures the config card exists (so a blocked player has something to edit);
// while disarmed it never creates the card.
function rpgCreationGate() {
  // Gate switched off: no card is created, and nothing stands between the
  // player and character creation.
  if (!RPG_CONFIG_GATE_ENABLED) return { allowed: true, message: null };
  const cfg = getRpgConfig();
  if (cfg.enabled === true) return { allowed: true, message: null };
  return {
    allowed: false,
    message:
      `⚙️ RPG is disabled. Open the "${RPG_CONFIG_CARD_KEYS}" story card, set ` +
      `"> Enabled: true" and choose a Game Mode (open-world | rogue-like), then type /new player again.`,
  };
}

// ---- Output Format Configuration -------------------------------------------
const OUTPUT_FORMATS = {
  default: {
    header: `# STRICT OUTPUT FORMAT\n The response MUST follow this exact structure:`,
    lineTemplate: `1. ("character name"|None) (full present tense telegraphic action beat) (short past tense version of the action beat, plus the result) (action scope: local|region|world) (action importance: minor|moderate|major)`,
    example: `1. ([name]) ([name] strikes [name] with their mighty blade, drawing blood) ([Name] attacked [Name] with their blade, hurting them) (local) (moderate)`,
    rules: [
      `EVERY line MUST contain: ("character name"|None) (full present tense telegraphic action beat) (short past tense version of the action beat, plus the result) (action scope: local|region|world) (action importance: minor|moderate|major|plot defining)`,
      `Avoid paragraphs`,
      `Avoid adding any text outside this structure`,
      `Output only a numbered list`,
      `Include the player's intended action(s) first, in order`,
      `Avoid making up decisions, actions, or dialogue for the player`,
    ],
  },
  combat: {
    header: `# COMBAT OUTPUT FORMAT\n The response MUST follow this exact combat structure:`,
    lineTemplate: `1. ([Name]) ([Action Beat]) ([Result/Damage]) (Scope) (Priority)`,
    example: `1. (Kaelen) (Swings broadsword at Goblin) (Hits for 12 dmg, Goblin reels) (local) (major)`,
    rules: [
      `EVERY line MUST follow: ([Name]) ([Action]) ([Result]) (Scope) (Priority)`,
      `Prioritize mechanical results (damage, status effects, misses)`,
      `Keep beats extremely concise and telegraphic`,
      `Avoid flowery prose during combat exchanges`,
      `Output only the numbered list`,
    ],
  },
  exploration: {
    header: `# EXPLORATION OUTPUT FORMAT\n The response MUST follow this environmental structure:`,
    lineTemplate: `1. (Location/Entity) (Sensory Detail/Discovery) (Immediate Effect/Context) (Scope) (Importance)`,
    example: `1. (Old Ruins) (A faint blue glow emanates from the altar) (Triggers a low hum in the air) (local) (moderate)`,
    rules: [
      `EVERY line MUST follow: (Target) (Observation) (Result) (Scope) (Importance)`,
      `Focus on sensory details: sight, sound, smell`,
      `Avoid narrative filler; describe the discovery directly`,
      `Output only the numbered list`,
    ],
  },
  interaction: {
    header: `# INTERACTION OUTPUT FORMAT\n The response MUST follow this dialogue structure:`,
    lineTemplate: `1. ([Name]) ([Dialogue/Reaction]) ([Emotional Subtext/Body Language]) (Scope) (Importance)`,
    example: `1. (Guard) ("Halt! Who goes there?") (Hand rests on sword hilt, suspicious) (local) (moderate)`,
    rules: [
      `EVERY line MUST follow: ([Name]) ([Speech]) ([Action/Tone]) (Scope) (Importance)`,
      `Keep dialogue punchy and in-character`,
      `Describe body language in parentheses`,
      `Output only the numbered list`,
    ],
  },
};

function getOutputFormat(type = "default") {
  if (!state.outputFormats) {
    state.outputFormats = JSON.parse(JSON.stringify(OUTPUT_FORMATS));
  }
  return state.outputFormats[type] || state.outputFormats["default"];
}

function updateOutputFormat(type, updates) {
  const current = getOutputFormat(type);
  state.outputFormats[type] = { ...current, ...updates };
}

function resetOutputFormat(type = "default") {
  if (!state.outputFormats) {
    state.outputFormats = JSON.parse(JSON.stringify(OUTPUT_FORMATS));
  } else {
    state.outputFormats[type] = JSON.parse(
      JSON.stringify(OUTPUT_FORMATS[type] || OUTPUT_FORMATS.default),
    );
  }
}

// Skill registration system
const SkillRegistry = {
  skills: {},

  /**
   * Register a new skill
   * @param {string} name - Skill name (case-insensitive)
   * @param {Object} config - Skill configuration object
   */
  registerSkill(name, config) {
    const normalizedName = name.toLowerCase().trim();
    this.skills[normalizedName] = {
      name: normalizedName,
      displayName: config.displayName || name,
      description: config.description || "No description available",

      // --- Classification (the modular taxonomy) ---
      // abilityType : "spell" | "skill" | "feat" | "spellstone"
      abilityType: config.abilityType || "skill",
      // magicEffect : "buff" | "heal" | "damage" | "curse" | "hex"
      //   May be a single string or an array when an ability does several things.
      magicEffect: config.magicEffect || deriveMagicEffect(config.effect),
      // targetType : "single" | "aoe" | "multi" | "self" | "party" | "ally"
      targetType: config.targetType || "single",

      // --- Costs / gating ---
      mana: config.mana || 0,
      // cd (cooldown) : number of turns before the ability may be used again.
      //   `cd` is the short alias; `cooldown` is kept for backward compatibility.
      cd: config.cd != null ? config.cd : config.cooldown || 0,
      cooldown: config.cd != null ? config.cd : config.cooldown || 0,
      requirements: config.requirements || {},
      classRestrictions: config.classRestrictions || [],

      // --- Effect payload + modifiers ---
      effect: config.effect || {},
      damageType: config.damageType,
      critChance: config.critChance || 0,
      critDamage: config.critDamage || 0.5,
      healMultiplier: config.healMultiplier || 1,
      barrierMultiplier: config.barrierMultiplier || 1,
      stealthMultiplier: config.stealthMultiplier || 1,
      duration: config.duration,
      range: config.range || "melee",
    };
  },

  /**
   * Get a skill by name
   * @param {string} name - Skill name (case-insensitive)
   * @returns {Object} Skill configuration
   */
  getSkill(name) {
    const normalizedName = name.toLowerCase().trim();
    return this.skills[normalizedName];
  },

  /**
   * Get all available skills
   * @returns {Array} Array of skill configurations
   */
  getAllSkills() {
    return Object.values(this.skills);
  },

  /**
   * Get skills available to a specific class
   * @param {string} className - Class name
   * @returns {Array} Array of skill configurations
   */
  getClassSkills(className) {
    return Object.values(this.skills).filter(
      (skill) =>
        skill.classRestrictions.length === 0 ||
        skill.classRestrictions.includes(className),
    );
  },

  /**
   * Check if a skill is available to a specific class
   * @param {string} skillName - Skill name
   * @param {string} className - Class name
   * @returns {boolean} True if skill is available
   */
  isSkillAvailable(skillName, className) {
    const skill = this.getSkill(skillName);
    if (!skill) return false;
    return (
      skill.classRestrictions.length === 0 ||
      skill.classRestrictions.includes(className)
    );
  },
};

// AbilityRegistry is the preferred name; SkillRegistry is kept as an alias so
// older call sites keep working. Both point at the same store.
const AbilityRegistry = SkillRegistry;

// ---------------------------------------------------------------------------
//  ABILITY HELPER FUNCTIONS  (the "final result" is always built from these)
// ---------------------------------------------------------------------------

// Infer a magicEffect classification from an effect payload when one is not
// declared explicitly on the ability. Returns an array so multi-effect
// abilities (e.g. damage + curse) classify cleanly.
function deriveMagicEffect(effect) {
  if (!effect || typeof effect !== "object") return [];
  const tags = [];
  if (effect.damage) tags.push("damage");
  if (effect.heal || effect.health) tags.push("heal");
  if (effect.barrier || effect.stealth || effect.modifiers) tags.push("buff");
  if (effect.curse) tags.push("curse");
  if (effect.hex) tags.push("hex");
  return tags;
}

// Resolve the canonical definition for an ability by key. The registry is the
// single source of truth; if a player knows a skill that predates the registry
// (old save), we synthesize a def from their stored copy so nothing breaks.
function getAbility(key) {
  if (!key) return null;
  const name = key.toLowerCase().trim();
  const def = AbilityRegistry.getSkill(name);
  if (def) return def;

  const known = state.PS && state.PS.skills ? state.PS.skills[name] : null;
  if (!known) return null;
  return {
    name,
    displayName: known.displayName || key,
    description: known.description || "",
    abilityType: known.abilityType || "skill",
    magicEffect:
      known.magicEffect || deriveMagicEffect(known.effect || known.modifiers),
    targetType: known.targetType || "single",
    mana: (known.effect && known.effect.mana) || 0,
    cd: known.cd || known.cooldown || 0,
    cooldown: known.cd || known.cooldown || 0,
    effect: known.effect || {},
    classRestrictions: known.classRestrictions || [],
  };
}

// ---- Cooldown machinery (per-player, ticked once per turn) ----
// Remaining cooldowns live in state.PS.abilityCooldowns keyed by ability name.
function getAbilityCooldownStore() {
  if (!state.PS) return {};
  if (!state.PS.abilityCooldowns) state.PS.abilityCooldowns = {};
  return state.PS.abilityCooldowns;
}

// Turns left before `key` can be cast again (0 = ready).
function getCooldownRemaining(key) {
  const store = getAbilityCooldownStore();
  return store[key.toLowerCase()] || 0;
}

function isAbilityReady(key) {
  return getCooldownRemaining(key) <= 0;
}

// Put an ability on cooldown for its full `cd` value.
function startCooldown(key, ability) {
  const cd = ability ? ability.cd || ability.cooldown || 0 : 0;
  if (cd > 0) getAbilityCooldownStore()[key.toLowerCase()] = cd;
}

// Decrement every player cooldown by one turn. Call once per turn (Context.js).
function tickAbilityCooldowns() {
  const store = getAbilityCooldownStore();
  for (const name in store) {
    if (store[name] > 0) {
      store[name]--;
      if (store[name] <= 0) {
        delete store[name];
        const a = getAbility(name);
        state.logMessages["Output"].push(
          `🔄 ${a ? a.displayName : name} is ready again.`,
        );
      }
    }
  }
}

// ---- Status effects --------------------------------------------------------
// Chance-based effects the player inflicts on targets. Burn/Poison/Bleed tick
// damage each turn; Chill and Shock are the control pair. Add an effect by
// adding a row here — the proc, tick and expiry are all data-driven.
const STATUS_EFFECTS = {
  burn: {
    name: "Burn",
    icon: "🔥",
    damageType: "fire",
    baseChance: 0.15,
    duration: 3,
    tickPercent: 0.1,
  },
  poison: {
    name: "Poison",
    icon: "☠️",
    damageType: "poison",
    baseChance: 0.15,
    duration: 4,
    tickPercent: 0.08,
  },
  bleed: {
    name: "Bleed",
    icon: "💉",
    damageType: "bleed",
    baseChance: 0.15,
    duration: 3,
    tickPercent: 0.12,
  },
  chill: {
    name: "Chill",
    icon: "❄️",
    damageType: "frost",
    baseChance: 0.15,
    duration: 3,
    slow: 2,
  },
  shock: {
    name: "Shock",
    icon: "⚡",
    damageType: "lightning",
    baseChance: 0.15,
    duration: 2,
    skipChance: 0.35,
  },
};

// An ability's damageType decides which effect it can inflict. "ice" and "cold"
// are aliases the ability registry already uses for frost.
const DAMAGE_TYPE_ALIASES = {
  ice: "frost",
  cold: "frost",
  electric: "lightning",
};
function statusKeyForDamageType(damageType) {
  const type = String(damageType || "").toLowerCase();
  const normalized = DAMAGE_TYPE_ALIASES[type] || type;
  for (const key of Object.keys(STATUS_EFFECTS)) {
    if (STATUS_EFFECTS[key].damageType === normalized) return key;
  }
  return null;
}

// Roll to inflict the status matching `damageType` on `target`. DoT strength
// scales off the hit that applied it. Re-procs refresh duration, never stack.
function rollStatusEffect(target, damageType, hitDamage) {
  if (!target || target.isDead) return null;
  const key = statusKeyForDamageType(damageType);
  if (!key) return null;

  const def = STATUS_EFFECTS[key];
  const chance = def.baseChance + elementChanceBonus(key);
  if (Math.random() >= chance) return null;

  if (!Array.isArray(target.statusEffects)) target.statusEffects = [];
  const tickDamage = def.tickPercent
    ? Math.max(1, Math.round((Number(hitDamage) || 0) * def.tickPercent))
    : 0;

  const existing = target.statusEffects.find((e) => e.key === key);
  if (existing) {
    existing.turns = def.duration; // refresh, don't stack
    existing.tickDamage = Math.max(existing.tickDamage, tickDamage);
  } else {
    target.statusEffects.push({ key, turns: def.duration, tickDamage });
    if (def.slow) target.attackDelay = (target.attackDelay || 0) + def.slow;
  }

  state.logMessages["Output"].push(
    `${def.icon}${target.name} is afflicted with ${def.name}!`,
  );
  return key;
}

// True if the monster's turn is skipped by a Shock proc this turn.
function isStatusStunned(monster) {
  if (!monster || !Array.isArray(monster.statusEffects)) return false;
  return monster.statusEffects.some((e) => {
    const def = STATUS_EFFECTS[e.key];
    return def && def.skipChance && Math.random() < def.skipChance;
  });
}

// Per-turn: tick DoT damage, count down, expire. Called from Context.js.
function tickStatusEffects() {
  if (!state.MS || !Array.isArray(state.MS.activeMonsters)) return;

  for (const monster of [...state.MS.activeMonsters]) {
    if (
      !monster ||
      !Array.isArray(monster.statusEffects) ||
      !monster.statusEffects.length
    )
      continue;

    for (const effect of [...monster.statusEffects]) {
      const def = STATUS_EFFECTS[effect.key];
      if (!def) continue;

      // DoT damage routes through damageMonster so kills use the death path.
      if (effect.tickDamage > 0 && !monster.isDead) {
        damageMonster(
          monster,
          effect.tickDamage,
          { displayName: def.name },
          state.PS ? state.PS.Name : "You",
        );
      }

      effect.turns--;
      if (effect.turns <= 0) {
        monster.statusEffects = monster.statusEffects.filter(
          (e) => e !== effect,
        );
        if (def.slow)
          monster.attackDelay = Math.max(
            0,
            (monster.attackDelay || 0) - def.slow,
          );
        state.logMessages["Output"].push(
          `${def.icon}${monster.name} recovers from ${def.name}.`,
        );
      }
    }
  }
}

// ---- Target resolution ----
// Returns { monsters: [...], hitsSelf: bool, companions: [...] } based on the
// ability's targetType.
//   single        -> one monster (named in text, else last target, else first)
//   aoe | multi   -> every active monster
//   self          -> the player only
//   ally          -> one companion (named in text, else the most wounded)
//   party         -> the player AND every living companion
// See the ALLY SYSTEM block for the roster (state.Party).
function resolveAbilityTargets(ability, text) {
  const tt = (ability.targetType || "single").toLowerCase();
  const monsters = (state.MS && state.MS.activeMonsters) || [];

  if (tt === "self") {
    return { monsters: [], hitsSelf: true, companions: [] };
  }

  // ---- ALLY SYSTEM ----
  if (tt === "party") {
    return { monsters: [], hitsSelf: true, companions: getLivingCompanions() };
  }

  if (tt === "ally") {
    const living = getLivingCompanions();
    // No one to support falls back to the caster, so the cast is never wasted.
    if (!living.length) return { monsters: [], hitsSelf: true, companions: [] };
    const lowerAllyText = (text || "").toLowerCase();
    const named = living.find((c) =>
      lowerAllyText.includes(c.name.toLowerCase()),
    );
    // Unnamed: help whoever needs it most.
    const chosen =
      named ||
      living
        .slice()
        .sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
    return { monsters: [], hitsSelf: false, companions: [chosen] };
  }

  if (tt === "aoe" || tt === "multi") {
    return { monsters: monsters.slice(), hitsSelf: false, companions: [] };
  }

  // single (default)
  const lowerText = (text || "").toLowerCase();
  let target = monsters.find((m) => lowerText.includes(m.name.toLowerCase()));
  if (!target && state.MS && state.MS.lastTarget) {
    target = monsters.find((m) => m.name.toLowerCase() === state.MS.lastTarget);
  }
  if (!target) target = monsters[0];
  return { monsters: target ? [target] : [], hitsSelf: false, companions: [] };
}

// ===========================================================================
//  ABILITY DEFINITIONS — the single place every ability lives.
//  Each entry declares: abilityType (spell|skill|feat|spellstone),
//  magicEffect (buff|heal|damage|curse|hex), targetType, cd (cooldown), mana,
//  and its effect payload. classRestrictions drives which class starts with it.
//  Values below are the level-1 class tunings; bump them freely here.
// ===========================================================================

// ---- Knight (melee skills) ----
SkillRegistry.registerSkill("slash", {
  displayName: "Slash",
  description: "Strong swing of your sword.",
  abilityType: "skill",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 0,
  effect: { damage: 10 },
  damageType: "physical",
  range: "melee",
  classRestrictions: ["knight"],
});
SkillRegistry.registerSkill("bash", {
  displayName: "Bash",
  description: "Shield attack that rattles a foe.",
  abilityType: "skill",
  magicEffect: "damage",
  targetType: "single",
  mana: -20,
  cd: 1,
  effect: { damage: 15 },
  damageType: "physical",
  range: "melee",
  classRestrictions: ["knight"],
});

// ---- Wizard (arcane spells) ----
SkillRegistry.registerSkill("fireball", {
  displayName: "Fireball",
  description: "A fire spell that scorches a single target.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "single",
  mana: -10,
  cd: 2,
  effect: { damage: 15 },
  damageType: "fire",
  critChance: 0.15,
  critDamage: 0.75,
  range: "ranged",
  classRestrictions: ["wizard"],
});
SkillRegistry.registerSkill("iceshot", {
  displayName: "Ice Shot",
  description: "An ice spell that chills a single target.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 1,
  effect: { damage: 10 },
  damageType: "ice",
  range: "ranged",
  classRestrictions: ["wizard"],
});

// ---- Druid ----
SkillRegistry.registerSkill("lifespring", {
  displayName: "Lifespring",
  description: "Low level healing spell.",
  abilityType: "spell",
  magicEffect: "heal",
  targetType: "self",
  mana: -15,
  cd: 2,
  effect: { heal: 15 },
  healMultiplier: 1,
  classRestrictions: ["druid"],
});
SkillRegistry.registerSkill("spore", {
  displayName: "Spore",
  description: "Lesser poison spell.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 2,
  effect: { damage: 10 },
  damageType: "poison",
  range: "ranged",
  classRestrictions: ["druid"],
});
SkillRegistry.registerSkill("summon wolf", {
  displayName: "Summon wolf",
  description: "Calls forth a spirit wolf to fight for you.",
  abilityType: "spell",
  magicEffect: "buff",
  targetType: "self",
  mana: -15,
  cd: 8,
  effect: { summon: "wolf" },
  range: "ranged",
  classRestrictions: ["druid"],
});

// ---- Rogue ----
SkillRegistry.registerSkill("backstab", {
  displayName: "Backstab",
  description: "Teleporting attack from the shadows.",
  abilityType: "skill",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 2,
  effect: { damage: 20 },
  damageType: "physical",
  range: "melee",
  critChance: 0.25,
  critDamage: 0.8,
  classRestrictions: ["rogue"],
});
SkillRegistry.registerSkill("stealth", {
  displayName: "Stealth",
  description: "Fade from sight; monsters lose your position.",
  abilityType: "skill",
  magicEffect: "buff",
  targetType: "self",
  mana: -15,
  cd: 5,
  effect: { stealth: 100 },
  stealthMultiplier: 1.3,
  duration: 30,
  classRestrictions: ["rogue"],
});

// ---- Cleric ----
SkillRegistry.registerSkill("heal", {
  displayName: "Heal",
  description: "A strong heal spell.",
  abilityType: "spell",
  magicEffect: "heal",
  targetType: "self",
  mana: -15,
  cd: 2,
  effect: { heal: 15 },
  healMultiplier: 1.2,
  classRestrictions: ["cleric"],
});
SkillRegistry.registerSkill("smite", {
  displayName: "Smite",
  description: "Call down holy judgement on a creature.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 1,
  effect: { damage: 15 },
  damageType: "holy",
  range: "ranged",
  classRestrictions: ["cleric"],
});

// ---- Barbarian ----
SkillRegistry.registerSkill("twin slash", {
  displayName: "Twin Slash",
  description: "A swing of both swords.",
  abilityType: "skill",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 1,
  effect: { damage: 20 },
  damageType: "physical",
  range: "melee",
  classRestrictions: ["barbarian"],
});
SkillRegistry.registerSkill("furry", {
  displayName: "Fury",
  description: "Work into a fury, boosting your damage.",
  abilityType: "feat",
  magicEffect: "buff",
  targetType: "self",
  mana: -15,
  cd: 3,
  effect: { modifiers: { damage: 10 } },
  duration: 20,
  classRestrictions: ["barbarian"],
});

// ---- Battlemage ----
SkillRegistry.registerSkill("barrier", {
  displayName: "Barrier",
  description: "Raise a barrier that absorbs damage.",
  abilityType: "spell",
  magicEffect: "buff",
  targetType: "self",
  mana: -10,
  cd: 3,
  effect: { barrier: 15 },
  barrierMultiplier: 1.1,
  duration: 15,
  classRestrictions: ["battlemage"],
});
SkillRegistry.registerSkill("judicar", {
  displayName: "Judicar",
  description: "A ranged burst of arcane force.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 2,
  effect: { damage: 15 },
  damageType: "arcane",
  range: "ranged",
  classRestrictions: ["battlemage"],
});

// ---- Revanant (blood magic — spends health) ----
SkillRegistry.registerSkill("blood rend", {
  displayName: "Blood Rend",
  description: "Carve the foe open, paying your own blood for power.",
  abilityType: "skill",
  magicEffect: "damage",
  targetType: "single",
  mana: 0,
  cd: 1,
  effect: { healthCost: 10, damage: 25 },
  damageType: "bleed",
  range: "melee",
  classRestrictions: ["revanant"],
});
SkillRegistry.registerSkill("empower", {
  displayName: "Empower",
  description: "Burn your vitality to sharpen every strike.",
  abilityType: "feat",
  magicEffect: "buff",
  targetType: "self",
  mana: 0,
  cd: 6,
  effect: { healthCost: 15, modifiers: { "physical damage": 15 } },
  duration: 20,
  classRestrictions: ["revanant"],
});
SkillRegistry.registerSkill("mend", {
  displayName: "Mend",
  description: "Knit your wounds closed with a surge of vitality.",
  abilityType: "spell",
  magicEffect: "heal",
  targetType: "self",
  mana: -15,
  cd: 8,
  effect: { heal: 25 },
  healMultiplier: 1,
  classRestrictions: ["revanant"],
});

// ---- Necromancer (summons + decay) ----
// `summon` / `summonCorpse` payloads are handled by applySummonEffect in the
// ALLY SYSTEM block; everything else here rides the normal damage/heal dispatch.
SkillRegistry.registerSkill("summon skeleton", {
  displayName: "Summon Skeleton",
  description: "Call a skeletal warrior from the earth to fight beside you.",
  abilityType: "spell",
  magicEffect: "buff",
  targetType: "self",
  mana: -25,
  cd: 4,
  effect: { summon: "skeleton" },
  range: "ranged",
  classRestrictions: ["necromancer"],
});
SkillRegistry.registerSkill("decay", {
  displayName: "Decay",
  description: "Rot a foe from the inside with creeping void.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "single",
  mana: -15,
  cd: 2,
  effect: { damage: 14 },
  damageType: "void",
  range: "ranged",
  classRestrictions: ["necromancer"],
});
SkillRegistry.registerSkill("soul drain", {
  displayName: "Soul Drain",
  description: "Tear vitality from a foe and pull it into yourself.",
  abilityType: "spell",
  magicEffect: ["damage", "heal"],
  targetType: "single",
  mana: -20,
  cd: 3,
  effect: { damage: 12, heal: 10 },
  damageType: "void",
  range: "ranged",
  classRestrictions: ["necromancer"],
});

// ---- Unlockable / advanced (no class restriction) ----
SkillRegistry.registerSkill("raise thrall", {
  displayName: "Raise Thrall",
  description: "Drag a slain creature back up as your servant.",
  abilityType: "spell",
  magicEffect: "buff",
  targetType: "self",
  mana: -30,
  cd: 6,
  effect: { summonCorpse: true },
  range: "ranged",
});
SkillRegistry.registerSkill("thunderbolt", {
  displayName: "Thunderbolt",
  description: "A powerful lightning strike.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "single",
  mana: -25,
  cd: 4,
  effect: { damage: 40 },
  damageType: "lightning",
  critChance: 0.2,
  critDamage: 0.8,
  range: "ranged",
});

// ---- Taxonomy templates: aoe / feat / spellstone / curse / hex ----
// These demonstrate every ability slot and give the effect helpers something
// to dispatch on. Tune or remove as the systems get fleshed out.
SkillRegistry.registerSkill("flamewave", {
  displayName: "Flame Wave",
  description: "Fire that washes over every enemy.",
  abilityType: "spell",
  magicEffect: "damage",
  targetType: "aoe",
  mana: -30,
  cd: 4,
  effect: { damage: 18 },
  damageType: "fire",
  range: "ranged",
});
SkillRegistry.registerSkill("weaken", {
  displayName: "Weaken",
  description: "A curse that saps a foe's strength.",
  abilityType: "spell",
  magicEffect: "curse",
  targetType: "single",
  mana: -12,
  cd: 3,
  effect: { curse: { damage: -5 } },
  duration: 10,
  range: "ranged",
});
SkillRegistry.registerSkill("hex of frailty", {
  displayName: "Hex of Frailty",
  description: "A lingering hex that weakens defenses.",
  abilityType: "spell",
  magicEffect: "hex",
  targetType: "single",
  mana: -14,
  cd: 3,
  effect: { hex: { vulnerability: 0.1 } },
  duration: 8,
  range: "ranged",
});
SkillRegistry.registerSkill("emberstone", {
  displayName: "Ember Spellstone",
  description: "A spellstone that unleashes stored fire.",
  abilityType: "spellstone",
  magicEffect: "damage",
  targetType: "single",
  mana: 0,
  cd: 6,
  effect: { damage: 25 },
  damageType: "fire",
  range: "ranged",
});

//===================================================================\\
//                          ALLY  SYSTEM                             \\
//                                                                   \\
//  One entity covers both kinds of companion:                       \\
//    kind "ally"   -> an NPC recruited into the party               \\
//    kind "summon" -> a creature called up by an ability            \\
//                                                                   \\
//  Roster : state.Party                                             \\
//  Cards  : one per companion, TAGGED BY KIND via the card `type`   \\
//           field ("Party Member" / "Summon"), refreshed every turn \\
//           by updateCompanionCards().                              \\
//                                                                   \\
//  Entry points:                                                    \\
//    recruitAlly(name, roleHint)   <- /recruit + text detection     \\
//    dismissCompanion(name)        <- /dismiss                      \\
//    applySummonEffect(ability)    <- useSkill, effect.summon       \\
//    companionCombatTick()         <- Context.js, once per turn     \\
//    updateCompanionCards()        <- Input.js + Output.js          \\
//                                                                   \\
//  Grep "ALLY SYSTEM" to find every touch point across the suite.   \\
//===================================================================\\

// The roster lives on state so it survives the turn. Kept next to the ally
// code rather than the state.MS block so the whole system reads in one place.
if (!Array.isArray(state.Party)) state.Party = [];
if (typeof state.companionSeq !== "number") state.companionSeq = 0;

// How many recruited NPCs may follow the player at once.
const MAX_PARTY = 3;

// Story Card `type` per companion kind. This is the "tag" that separates a
// party member from a summon in the Story Cards view (AID never shows `type`
// to the AI, it is purely organisational — see 04-story-cards/card-anatomy.md).
const COMPANION_CARD_TYPES = { ally: "Party Member", summon: "Summon" };

// Active-summon cap by class. Summons are permanent until killed, so the cap —
// not a duration — is what bounds them. Necromancers command a small host.
const SUMMON_CAPS = { necromancer: 3, druid: 2, default: 1 };
function summonCapFor(className) {
  const key = String(className || "")
    .toLowerCase()
    .trim();
  return SUMMON_CAPS[key] != null ? SUMMON_CAPS[key] : SUMMON_CAPS.default;
}

// ---- Templates -------------------------------------------------------------
// Base stats at player level 1; createCompanion scales them from there. Add a
// companion type by adding a row — nothing else needs to change.
const NPC_ALLY_TEMPLATES = {
  guard: {
    role: "guard",
    health: 70,
    damage: 6,
    damageMax: 10,
    damageType: "physical",
    range: "melee",
    armor: 25,
    magicRes: 5,
    description: "A steady shield-bearer who holds the line.",
  },
  scout: {
    role: "scout",
    health: 45,
    damage: 7,
    damageMax: 12,
    damageType: "physical",
    range: "ranged",
    armor: 8,
    magicRes: 5,
    description: "Quick eyes and a quicker bow.",
  },
  mercenary: {
    role: "mercenary",
    health: 60,
    damage: 9,
    damageMax: 14,
    damageType: "physical",
    range: "melee",
    armor: 15,
    magicRes: 5,
    description: "Paid steel. Fights hard while the coin lasts.",
  },
  healer: {
    role: "healer",
    health: 40,
    damage: 3,
    damageMax: 6,
    damageType: "holy",
    range: "ranged",
    armor: 5,
    magicRes: 20,
    description: "Mends wounds between the blows.",
  },
  mage: {
    role: "mage",
    health: 38,
    damage: 10,
    damageMax: 16,
    damageType: "fire",
    range: "ranged",
    armor: 5,
    magicRes: 25,
    description: "Trades fragility for firepower.",
  },
  rogue: {
    role: "rogue",
    health: 45,
    damage: 8,
    damageMax: 15,
    damageType: "physical",
    range: "melee",
    armor: 8,
    magicRes: 5,
    description: "Strikes where the armour is thin.",
  },
  traveler: {
    role: "traveler",
    health: 50,
    damage: 5,
    damageMax: 9,
    damageType: "physical",
    range: "melee",
    armor: 10,
    magicRes: 5,
    description: "An ordinary soul walking a dangerous road.",
  },
};

const SUMMON_TEMPLATES = {
  skeleton: {
    role: "skeleton",
    health: 45,
    damage: 7,
    damageMax: 12,
    damageType: "physical",
    range: "melee",
    armor: 12,
    magicRes: 10,
    description: "Bound bones held together by will alone.",
  },
  "skeletal archer": {
    role: "skeletal archer",
    health: 35,
    damage: 8,
    damageMax: 13,
    damageType: "physical",
    range: "ranged",
    armor: 6,
    magicRes: 10,
    description: "A dry-boned marksman that never tires.",
  },
  "bone knight": {
    role: "bone knight",
    health: 80,
    damage: 10,
    damageMax: 16,
    damageType: "void",
    range: "melee",
    armor: 30,
    magicRes: 20,
    description: "Armoured death, risen whole.",
  },
  thrall: {
    role: "thrall",
    health: 40,
    damage: 6,
    damageMax: 10,
    damageType: "void",
    range: "melee",
    armor: 10,
    magicRes: 10,
    description: "A corpse dragged back into service.",
  },
};

// Words in a recruit phrase that hint at which template to use.
function templateForRoleHint(hint) {
  const h = String(hint || "").toLowerCase();
  for (const key of Object.keys(NPC_ALLY_TEMPLATES)) {
    if (h.includes(key)) return NPC_ALLY_TEMPLATES[key];
  }
  // A few common synonyms that do not match a template key directly.
  if (/\b(soldier|knight|warrior|sentry)\b/.test(h))
    return NPC_ALLY_TEMPLATES.guard;
  if (/\b(ranger|hunter|archer|tracker)\b/.test(h))
    return NPC_ALLY_TEMPLATES.scout;
  if (/\b(priest|cleric|medic|acolyte)\b/.test(h))
    return NPC_ALLY_TEMPLATES.healer;
  if (/\b(wizard|sorcerer|witch|mystic)\b/.test(h))
    return NPC_ALLY_TEMPLATES.mage;
  if (/\b(thief|cutpurse|assassin)\b/.test(h)) return NPC_ALLY_TEMPLATES.rogue;
  if (/\b(sellsword|hireling)\b/.test(h)) return NPC_ALLY_TEMPLATES.mercenary;
  return NPC_ALLY_TEMPLATES.traveler;
}

// ---- Roster helpers --------------------------------------------------------
function getParty() {
  if (!Array.isArray(state.Party)) state.Party = [];
  return state.Party;
}

function getLivingCompanions() {
  return getParty().filter((c) => c && !c.isDead && c.health > 0);
}

function getCompanionsByKind(kind) {
  return getLivingCompanions().filter((c) => c.kind === kind);
}

function findCompanion(name) {
  const needle = String(name || "")
    .toLowerCase()
    .trim();
  if (!needle) return null;
  return (
    getLivingCompanions().find((c) => c.name.toLowerCase() === needle) ||
    getLivingCompanions().find((c) => c.name.toLowerCase().includes(needle)) ||
    null
  );
}

// Title-case a raw name pulled out of player text ("kaela" -> "Kaela").
function normalizeCompanionName(raw) {
  return String(raw || "")
    .replace(/[^a-zA-Z0-9 '\-]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ---- Construction ----------------------------------------------------------
// Shaped like a monster (health/damage/enemyDefenses/statusEffects) so the
// existing combat helpers — damageMonster, resolveReach — accept a companion
// as either attacker or target without special cases.
function createCompanion(options) {
  const opts = options || {};
  const template = opts.template || NPC_ALLY_TEMPLATES.traveler;
  const playerLevel = (state.PS && state.PS.level) || 1;
  const level = opts.level != null ? opts.level : playerLevel;
  // Same shape of scaling createMonster uses, so companions keep pace.
  const mult = 1 + level * 0.1;

  state.companionSeq = (state.companionSeq || 0) + 1;

  const maxHealth = Math.max(1, Math.round(template.health * mult));

  return {
    id: `companion_${state.companionSeq}`,
    name: opts.name || normalizeCompanionName(template.role) || "Companion",
    kind: opts.kind === "summon" ? "summon" : "ally",
    role: template.role,
    description: template.description || "",
    level: Math.max(1, Math.round(level)),
    health: maxHealth,
    maxHealth: maxHealth,
    damage: Math.max(1, Math.round(template.damage * mult)),
    damageMax: Math.max(1, Math.round(template.damageMax * mult)),
    damageType: template.damageType || "physical",
    range: template.range || "melee",
    baseRange: template.range === "ranged" ? 40 : 5,
    speed: template.speed || 10,
    distance: 50,
    armor: Math.max(0, Math.round((template.armor || 0) * mult)),
    magicRes: Math.min(95, Math.max(0, template.magicRes || 0)),
    isDead: false,
    status: "following",
    state: "Idle",
    nearTarget: "None",
    // Allies have morale; summons obey unconditionally.
    loyalty: opts.kind === "summon" ? null : 3,
    source: opts.source || (opts.kind === "summon" ? "summoned" : "recruited"),
    statusEffects: [],
    cardKeys: null,
  };
}

// ---- Story cards -----------------------------------------------------------
function companionLocation() {
  return (state.PS && state.PS.location) || "unknown";
}

function buildCompanionEntry(c) {
  const owner = (state.PS && state.PS.Name) || "the adventurer";
  const kindLabel = c.kind === "summon" ? "summon" : "party member";
  const lines = [
    `${c.name} is a ${c.role} travelling with ${owner} as a ${kindLabel}.`,
    c.description,
    `> Kind: ${c.kind}`,
    `> Role: ${c.role}`,
    `> Level: ${c.level}`,
    `> Health: ${c.health}/${c.maxHealth}`,
    `> Damage: ${c.damage}-${c.damageMax} ${c.damageType}`,
    `> Status: ${c.status}`,
  ];
  if (c.kind === "summon") lines.push(`> Summoned By: ${c.source}`);
  else lines.push(`> Loyalty: ${c.loyalty}`);
  lines.push(`> Location: ${companionLocation()}`);
  return lines.filter(Boolean).join("\n");
}

// Create the companion's card, tagged with the type for its kind. Names can
// collide (two "Skeleton"s), so the card key carries the roster id to keep the
// lookup unambiguous while the AI still reads the name from the entry.
//
// The kind tag is written in THREE places on purpose, because only one of them
// is guaranteed to survive wherever the card is read:
//   - card `type`  — what AID itself organises by (custom type strings are
//                    legal: 04-story-cards/card-anatomy.md)
//   - card title   — free text, so it stays legible in any card list, including
//                    ones that only understand a fixed set of types
//   - `> Kind:`    — inside the entry, so the AI and readSettings both see it
// addStoryCard is called directly (not via StoryCards.find) because find()
// passes only keys/entry/type through and we need the title, exactly as
// addPlayerSummary does for the player's own card.
function createCompanionCard(c) {
  c.cardKeys = `${c.name}`;
  if (CommunityUtils.StoryCards.find(c.cardKeys)) {
    // Key already taken by another card (or another summon of the same
    // name) — disambiguate rather than hijacking someone else's card.
    c.cardKeys = `${c.name} (${c.role} ${c.id.replace("companion_", "#")})`;
  }
  const tag = COMPANION_CARD_TYPES[c.kind];
  addStoryCard(
    c.cardKeys,
    buildCompanionEntry(c),
    tag,
    `[${tag}] ${c.name}`,
    `${c.kind} · ${c.role} · travelling with ${(state.PS && state.PS.Name) || "the player"}`,
  );
  return c.cardKeys;
}

// Refresh the volatile lines on every companion card. Called from the same two
// hooks that sync the player card (Input.js basecode, Output.js BaseOut), which
// is what keeps the cards continuously up to date.
function updateCompanionCards() {
  for (const c of getParty()) {
    if (!c || !c.cardKeys) continue;
    const card = CommunityUtils.StoryCards.find(c.cardKeys);
    if (!card) continue;
    CommunityUtils.StoryCards.setSettings(card, "Level", c.level);
    CommunityUtils.StoryCards.setSettings(
      card,
      "Health",
      `${Math.max(0, c.health)}/${c.maxHealth}`,
    );
    CommunityUtils.StoryCards.setSettings(
      card,
      "Damage",
      `${c.damage}-${c.damageMax} ${c.damageType}`,
    );
    CommunityUtils.StoryCards.setSettings(card, "Status", c.status);
    CommunityUtils.StoryCards.setSettings(
      card,
      "Location",
      companionLocation(),
    );
    if (c.kind === "ally")
      CommunityUtils.StoryCards.setSettings(card, "Loyalty", c.loyalty);
  }
}

// Retire rather than delete. The app's mergeScriptStoryCards updates and appends
// cards but never removes them, so removeStoryCard here would leave a stale card
// in the Story Cards view claiming a dead companion is alive. Rewriting the
// status is the change that actually reaches the user.
function retireCompanionCard(c, status) {
  if (!c || !c.cardKeys) return;
  const card = CommunityUtils.StoryCards.find(c.cardKeys);
  if (!card) return;
  CommunityUtils.StoryCards.setSettings(card, "Health", `0/${c.maxHealth}`);
  CommunityUtils.StoryCards.setSettings(card, "Status", status);
}

// ---- Recruiting ------------------------------------------------------------
// Reached from the /recruit command AND from narrative phrase detection, so the
// membership rules live here and neither caller can bypass them.
function recruitAlly(rawName, roleHint) {
  if (!state.PS || !state.PS.Name) return null;

  const name = normalizeCompanionName(rawName);
  if (!name) {
    state.logMessages["Output"].push(`[Who do you want to recruit?]`);
    return null;
  }

  if (findCompanion(name)) {
    state.logMessages["Output"].push(
      `[${name} is already travelling with you.]`,
    );
    return null;
  }

  if (getCompanionsByKind("ally").length >= MAX_PARTY) {
    state.logMessages["Output"].push(
      `[Your party is full (${MAX_PARTY}). Dismiss someone before recruiting ${name}.]`,
    );
    return null;
  }

  // The hint is whatever the player typed; fall back to the name itself so
  // "recruit the town guard" still lands on the guard template.
  const template = templateForRoleHint(`${roleHint || ""} ${name}`);
  const companion = createCompanion({
    name,
    kind: "ally",
    template,
    source: "recruited",
  });

  getParty().push(companion);
  createCompanionCard(companion);

  state.logMessages["Output"].push(
    `🤝${name} the ${companion.role} joins your party!|❤️${companion.health}/${companion.maxHealth}`,
  );
  state.logMessages["Input"].push(
    `${name} the ${companion.role} has joined ${state.PS.Name}.`,
  );
  return companion;
}

function dismissCompanion(rawName) {
  const companion = findCompanion(rawName);
  if (!companion) {
    state.logMessages["Output"].push(
      `[No one named "${rawName}" is travelling with you.]`,
    );
    return false;
  }
  const status = companion.kind === "summon" ? "unsummoned" : "departed";
  companion.isDead = true;
  companion.status = status;
  retireCompanionCard(companion, status);
  state.Party = getParty().filter((c) => c !== companion);
  state.logMessages["Output"].push(
    companion.kind === "summon"
      ? `[${companion.name} unravels and returns to dust.]`
      : `[${companion.name} parts ways with you.]`,
  );
  return true;
}

// Roster readout for the /party command.
function displayParty() {
  const living = getLivingCompanions();
  if (!living.length) return `\n👥Party\nYou travel alone.`;
  const lines = living.map(
    (c) =>
      `- ${c.name} (${c.kind === "summon" ? "summon" : "ally"} · ${c.role} · Lv ${c.level}) ` +
      `HP ${Math.max(0, c.health)}/${c.maxHealth} · DMG ${c.damage}-${c.damageMax} ${c.damageType}` +
      (c.kind === "ally" ? ` · Loyalty ${c.loyalty}` : ""),
  );
  const allies = getCompanionsByKind("ally").length;
  const summons = getCompanionsByKind("summon").length;
  return (
    `\n👥Party (${allies}/${MAX_PARTY} allies, ${summons}/${summonCapFor(state.PS && state.PS.Class)} summons)\n` +
    lines.join("\n")
  );
}

// ---- Summoning -------------------------------------------------------------
// Dispatched from useSkill for any ability whose effect carries `summon` (a
// template key) or `summonCorpse` (raise the most recent kill). Mana, cooldown,
// class and known-skill checks have all already run by the time we get here.
function applySummonEffect(ability, PlayerName) {
  const eff = ability.effect || {};
  let template = null;
  let sourceLabel = ability.displayName || ability.name;

  if (eff.summonCorpse) {
    const corpse =
      state.MS && Array.isArray(state.MS.corpses)
        ? state.MS.corpses.pop()
        : null;
    if (!corpse) {
      state.logMessages["Output"].push(
        `[There is no corpse fresh enough to raise.]`,
      );
      return false;
    }
    // Build the thrall out of the dead thing's own stats, at a fraction.
    const base = SUMMON_TEMPLATES.thrall;
    template = {
      role: `${corpse.name.toLowerCase()} thrall`,
      health: Math.max(
        base.health,
        Math.round((corpse.maxHealth || base.health) * 0.6),
      ),
      damage: Math.max(
        base.damage,
        Math.round((corpse.damage || base.damage) * 0.6),
      ),
      damageMax: Math.max(
        base.damageMax,
        Math.round((corpse.damageMax || base.damageMax) * 0.6),
      ),
      damageType: "void",
      range: "melee",
      armor: base.armor,
      magicRes: base.magicRes,
      description: `The reanimated husk of a ${corpse.name}, bound to ${PlayerName}.`,
    };
    sourceLabel = `${sourceLabel} (${corpse.name})`;
  } else {
    template = SUMMON_TEMPLATES[String(eff.summon || "").toLowerCase()];
    if (!template) {
      // Recoverable authoring error: the ability names a template that
      // does not exist. Surface it rather than failing silently.
      console.error(
        `applySummonEffect: unknown summon template "${eff.summon}" on ability "${ability.name}".`,
      );
      return false;
    }
  }

  // Summons are permanent until killed, so the cap is the only limit. At the
  // cap the OLDEST summon crumbles to make room — casting never just fails.
  const cap = summonCapFor(state.PS && state.PS.Class);
  const active = getCompanionsByKind("summon");
  if (active.length >= cap) {
    const oldest = active[0];
    oldest.isDead = true;
    oldest.status = "unsummoned";
    retireCompanionCard(oldest, "unsummoned");
    state.Party = getParty().filter((c) => c !== oldest);
    state.logMessages["Output"].push(
      `[${oldest.name} crumbles as a new servant takes its place.]`,
    );
  }

  // Name the summon so multiples are tellable apart in the story.
  const ordinal = (state.companionSeq || 0) + 1;
  const name =
    normalizeCompanionName(template.role) + (cap > 1 ? ` ${ordinal}` : "");

  const companion = createCompanion({
    name,
    kind: "summon",
    template,
    source: sourceLabel,
  });
  getParty().push(companion);
  createCompanionCard(companion);

  state.logMessages["Output"].push(
    `💀${PlayerName} raises ${companion.name}!|❤️${companion.health}/${companion.maxHealth}|⚔️${companion.damage}-${companion.damageMax}`,
  );
  makelog("Input", `\n${PlayerName} summons ${companion.name}.`);
  return true;
}

// ---- Taking damage ---------------------------------------------------------
// Mirrors applyDamage for the player, minus barrier and the permadeath branch.
function damageCompanion(c, amount, source, distance = 0) {
  if (!c || c.isDead) return;

  // Proximity scaling: Melee range (dist < 30) = 100%, Ranged/Far = 80%
  const scaledAmount = distance < 30 ? amount : amount * 0.8;
  const dealt = Math.max(0, Math.floor(scaledAmount));
  // Companions mitigate with the same armour curve the damage model uses.
  const mitigated = Math.max(
    1,
    Math.round(dealt * (1 - c.armor / (c.armor + 400))),
  );

  c.health -= mitigated;
  state.logMessages["Output"].push(
    `💥${c.name}|Taken:${mitigated} damage${source ? ` from ${source}` : ""}!|❤️${Math.max(0, c.health)}/${c.maxHealth}`,
  );

  if (c.health <= 0) companionDies(c, source);
}

function companionDies(c, cause) {
  c.health = 0;
  c.isDead = true;
  c.status = c.kind === "summon" ? "destroyed" : "slain";
  retireCompanionCard(c, c.status);
  state.Party = getParty().filter((x) => x !== c);
  state.logMessages["Output"].push(
    c.kind === "summon"
      ? `☠️${c.name} is destroyed${cause ? ` by ${cause}` : ""} and collapses into dust.`
      : `☠️${c.name} falls${cause ? ` to ${cause}` : ""}.`,
  );
  state.logMessages["Input"].push(`${c.name} has fallen.`);
}

// ---- Per-turn combat -------------------------------------------------------
// Runs once per turn from Context.js, next to tickStatusEffects. It is
// deliberately self-contained rather than threaded through startMonsterAttacks
// or AutoCombat: neither of those is wired into a hook today, and both have
// standing bugs (AutoCombat calls a monsterAttack() that does not exist).
//
// The player's own damage still comes from playerAttack's counter-attack, so
// this tick only adds monster swings AT COMPANIONS — companions draw fire
// rather than changing how hard the player gets hit.
function companionCombatTick() {
  if (!state.PS || !state.PS.Name) return;
  const living = getLivingCompanions();
  if (!living.length) return;

  const monsters = ((state.MS && state.MS.activeMonsters) || []).filter(
    (m) => m && m.health > 0 && !m.isDead,
  );
  if (!monsters.length) {
    for (const c of living) c.state = "Idle";
    return;
  }
  // Nothing fights in town.
  if (state.PS.playerloc === "safe area" && state.PS.location === "safe haven")
    return;

  // --- Movement Phase ---
  for (const c of living) processEntityMovement(c);
  for (const m of monsters) processEntityMovement(m);

  // --- Companion attack phase ---
  for (const c of living) {
    if (c.isDead) continue;

    if (c.kind === "summon" && c.directedAction === "stay") {
      c.state = "Idle";
      continue;
    }

    // Prefer whatever the player is already fighting, so the party focuses.
    let target = null;
    if (c.kind === "summon" && c.directedTarget) {
      target = monsters.find(
        (m) => m.name.toLowerCase() === String(c.directedTarget).toLowerCase() && m.health > 0,
      );
    }
    if (!target && state.MS.lastTarget) {
      target = monsters.find(
        (m) =>
          m.name.toLowerCase() === String(state.MS.lastTarget).toLowerCase() &&
          m.health > 0,
      );
    }
    if (!target) target = monsters.find((m) => m.health > 0);
    if (!target) break;

    // Melee companions must be in reach; ranged ones always connect.
    if (!SpatialManager.calculateReach(c, target)) {
      c.state = "Approaching";
      state.logMessages["Output"].push(`[${c.name} closes on ${target.name}.]`);
      continue;
    }

    c.state = "Fighting";
    const amount = getRandomInt(c.damage, c.damageMax);
    // Routed through damageMonster so kills take the normal death path —
    // the player still gets the XP, the loot and the monster core.
    damageMonster(
      target,
      amount,
      { displayName: `${c.name}'s attack`, damageType: c.damageType },
      c.name,
    );
  }

  // --- Monster retaliation phase (companions only) ---
  const stillAlive = getLivingCompanions();
  if (!stillAlive.length) return;

  for (const m of monsters) {
    if (!m || m.health <= 0 || m.isDead) continue;
    if (isStatusStunned(m)) continue;
    // Not every monster peels off the player; roughly half go for the party.
    if (Math.random() < 0.5) continue;

    const defenders = getLivingCompanions();
    if (!defenders.length) return;
    const defender = defenders[getRandomInt(0, defenders.length - 1)];
    const dmg = getRandomInt(m.damage || 1, m.damageMax || (m.damage || 1) + 5);
    damageCompanion(defender, dmg, m.name);
  }
}

//===================================================================\\
//                     END OF ALLY SYSTEM                            \\
//===================================================================\\

//-------------------------------------------------------------------\\
// regex code explinations
// How it works:
// /.../             -> Standard regex delimiters.
// [\s\.\?!,;]       -> Matches one of the following: whitespace (\s), period (\.), question mark (\?), etc.
// +                  -> Matches one or more of the preceding characters.
// $                  -> Matches the end of the string.
const Regex_input = /[\s\.\?!,;]+$/;
//-------------------------------------------------------------------\\
//-------------------------------------------------------------------\\
const Regex_action = /^(do|say|story)\s/i;
// How it works:
// ^                  -> Matches the beginning of the string.
// (do|say|story)     -> Matches 'do', 'say', or 'story' explicitly.
// \s                 -> Matches a single whitespace character after the prefix.
// /i                 -> Makes the entire match case-insensitive (e.g., "Do" or "dO" will match).
//-------------------------------------------------------------------\\
const Rbracelet_text = /[\(\[]([^\]\)]*)[\)\]]/g;
// How it works:
// [\(\[]            -> Matches an opening parenthesis ( or bracket [.
// ( ... )          -> Captures the inner text.
// [^\]\)]* -> Matches any character *except* a closing bracket or parenthesis, zero or more times.
// [\)\]]            -> Matches a closing parenthesis ) or bracket ].
// /g                 -> Global flag, finds *all* matches, not just the first one.
//-------------------------------------------------------------------\\

function censor(text, targetstr) {
  for (
    let idx = text.indexOf(targetstr);
    -1 < idx;
    idx = text.indexOf(targetstr, idx)
  ) {
    let jdx = text.indexOf("\n>", idx + 1);
    let result = text.slice(0, idx);
    if (-1 < jdx) {
      result += text.slice(jdx);
    }
    text = result;
  }
  return text;
}

function normalizeInput(text) {
  return text
    .replace(/^you\s+/i, "") // remove "You "
    .replace(/[.!?]+$/, "") // strip punctuation
    .trim()
    .toLowerCase();
}

// Inject a string to the AI context
// How to call the insert after world lore fuction text = insertAfterWorldLore(text, `Text you want inserted`) be sure to add text infront for what it is
function insertAfterWorldLore(text, insertString) {
  const target = "World Lore:\n";
  const index = text.indexOf(target);
  //log("index: " + index);
  //log("insertString: " + insertString);

  if (!text.includes(insertString)) {
    if (index !== -1) {
      return (
        text.slice(0, index + target.length) +
        insertString +
        "\n" +
        text.slice(index + target.length)
      );
    } else {
      log("Added World Lore");
      text = "World Lore:\n" + insertString + "\n" + text;
    }
  }

  return text;
}

// Put this in your Library

/*
 * JackHiddenStoryCards(text)
 * Iterates through all AI Dungeon story cards.
 * Applies JackHideText to each story card entry field.
 * Updates a story card only if its entry content changes.
 * Returns the main text with all hidden blocks decoded.
 */
function JackHiddenStoryCards(text) {
  for (let i = 0; i < storyCards.length; i++) {
    let card = storyCards[i];
    if (!card || typeof card.entry !== "string") continue;

    const originalEntry = card.entry;
    const processedEntry = JackHideText(originalEntry);

    if (processedEntry === originalEntry) continue;

    updateStoryCard(
      i,
      card.keys,
      processedEntry,
      card.type,
      card.title,
      card.description,
    );
  }
  return JackUnhideText(text);
}

/*
 * JackHideText(text)
 * Scans text line by line for control labels.
 * ##hide starts a block where all following lines are encoded.
 * ##unhide ChangeMe starts a block where all following lines are decoded.
 * Encoding/decoding uses a reversible character offset and supports all symbols.
 * Processing continues until ##end or end of text is reached.
 * Outputs normalized blocks using ##hidden … ##end markers.
 */
function JackHideText(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let mode = null; // null | "hide" | "unhide"
  const OFFSET = 17;
  const PASSWORD = "ChangeMe";

  const shift = (ch) =>
    String.fromCharCode((ch.charCodeAt(0) + OFFSET) & 0xffff);

  const unshift = (ch) =>
    String.fromCharCode((ch.charCodeAt(0) - OFFSET + 0x10000) & 0xffff);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!mode && /^##hide$/i.test(trimmed)) {
      mode = "hide";
      out.push("##hidden");
      continue;
    }

    if (!mode) {
      const m = /^##unhide\s+(\S+)$/.exec(trimmed);
      if (m && m[1] === PASSWORD) {
        mode = "unhide";
        out.push("##unhidden");
        continue;
      }
    }

    if (mode && /^##end$/i.test(trimmed)) {
      mode = null;
      out.push("##end");
      continue;
    }

    if (mode === "hide") {
      let coded = "";
      for (let j = 0; j < line.length; j++) coded += shift(line[j]);
      out.push(coded);
    } else if (mode === "unhide") {
      let decoded = "";
      for (let j = 0; j < line.length; j++) decoded += unshift(line[j]);
      out.push(decoded);
    } else {
      out.push(line);
    }
  }

  if (mode) out.push("##end");
  return out.join("\n");
}

/*
 * JackUnhideText(text)
 * Scans text for ##hidden … ##end blocks.
 * Decodes the contents of each block using the inverse character offset.
 * Multiple hidden blocks are supported in a single text.
 * Control labels are removed and only the restored text is returned.
 */
function JackUnhideText(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let unhiding = false;
  const OFFSET = 17;

  const unshift = (ch) =>
    String.fromCharCode((ch.charCodeAt(0) - OFFSET + 0x10000) & 0xffff);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!unhiding && /^\s*##\s*hidden\s*$/i.test(line)) {
      unhiding = true;
      continue;
    }

    if (unhiding && /^\s*##\s*end\s*$/i.test(line)) {
      unhiding = false;
      continue;
    }

    if (unhiding) {
      let decoded = "";
      for (let j = 0; j < line.length; j++) decoded += unshift(line[j]);
      out.push(decoded);
    } else {
      out.push(line);
    }
  }

  return out.join("\n");
}

const randomObjects = [
  { name: "Shiny Pebble", type: "misc" },
  { name: "Old Map Piece", type: "misc" },
  { name: "Strange Seed", type: "misc" },
  { name: "Dusty Book", type: "misc" },
  { name: "Smooth River Stone", type: "misc" },
  { name: "Worn Compass", type: "misc" },
];

if (state.PS === undefined) {
  state.PS = {
    Name: null || "None",
    Race: null || "None",
    Gender: null || "None",
    Class: null || "None",
    Element: null || "None",
    level: 1,
    experience: 0,
    xpToNextLevel: 100,
    armor: 5,
    "base damage": 0,
    "spell damage": 0,
    "skill damage": 0,
    "frost damage": 0,
    "lightning damage": 0,
    "nature damage": 0,
    "physical damage": 0,
    "bleed damage": 0,
    "poison damage": 0,
    "chaos damage": 0,
    "void damage": 0,
    "holy damage": 0,
    "status damage": 0,
    "crit chance": 0,
    "crit damage": 50, // Default 50% bonus damage on crit
    barrier: 0,
    maxBarrier: 25,
    health: 50,
    maxHealth: 50,
    mana: 50,
    maxMana: 50,
    strength: 1,
    dexterity: 1,
    intelligence: 1,
    vision: 25,
    stealth: 0,
    luck: 0,
    speed: 30, // Base movement speed
    hunger: 350,
    thirst: 400,
    fatigue: 450,
    effects: "None" || [],
    status: "None" || [],
    combatstatus: "None",
    nearTarget: "None",
    playerloc: "safe area",
    location: "safe haven",
    combatRange: 0,
    skillPoints: 0,
    skills: {},
    inventory: [],
    gold: 50,
    inventoryMaxSize: 30,
    equipped: {
      mainhand: null,
      offhand: null,
      head: null,
      chest: null,
      legs: null,
      boots: null,
      back: null,
      ring1: null,
      ring2: null,
      necklace: null,
    },
  };
}

const ITEM_CONTAINER_KEYS = ["main", "materials", "skillStones", "artifacts"];

// Initialize the multi-tiered container object on a freshly built player
// state. `main` is aliased to the backing inventory array; specialised
// containers start empty. `_containersMigrated` is pre-set so the runtime
// migration skips the partition pass for brand-new characters.
function initPlayerContainers(player) {
  if (!player || typeof player !== "object") return;
  if (!Array.isArray(player.inventory)) player.inventory = [];
  player.containers = {
    main: player.inventory,
    materials: [],
    skillStones: [],
    artifacts: [],
  };
  player.containerCapacity = {
    main: player.inventoryMaxSize ?? 30,
    materials: Infinity,
    skillStones: Infinity,
    artifacts: Infinity,
  };
  player._containersMigrated = true;
}

// One-shot migration: ensure multi-tiered inventory containers exist for
// pre-existing player state and partition any items that now belong in a
// specialised container out of `state.PS.inventory`. The `_containersMigrated`
// flag makes the migration idempotent — re-running never re-shuffles items.
(function migrateInventoryToContainers() {
  if (!state.PS) return;
  if (!Array.isArray(state.PS.inventory)) state.PS.inventory = [];
  if (
    !state.PS.containers ||
    typeof state.PS.containers !== "object" ||
    Array.isArray(state.PS.containers)
  ) {
    state.PS.containers = {
      main: state.PS.inventory,
      materials: [],
      skillStones: [],
      artifacts: [],
    };
  } else {
    // Always keep `containers.main` aliased to the backing array.
    state.PS.containers.main = state.PS.inventory;
    for (const k of ITEM_CONTAINER_KEYS) {
      if (!Array.isArray(state.PS.containers[k])) state.PS.containers[k] = [];
    }
  }
  if (
    !state.PS.containerCapacity ||
    typeof state.PS.containerCapacity !== "object"
  ) {
    state.PS.containerCapacity = {
      main: state.PS.inventoryMaxSize ?? 30,
      materials: Infinity,
      skillStones: Infinity,
      artifacts: Infinity,
    };
  }
  if (state.PS._containersMigrated) return;
  const inv = state.PS.inventory;
  // Iterate backwards so splice doesn't shift unvisited indices.
  for (let i = inv.length - 1; i >= 0; i--) {
    const key = classifyItemToContainer(inv[i]);
    if (key === "main") continue;
    const [moved] = inv.splice(i, 1);
    state.PS.containers[key].push(moved);
  }
  state.PS._containersMigrated = true;
})();

// Start of PlayerActionPrompt</oldString>

const actiondefault = "None";

if (state.PlayerAction === undefined) {
  state.PlayerAction = actiondefault || PlayerAction;
}

function playerAction(text, PlayerAction) {
  state.PlayerAction = PlayerAction;
  // Goal: scan input text for possible action matches (NO slash commands).
  // If nothing matches: suppress prompt (state.PlayerActionPrompt = "") and set action to None.
  // If match found: set state.PlayerAction + state.PlayerActionPrompt and return the matched action object.

  try {
    const raw = text ?? "";
    const t = String(raw).toLowerCase();

    const clean = (s) => {
      if (s === undefined || s === null) return null;
      return String(s)
        .trim()
        .replace(/^[\s"'`]+/, "")
        .replace(/[.!?,;:]+$/g, "")
        .trim();
    };

    const pushLog = (msg) => state.logMessages["Output"].push(msg);

    // Default: no action match => do not add any prompt instructions
    state.PlayerAction = {
      name: "None",
      type: "none",
      target: null,
      item: null,
      magictype: null,
      skilltype: null,
      raw: raw,
    };
    state.PlayerAction = "";

    const afterKeyword = (keywords) => {
      // returns trimmed substring after first keyword match (uses original raw for better trimming)
      for (const k of keywords) {
        const idx = t.indexOf(k);
        if (idx !== -1) {
          const after = raw.slice(idx + k.length).trim();
          return clean(after);
        }
      }
      return null;
    };

    // ===== ACTION MATCHING (best-effort keyword scanning) =====

    // Attack: attack/strike/slash/hit/etc + optional target at end
    {
      const attackWord =
        /\b(attack|strike|stab|slash|hit|pummel|slam|maul|charge|unleash)\b/.exec(
          t,
        );
      if (attackWord) {
        // capture everything after verb (optionally skipping "the/a/an")
        const m = raw.match(
          /\b(?:attack|strike|stab|slash|hit|pummel|slam|maul|charge|unleash)\b\s+(?:the|a|an)?\s*(.+)$/i,
        );
        const target = clean(m?.[1]);

        state.PlayerAction = {
          name: "Attack",
          type: "combat",
          target: target || null,
          item: null,
          magictype: null,
          skilltype: null,
          raw: raw,
        };

        state.PlayerActionPrompt = `Player intended action: Attack${target ? ` (${target})` : ""}.`;
        pushLog(
          `🎯 playerAction matched: Attack${target ? ` target=${target}` : ""}`,
        );
        return state.PlayerAction;
      }
    }

    // Defend / Guard / Block
    if (/\b(defend|guard|block|parry|turtle)\b/.test(t)) {
      state.PlayerAction = {
        name: "Defend",
        type: "combat",
        target: null,
        item: null,
        magictype: null,
        skilltype: null,
        raw: raw,
      };
      state.PlayerActionPrompt = `Player intended action: Defend.`;
      pushLog(`🎯 playerAction matched: Defend`);
      return state.PlayerAction;
    }

    // Flee / Run away / Escape
    if (/\b(flee|run away|escape|try to escape)\b/.test(t)) {
      state.PlayerAction = {
        name: "Flee",
        type: "combat",
        target: null,
        item: null,
        magictype: null,
        skilltype: null,
        raw: raw,
      };
      state.PlayerActionPrompt = `Player intended action: Flee.`;
      pushLog(`🎯 playerAction matched: Flee`);
      return state.PlayerAction;
    }

    // Explore / Search / Look around
    if (/\b(explore|search|look around|scan|hunt|seek)\b/.test(t)) {
      state.PlayerAction = {
        name: "Explore",
        type: "exploration",
        target: null,
        item: null,
        magictype: null,
        skilltype: null,
        raw: raw,
      };
      state.PlayerActionPrompt = `Player intended action: Explore.`;
      pushLog(`🎯 playerAction matched: Explore`);
      return state.PlayerAction;
    }

    // Rest / Sleep
    if (/\b(rest|sleep|take a break|nap)\b/.test(t)) {
      state.PlayerAction = {
        name: "Rest",
        type: "rest",
        target: null,
        item: null,
        magictype: null,
        skilltype: null,
        raw: raw,
      };
      state.PlayerActionPrompt = `Player intended action: Rest.`;
      pushLog(`🎯 playerAction matched: Rest`);
      return state.PlayerAction;
    }

    // Craft / Make / Forge
    if (/\b(craft|make|forge|build)\b/.test(t)) {
      state.PlayerAction = {
        name: "Craft",
        type: "crafting",
        target: null,
        item: null,
        magictype: null,
        skilltype: null,
        raw: raw,
      };
      state.PlayerActionPrompt = `Player intended action: Craft.`;
      pushLog(`🎯 playerAction matched: Craft`);
      return state.PlayerAction;
    }

    // Talk / Speak / Converse
    if (/\b(talk|speak|converse|chat)\b/.test(t)) {
      // best-effort: "talk to <target>" or "talk <target>".
      let target = afterKeyword(["talk", "speak", "converse", "chat"]);
      if (target) {
        target = target
          .replace(/^\s*(to|with)\s+/i, "")
          .replace(/\s+on\s+.+$/i, "")
          .trim();
        target = clean(target);
      }

      state.PlayerAction = {
        name: "Talk",
        type: "interaction",
        target: target || null,
        item: null,
        magictype: null,
        skilltype: null,
        raw: raw,
      };

      state.PlayerActionPrompt = `Player intended action: Talk${target ? ` (${target})` : ""}.`;
      pushLog(
        `🎯 playerAction matched: Talk${target ? ` target=${target}` : ""}`,
      );
      return state.PlayerAction;
    }

    // Trade: trade/buy/sell/barter
    if (/\b(trade|barter|sell|buy)\b/.test(t)) {
      state.PlayerAction = {
        name: "Trade",
        type: "interaction",
        target: null,
        item: null,
        magictype: null,
        skilltype: null,
        raw: raw,
      };
      state.PlayerActionPrompt = `Player intended action: Trade.`;
      pushLog(`🎯 playerAction matched: Trade`);
      return state.PlayerAction;
    }

    // Use Item: "use X", "drink X", "eat X" (best-effort capture until end)
    if (/\b(use|drink|eat)\b/.test(t)) {
      const m = raw.match(/\b(?:use|drink|eat)\b\s+(.+)$/i);
      const item = clean(m?.[1]);
      if (item) {
        state.PlayerAction = {
          name: "Use Item",
          type: "inventory",
          target: null,
          item: item,
          magictype: null,
          skilltype: null,
          raw: raw,
        };
        state.PlayerActionPrompt = `Player intended action: Use Item (${item}).`;
        pushLog(`🎯 playerAction matched: Use Item item=${item}`);
        return state.PlayerAction;
      }
    }

    // Cast spell: "cast <spell>" or "spell <spell>"
    if (/\b(cast|spell)\b/.test(t) && !/\b(skill)\b/.test(t)) {
      const m = raw.match(/\b(?:cast|spell)\b\s+(.+)$/i);
      const magictype = clean(m?.[1]);
      if (magictype) {
        state.PlayerAction = {
          name: "cast spell",
          type: "magic",
          target: null,
          item: null,
          magictype: magictype,
          skilltype: null,
          raw: raw,
        };
        state.PlayerActionPrompt = `Player intended action: Cast spell (${magictype}).`;
        pushLog(`🎯 playerAction matched: cast spell spell=${magictype}`);
        return state.PlayerAction;
      }
    }

    // Cast skill: "skill <skill>" or "cast skill <skill>"
    if (/\b(skill)\b/.test(t)) {
      const m = raw.match(/\b(?:cast\s+skill|skill)\b\s+(.+)$/i);
      const skilltype = clean(m?.[1]);
      if (skilltype) {
        state.PlayerAction = {
          name: "cast Skill",
          type: "skill",
          target: null,
          item: null,
          magictype: null,
          skilltype: skilltype,
          raw: raw,
        };
        state.PlayerActionPrompt = `Player intended action: Cast skill (${skilltype}).`;
        pushLog(`🎯 playerAction matched: cast Skill skill=${skilltype}`);
        return state.PlayerAction;
      }
    }

    // No match => keep prompt suppressed (empty string)
    pushLog(`🧩 playerAction: no match (prompt suppressed).`);
    return state.PlayerAction;
  } catch (e) {
    state.PlayerAction = {
      name: "None",
      type: "none",
      target: null,
      item: null,
      magictype: null,
      skilltype: null,
      raw: text,
    };
    state.PlayerActionPrompt = "";
    state.logMessages = state.logMessages || {};
    state.logMessages["Output"] = state.logMessages["Output"] || [];
    state.logMessages["Output"].push(
      `⚠️ playerAction parse error: ${String(e?.message || e)}`,
    );
    return state.PlayerAction;
  }
}

// ===========================================================================
//  PLAYER ACTION PARSING  (live replacement for the commented block above)
//  Reads the player's free text, extracts one-or-more intended actions, and
//  stores parsed info on state so the Context hook can tune the AI prompt.
//    state.PlayerActions      -> array of parsed action objects (this turn)
//    state.PlayerAction       -> the primary (first) action, or "None"
//    state.PlayerActionPrompt -> a sentence describing the intent(s), fed to Context
// ===========================================================================

// Ordered matchers: the FIRST that matches a clause wins for that clause.
// `capture` (optional) pulls a target/item/spell name into `field`.
// Verb alternations are defined once and reused for both `test` and `capture`
// so the two can never drift apart. Widened well past the obvious synonyms so
// ordinary phrasings ("I smash the door", "sneak down the hall", "quaff a
// potion") get classified instead of falling through to the generic fallback.
const AV = {
  skill: "skill|technique|maneuver|ability|feat",
  spell: "cast|spell|incant|invoke|channel|conjure|summon",
  item: "use|drink|eat|quaff|consume|apply|equip|wear|wield|activate|read|swallow|don",
  attack:
    "attack|strike|stab|slash|hit|pummel|slam|maul|charge|unleash|shoot|fire a bolt|blast|swing|cleave|punch|kick|throw|cut|bash|smash|smack|lunge|jab|thrust|impale|whack|bite|claw|gut|behead|kill|slay|destroy|assault|ambush|smite|crush|batter|pierce",
  defend:
    "defend|guard|block|parry|brace|shield|dodge|evade|deflect|cover|duck",
  flee: "flee|run away|escape|retreat|run|bolt|dash|withdraw|disengage|back away|get away",
  explore:
    "explore|search|look around|look at|look|scout|scan|hunt|seek|investigate|examine|inspect|wander|roam|peek|venture|travel|walk|move|head|enter|climb|descend|sneak|creep|approach|go",
  rest: "rest|sleep|take a break|nap|camp|recover|wait|sit|lie down|meditate",
  craft:
    "craft|forge|smith|build|construct|make|brew|cook|assemble|repair|mend|enchant|fashion",
  talk: "talk|speak|converse|chat|greet|ask|tell|shout|yell|call|whisper|negotiate|persuade|bargain|question|demand|command|plead|beg|taunt|reply|respond",
  trade: "trade|barter|sell|buy|purchase|haggle|exchange",
};
const av = (alt, tail) => new RegExp(`\\b(?:${alt})\\b${tail || ""}`, "i");

const PLAYER_ACTION_MATCHERS = [
  {
    name: "Cast Skill",
    type: "skill",
    field: "skilltype",
    test: av(AV.skill),
    capture: av("cast\\s+skill|" + AV.skill, "\\s+(.+)"),
  },
  {
    name: "Cast Spell",
    type: "magic",
    field: "magictype",
    test: av(AV.spell),
    capture: av("cast(?:\\s+the)?|spell", "\\s+(.+)"),
  },
  {
    name: "Use Item",
    type: "inventory",
    field: "item",
    test: av(AV.item),
    capture: av(AV.item, "\\s+(.+)"),
  },
  {
    name: "Attack",
    type: "combat",
    field: "target",
    test: av(AV.attack),
    capture: av(AV.attack, "\\s+(?:at\\s+)?(?:the|a|an)?\\s*(.+)"),
  },
  { name: "Defend", type: "combat", test: av(AV.defend) },
  { name: "Flee", type: "combat", test: av(AV.flee) },
  { name: "Explore", type: "exploration", test: av(AV.explore) },
  { name: "Rest", type: "rest", test: av(AV.rest) },
  { name: "Craft", type: "crafting", test: av(AV.craft) },
  {
    name: "Talk",
    type: "interaction",
    field: "target",
    test: av(AV.talk),
    capture: av(AV.talk, "\\s+(?:to|with)?\\s*(.+)"),
  },
  { name: "Trade", type: "interaction", test: av(AV.trade) },
];

function cleanActionValue(s) {
  if (s === undefined || s === null) return null;
  const v = String(s)
    .trim()
    .replace(/^[\s"'`]+/, "")
    .replace(/[.!?,;:]+$/g, "")
    .replace(/^(?:at|to|with|the|a|an)\s+/i, "")
    .trim();
  return v || null;
}

const PLAYER_ACTION_CONFIG = {
  Attack: (a) =>
    `launches a targeted attack against ${a.target || "the foe"}${a.weapon ? ` using ${a.weapon}` : ""}`,
  "Cast Spell": (a) => `casts the spell ${a.magictype || "they intended"}`,
  "Cast Skill": (a) => `uses the skill ${a.skilltype || "they intended"}`,
  "Use Item": (a) => `consumes ${a.item || "an item"} to gain its effects`,
  Talk: (a) => `talks ${a.target ? `to ${a.target}` : "to someone"}`,
  Defend: (a) =>
    `takes a defensive stance${a.weapon ? ` with their ${a.weapon}` : ""}`,
  Flee: () => `attempts to flee from the situation`,
  Explore: () => `explores the surroundings`,
  Rest: () => `rests to recover`,
  Craft: () => `crafts something`,
  Trade: () => `trades with others`,
  Speak: (a) =>
    `speaks${phraseFromRaw(a.raw) ? `: "${phraseFromRaw(a.raw)}"` : ""}`,
  Narrate: (a) =>
    `continues the scene${phraseFromRaw(a.raw) ? ` — ${phraseFromRaw(a.raw)}` : ""}`,
  Act: (a) => `performs a general action: ${phraseFromRaw(a.raw) || "act"}`,
  default: (a) => a.raw || "acts",
};

// Turn parsed actions into a short natural-language phrase for the prompt.
function playerActionPhrase(a) {
  const template =
    PLAYER_ACTION_CONFIG[a.name] || PLAYER_ACTION_CONFIG["default"];
  return template(a);
}

// Tidy a raw clause for use inside a prompt phrase: drop a leading pronoun and
// trailing punctuation so "I look at the sky." reads as "look at the sky".
function phraseFromRaw(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/^\s*(?:i|you|we|they)\s+/i, "")
    .replace(/^[\s"“”']+|[\s"“”']+$/g, "") // strip wrapping quotes/space
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

// Fill in the structured fields of a parsed action from engine state, so the
// prompt reflects what the player actually has / what's present even when the
// free text didn't name it. Only overwrites a field when a real engine match is
// found; otherwise the raw captured value (or null) is left as-is. Every state
// access is guarded — state.PS / state.MS may be absent during creation.
function resolvePlayerActionFields(action) {
  const PS = state.PS || {};
  const MS = state.MS || {};
  const equipped = PS.equipped || {};
  const inventory = Array.isArray(PS.inventory) ? PS.inventory : [];
  const skills = PS.skills && typeof PS.skills === "object" ? PS.skills : {};
  const monsters = Array.isArray(MS.activeMonsters)
    ? MS.activeMonsters.filter((m) => m && !m.isDead)
    : [];

  // Collect known abilities of the requested kinds, by displayName.
  const knownByKinds = (kinds) =>
    Object.keys(skills)
      .map((k) => skills[k])
      .filter((s) => s && kinds.indexOf(s.abilityType) !== -1)
      .map((s) => s.displayName || s.name)
      .filter(Boolean);

  // Match a captured free-text value against a list of names (case-insensitive,
  // substring either direction). Returns the canonical name or null.
  const matchName = (value, names) => {
    if (!value || !names.length) return null;
    const v = String(value).toLowerCase();
    for (const name of names) {
      const n = String(name).toLowerCase();
      if (v.includes(n) || n.includes(v)) return name;
    }
    return null;
  };

  switch (action.type) {
    case "combat": {
      // Resolve the target against live monsters (brackets stripped),
      // falling back to the last target, then the first active monster.
      if (action.name === "Attack") {
        const captured = action.target
          ? String(action.target)
              .replace(/[\[\]]/g, "")
              .trim()
          : "";
        let name = captured
          ? parseMonsterNameFromText(captured, monsters)
          : null;
        if (
          !name &&
          MS.lastTarget &&
          monsters.some(
            (m) => m.name.toLowerCase() === String(MS.lastTarget).toLowerCase(),
          )
        ) {
          name = MS.lastTarget;
        }
        if (!name && monsters.length) name = monsters[0].name;
        if (name) action.target = name;
      }
      // Equipped weapon backs any combat action.
      if (equipped.mainhand && equipped.mainhand.name)
        action.weapon = equipped.mainhand.name;
      break;
    }
    case "magic": {
      const spells = knownByKinds(["spell", "spellstone"]);
      const resolved =
        matchName(action.magictype, spells) ||
        (spells.length === 1 ? spells[0] : null);
      if (resolved) action.magictype = resolved;
      break;
    }
    case "skill": {
      const abilities = knownByKinds(["skill", "feat"]);
      const resolved =
        matchName(action.skilltype, abilities) ||
        (abilities.length === 1 ? abilities[0] : null);
      if (resolved) action.skilltype = resolved;
      break;
    }
    case "inventory": {
      const resolved = matchName(
        action.item,
        inventory.map((i) => i && i.name).filter(Boolean),
      );
      if (resolved) action.item = resolved;
      break;
    }
  }
  return action;
}

// Catch-all when no specific verb matched but the player clearly did SOMETHING
// (e.g. "I look at the sky", pure dialogue, freeform narration). Without this
// the prompt would be "" and the Context hook would skip the entire PLAYER
// INTENT block. Classifies by the engine action type (do/say/story/continue)
// when available, with a quoted-text heuristic as backup, so intent always
// passes through with a sensible type.
function detectCurrentActionType() {
  try {
    if (
      typeof history !== "undefined" &&
      Array.isArray(history) &&
      history.length
    ) {
      const last = history[history.length - 1];
      if (last && typeof last.type === "string") return last.type.toLowerCase();
    }
  } catch (e) {
    /* history may be absent in some contexts */
  }
  return undefined;
}

function buildFallbackAction(raw, actionType) {
  if (!raw) return null;
  const base = {
    target: null,
    item: null,
    magictype: null,
    skilltype: null,
    weapon: null,
    raw,
  };

  // Dialogue: an explicit "say" turn, or quoted / speech-verb text on an
  // unknown type -> interaction, so NPCs actually respond.
  const looksLikeSpeech =
    /["“”][^"“”]+["“”]/.test(raw) ||
    /\b(say|says|said|ask|asks|tell|tells|shout|whisper|reply|replies|greet)\b/i.test(
      raw,
    );
  if (actionType === "say" || (actionType === undefined && looksLikeSpeech)) {
    return Object.assign({ name: "Speak", type: "interaction" }, base);
  }

  // Story / continue -> advance the narrative without inventing player choices.
  if (actionType === "story" || actionType === "continue") {
    return Object.assign({ name: "Narrate", type: "story" }, base);
  }

  // Default (a "do" action that matched no verb): a generic freeform act,
  // described verbatim so the AI still knows what the player attempted.
  return Object.assign({ name: "Act", type: "other" }, base);
}

function buildPlayerActionPrompt(actions) {
  if (!actions || !actions.length) return "";
  const name = (state.PS && state.PS.Name) || "The player";
  const list = actions
    .map((a, i) => `${i + 1}) ${name} ${playerActionPhrase(a)}`)
    .join("; ");
  return `Current Intentions: ${list}.`;
}

// Parse the player's input into one or more actions and stash them on state.
function parsePlayerActions(rawText) {
  // Reset each turn so stale intent never leaks forward.
  state.PlayerActions = [];
  state.PlayerAction = "None";
  state.PlayerActionPrompt = "";
  state.logMessages = state.logMessages || {};
  state.logMessages["Output"] = state.logMessages["Output"] || [];

  // Only parse during active play — not during character creation.
  if (!state.PS || !state.PS.Name || state.tempCharacter)
    return state.PlayerActions;

  const raw = String(rawText ?? "").trim();
  if (!raw) return state.PlayerActions;

  // Split into clauses so several actions in one input each get parsed:
  //   "I attack the goblin and then drink a potion" -> [Attack, Use Item].
  const clauses = raw
    .split(/\b(?:and then|then|and|after that|before)\b|[,.;]+/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const actions = [];
  for (const clause of clauses) {
    const lc = clause.toLowerCase();
    for (const matcher of PLAYER_ACTION_MATCHERS) {
      if (matcher.test.test(lc)) {
        const action = {
          name: matcher.name,
          type: matcher.type,
          target: null,
          item: null,
          magictype: null,
          skilltype: null,
          weapon: null,
          raw: clause,
        };
        if (matcher.capture && matcher.field) {
          const m = clause.match(matcher.capture);
          const val = cleanActionValue(m && m[1]);
          if (val) action[matcher.field] = val;
        }
        resolvePlayerActionFields(action);
        actions.push(action);
        break; // one action per clause
      }
    }
  }

  // No explicit action matched, but the player still typed something real:
  // synthesize a fallback so intent always reaches the Context prompt.
  if (!actions.length) {
    const fallback = buildFallbackAction(raw, detectCurrentActionType());
    if (fallback) actions.push(fallback);
  }

  state.PlayerActions = actions;
  state.PlayerAction = actions[0] || "None";
  state.PlayerActionPrompt = buildPlayerActionPrompt(actions);
  /*if (actions.length) {
        state.logMessages['Output'].push(`🎯 Parsed ${actions.length} action(s): ${actions.map(a => a.name).join(", ")}`);
    }*/
  return state.PlayerActions;
}

// Food and Water Item System
// ============================

// Food items template
const foodItems = [
  {
    name: "Bread Loaf",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 30 },
    rarity: "common",
  },
  {
    name: "Apple",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 15 },
    rarity: "common",
  },
  {
    name: "Steak",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 40, health: 10 },
    rarity: "uncommon",
  },
  {
    name: "Berry Cluster",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 10, mana: 5 },
    rarity: "common",
  },
  {
    name: "Mushroom Stew",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 35, health: 15 },
    rarity: "uncommon",
  },
  {
    name: "Cooked Rabbit",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 25, strength: 1, duration: 5 },
    rarity: "rare",
  },
  {
    name: "Golden Apple",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 50, health: 30, mana: 20 },
    rarity: "rare",
  },
  {
    name: "Dragon Fruit",
    type: "consumable",
    subtype: "food",
    effect: { hunger: 45, allStats: 2, duration: 10 },
    rarity: "epic",
  },
];

// Water items template
const waterItems = [
  {
    name: "Water Skin",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 40 },
    rarity: "common",
  },
  {
    name: "Fresh Water",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 30 },
    rarity: "common",
  },
  {
    name: "Healing Water",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 35, health: 10 },
    rarity: "uncommon",
  },
  {
    name: "Magical Elixir",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 50, mana: 25 },
    rarity: "rare",
  },
  {
    name: "Enchanted Spring Water",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 60, health: 20, mana: 15 },
    rarity: "epic",
  },
  {
    name: "Coconut Water",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 25, hunger: 5 },
    rarity: "common",
  },
  {
    name: "Potion of Refreshment",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 45, fatigue: -20 },
    rarity: "uncommon",
  },
  {
    name: "Nectar of the Gods",
    type: "consumable",
    subtype: "water",
    effect: { thirst: 70, health: 30, mana: 30, allStats: 3, duration: 15 },
    rarity: "legendary",
  },
];

// Generate random food item
function getRandomFoodItem() {
  return { ...foodItems[Math.floor(Math.random() * foodItems.length)] };
}

// Generate random water item
function getRandomWaterItem() {
  return { ...waterItems[Math.floor(Math.random() * waterItems.length)] };
}

// Generate random consumable item (food or water)
function getRandomConsumableItem(type = "any") {
  if (type === "food") {
    return getRandomFoodItem();
  } else if (type === "water") {
    return getRandomWaterItem();
  } else {
    return Math.random() < 0.5 ? getRandomFoodItem() : getRandomWaterItem();
  }
}

// World loot areas system
const worldLootAreas = {
  //"forest": { name: "Forest", foodChance: 0.6, waterChance: 0.4, items: [] },
  //"cave": { name: "Cave", foodChance: 0.3, waterChance: 0.2, items: [] },
  //"desert": { name: "Desert", foodChance: 0.2, waterChance: 0.7, items: [] },
  //"mountain": { name: "Mountain", foodChance: 0.4, waterChance: 0.3, items: [] },
  //"swamp": { name: "Swamp", foodChance: 0.5, waterChance: 0.6, items: [] },
  //"village": { name: "Village", foodChance: 0.8, waterChance: 0.8, items: [] },
  dungeon: { name: "Dungeon", foodChance: 0.3, waterChance: 0.2, items: [] },
};

// Initialize world loot areas
function initializeWorldLoot() {
  if (state.worldLoot === undefined) {
    state.worldLoot = {};
    for (let area in worldLootAreas) {
      state.worldLoot[area] = {
        name: worldLootAreas[area].name,
        foodChance: worldLootAreas[area].foodChance,
        waterChance: worldLootAreas[area].waterChance,
        items: [],
      };
    }
  }
}

// Spawn random loot in a specific area
function spawnLootInArea(area) {
  initializeWorldLoot();

  if (!state.worldLoot[area]) {
    console.log(`Error: Area '${area}' does not exist`);
    return false;
  }

  const lootArea = state.worldLoot[area];
  const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items

  for (let i = 0; i < itemCount; i++) {
    let item;

    // Determine item type based on area probabilities
    const random = Math.random();
    if (random < lootArea.foodChance) {
      item = getRandomFoodItem();
    } else if (random < lootArea.foodChance + lootArea.waterChance) {
      item = getRandomWaterItem();
    }

    if (item) {
      lootArea.items.push(item);
    }
  }

  return true;
}

// Get loot from current area
function getCurrentAreaLoot() {
  initializeWorldLoot();

  const currentArea = state.PS?.playerloc || "safe haven";
  const normalizedArea = currentArea.toLowerCase().replace(/\s+/g, "");

  // Find matching loot area
  for (let area in state.worldLoot) {
    if (normalizedArea.includes(area)) {
      return state.worldLoot[area];
    }
  }

  return null;
}

// Collect loot from current area
function collectAreaLoot() {
  const currentLootArea = getCurrentAreaLoot();

  if (!currentLootArea || currentLootArea.items.length === 0) {
    state.logMessages["Output"].push(
      "🤔 There's no loot to collect in this area.",
    );
    return false;
  }

  // Add items to player inventory
  currentLootArea.items.forEach((item) => {
    addItem(item);
  });

  // Clear the loot from the area
  currentLootArea.items = [];

  return true;
}

// Use food/water item (enhanced version of useItem)
function useConsumableItem(itemName) {
  if (state.PS !== undefined) {
    const itemIndex = state.PS.inventory.findIndex(
      (item) =>
        item.name.toLowerCase() === itemName.toLowerCase() &&
        item.type === "consumable",
    );

    if (itemIndex !== -1) {
      const item = state.PS.inventory[itemIndex];

      // Apply hunger effect
      if (item.effect.hunger) {
        const newHunger = Math.min(
          state.PS.hunger + item.effect.hunger,
          state.PS.maxHunger || 200,
        );
        state.PS.hunger = newHunger;
        state.logMessages["Output"].push(
          `🍖 You ate the ${item.name} and satisfied ${item.effect.hunger} hunger!`,
        );
      }

      // Apply thirst effect
      if (item.effect.thirst) {
        const newThirst = Math.min(
          state.PS.thirst + item.effect.thirst,
          state.PS.maxThirst || 200,
        );
        state.PS.thirst = newThirst;
        state.logMessages["Output"].push(
          `💧 You drank the ${item.name} and quenched ${item.effect.thirst} thirst!`,
        );
      }

      // Apply health effect
      if (item.effect.health) {
        updateStat("health", item.effect.health);
        state.logMessages["Output"].push(
          `❤️ You used the ${item.name} and healed ${item.effect.health} health!`,
        );
      }

      // Apply mana effect
      if (item.effect.mana) {
        updateStat("mana", item.effect.mana);
        state.logMessages["Output"].push(
          `✨ You used the ${item.name} and regained ${item.effect.mana} mana!`,
        );
      }

      // Apply fatigue effect
      if (item.effect.fatigue) {
        const newFatigue = Math.max(state.PS.fatigue + item.effect.fatigue, 0);
        state.PS.fatigue = newFatigue;
        state.logMessages["Output"].push(
          `😴 You used the ${item.name} and ${item.effect.fatigue > 0 ? "gained" : "reduced"} ${Math.abs(item.effect.fatigue)} fatigue!`,
        );
      }

      // Apply temporary stat effects
      if (
        item.effect.strength ||
        item.effect.dexterity ||
        item.effect.intelligence ||
        item.effect.allStats
      ) {
        if (item.effect.duration) {
          applyTemporaryEffect(item);
        }
      }

      // Remove item from inventory
      state.PS.inventory.splice(itemIndex, 1);
      return true;
    }

    state.logMessages["Output"].push(
      `🤔 You don't have a ${itemName} to use right now.`,
    );
  }

  return false;
}

// Apply temporary effects from items
function applyTemporaryEffect(item) {
  state.PS.playerEffects = state.PS.playerEffects || [];

  const effect = {
    name: item.name,
    duration: item.effect.duration,
    effects: {},
  };

  if (item.effect.strength) {
    effect.effects.strength = item.effect.strength;
    state.PS.strength += item.effect.strength;
  }

  if (item.effect.dexterity) {
    effect.effects.dexterity = item.effect.dexterity;
    state.PS.dexterity += item.effect.dexterity;
  }

  if (item.effect.intelligence) {
    effect.effects.intelligence = item.effect.intelligence;
    state.PS.intelligence += item.effect.intelligence;
  }

  if (item.effect.allStats) {
    effect.effects.strength = item.effect.allStats;
    effect.effects.dexterity = item.effect.allStats;
    effect.effects.intelligence = item.effect.allStats;
    state.PS.strength += item.effect.allStats;
    state.PS.dexterity += item.effect.allStats;
    state.PS.intelligence += item.effect.allStats;
  }

  state.PS.playerEffects.push(effect);
  state.logMessages["Output"].push(`✨${item.name} granted temporary buffs!`);
}

// Create custom food item
function createFoodItem(name, hunger, health = 0, mana = 0, rarity = "common") {
  return {
    name: name,
    type: "consumable",
    subtype: "food",
    effect: {
      hunger: hunger,
      health: health,
      mana: mana,
    },
    rarity: rarity,
  };
}

// Create custom water item
function createWaterItem(
  name,
  thirst,
  health = 0,
  mana = 0,
  rarity = "common",
) {
  return {
    name: name,
    type: "consumable",
    subtype: "water",
    effect: {
      thirst: thirst,
      health: health,
      mana: mana,
    },
    rarity: rarity,
  };
}

// Print current loot in area
function printCurrentAreaLoot() {
  const currentLootArea = getCurrentAreaLoot();

  if (!currentLootArea) {
    state.logMessages["Output"].push("🚫 You're in a safe area with no loot.");
    return;
  }

  if (currentLootArea.items.length === 0) {
    state.logMessages["Output"].push("👀 No items found in this area.");
    return;
  }

  const lootList = currentLootArea.items
    .map((item) => `${item.name} (${item.rarity})`)
    .join(", ");

  state.logMessages["Output"].push(
    `💎 Loot in ${currentLootArea.name}: ${lootList}`,
  );
}

// Initialize the system
initializeWorldLoot();

const randomObjectmisc =
  randomObjects[Math.floor(Math.random() * randomObjects.length)];

const Playername = state.PS.Name;
const lowerName = Playername.toLowerCase();
const sanitizedName = lowerName.replace(/[^a-z0-9]/g, "_");
const summaryKey = `${sanitizedName}`;

// Function-based Character Creation API
function createPlayerState() {
  return {
    Name: null,
    Race: null,
    Gender: null,
    Class: null,
    Element: null,
    level: 1,
    experience: 0,
    xpToNextLevel: 100,
    armor: 5,
    "base damage": 0,
    "spell damage": 0,
    "skill damage": 0,
    "fire damage": 0,
    "frost damage": 0,
    "lightning damage": 0,
    "nature damage": 0,
    "physical damage": 0,
    "bleed damage": 0,
    "poison damage": 0,
    "chaos damage": 0,
    "void damage": 0,
    "holy damage": 0,
    "status damage": 0,
    "crit chance": 0,
    "crit damage": 50, // Default 50% bonus damage on crit
    barrier: 0,
    maxBarrier: 25,
    health: 50,
    maxHealth: 50,
    mana: 50,
    maxMana: 50,
    strength: 1,
    dexterity: 1,
    intelligence: 1,
    vision: 25,
    stealth: 0,
    luck: 0,
    speed: 30, // Base movement speed
    resistances: {
      physical: 0,
      fire: 0,
      frost: 0,
      lightning: 0,
      nature: 0,
      bleed: 0,
      poison: 0,
      chaos: 0,
      void: 0,
      holy: 0,
      status: 0,
    },
    hunger: 300,
    thirst: 450,
    fatigue: 450,
    status: "None" || [],
    effects: "None" || [],
    playerloc: "safe area",
    location: "safe haven",
    combatStatus: "None",
    combatRange: 0,
    skillPoints: 0,
    skills: {},
    inventory: [],
    gold: 50,
    storage: [],
    inventoryMaxSize: 30,
    equipped: {
      mainhand: null,
      offhand: null,
      head: null,
      chest: null,
      legs: null,
      boots: null,
      back: null,
      ring1: null,
      ring2: null,
      necklace: null,
    },
  };
}

const characterQuestions = {
  Name: "What is your name?",
  Race: "What is your race?",
  Gender: "What is your gender?",
  Class: "What is your class?",
  Element: "What is your element?",
};

const characterOptions = {
  Name: [],
  Gender: [],
  Race: [
    "human",
    "elf",
    "dwarf",
    "halfling",
    "orc",
    "tiefling",
    "dragonborn",
    "gnome",
  ],
  Class: [
    "knight",
    "wizard",
    "druid",
    "rogue",
    "cleric",
    "barbarian",
    "battlemage",
    "revanant",
    "necromancer",
  ],
  Element: ["fire", "frost", "lightning", "nature", "chaos", "void", "holy"],
};

const optionDescriptions = {
  Class: {
    knight: "Close combat sword fighter, defensive magic.",
    rogue: "High crit damage with bows or daggers.",
    cleric: "Support caster with healing magic.",
    barbarian: "Brutal dual-axe brawler.",
    wizard: "Master of elemental arcane spells.",
    druid: "Nature caster with summons and DoT spells.",
    battlemage: "Hybrid arcane warrior.",
    revanant: "Blood knight who spends life to fuel brutal bleed attacks.",
    necromancer:
      "Commands the dead — raises skeletons to fight for you and drains life to heal. (Void synergy)",
  },
  Race: {
    human: "Versatile and ambitious. (+10 Health, +10 Mana)",
    elf: "Graceful and magically inclined. (+5 Health, +20 Mana)",
    dwarf: "Sturdy master smiths. (+25 Health)",
    halfling: "Nimble and lucky. (+15 Health, +5 Mana)",
    orc: "Fierce tribal warriors. (+25 Health)",
    tiefling: "Fiend-touched spellcasters. (+5 Health, +20 Mana)",
    dragonborn: "Proud draconic lineage. (+20 Health, +10 Mana)",
    gnome: "Inventive illusionists. (+5 Health, +20 Mana)",
  },
  Element: {
    fire: "Searing aspect. (+10 Fire damage, better Burn chance)",
    frost: "Freezing aspect. (+10 Frost damage, better Chill chance)",
    lightning: "Storm aspect. (+10 Lightning damage, better Shock chance)",
    nature: "Verdant aspect. (+10 Nature damage, better Poison chance)",
    chaos: "Unstable aspect. (+10 Chaos damage, better Bleed chance)",
    void: "Hollow aspect. (+12 Void damage, small bonus to all effects)",
    holy: "Radiant aspect. (+12 Holy damage, small bonus to all effects)",
  },
};

function createCharacter() {
  // Safeguard: never start creation while the RPG config is disabled.
  if (rpgCreationGate().allowed !== true) return false;
  if (state.Players === undefined) state.Players = {};
  state.tempCharacter = createPlayerState();
  initPlayerContainers(state.tempCharacter);
  state.requesting = null;
  state.creationStep = 0;
  return true;
}

function addPlayerSummary(state, summaryKey = null) {
  if (!state.PS || !state.PS.Name) return;

  const name = state.PS.Name || "Adventurer";
  const key = summaryKey || `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "Unknown";
  const storage = state.PS.storage;

  // You can easily add more dynamic lines here later
  const summary = `
    Player
    Name: ${name}
    Race: ${capitalize(state.PS.Race || "")}
    Gender: ${capitalize(state.PS.Gender || "")}
    Class: ${capitalize(state.PS.Class || "")}
    Element: ${capitalize(state.PS.Element || "")}
    Location: ${capitalize(state.PS.location) || ""}
    ]`.trim();
}

function buildCharacterQuestion(key) {
  let message = "\n" + characterQuestions[key];

  const descriptions = optionDescriptions[key];
  const options = characterOptions[key];

  if (descriptions) {
    message += "\n\nOptions:\n";
    for (const [opt, desc] of Object.entries(descriptions)) {
      message += `${opt}: ${desc}\n`;
    }
  } else if (options?.length) {
    message += "\n(options: " + options.join(", ") + ")";
  }

  return { message };
}

function validateCharacterInput(key, response) {
  const options = characterOptions[key] || [];
  if (options.length) {
    const match = options.find((opt) => response.includes(opt));
    if (!match)
      return {
        valid: false,
        error: "Invalid option. Choose: " + options.join(", "),
      };
    return { valid: true, value: match };
  }

  let value = response
    .trim()
    .replace(/^>? ?you\s*(are|is|am|be)?\s*(a|an|the)?\s*/i, "")
    .replace(/\.$/, "")
    .trim();

  // Filter out common AI preamble or system instructions that might leak into the name
  if (
    value.toLowerCase().includes("world essentials") ||
    value.toLowerCase().includes("/newplayer")
  ) {
    return {
      valid: false,
      value: null,
      error:
        "That doesn't look like a valid name. Please enter your character's name.",
    };
  }

  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  return {
    valid: !!value,
    value,
    error: value ? null : "Please provide a value.",
  };
}

function processCharacterInput(input) {
  if (!state.tempCharacter)
    return { error: true, message: "No character creation in progress." };

  const character = state.tempCharacter;
  const response = normalizeInput(input || "");

  if (state.requesting) {
    const key = state.requesting;
    const { valid, value, error } = validateCharacterInput(key, response);
    if (!valid) {
      return { error: true, message: error };
    }
    character[key] = value;
    state.requesting = null;
    state.creationStep = (state.creationStep || 0) + 1;

    // Hook: Race stat bonuses (Health/Mana)
    if (key === "Race" && typeof applyRaceBonuses === "function") {
      applyRaceBonuses(character, value);
    }

    // Hook: Element damage bonus + status affinity
    if (key === "Element" && typeof applyElementBonus === "function") {
      applyElementBonus(character, value);
    }

    // Hook: Class select population
    if (key === "Class" && typeof getStartingSkills === "function") {
      character.skills = getStartingSkills(value);
    }
    if (key === "Class" && typeof getStartingInventory === "function") {
      character.inventory = getStartingInventory(value, randomObjectmisc);
    }
  }

  for (const key of Object.keys(characterQuestions)) {
    if (character[key] === null) {
      state.requesting = key;
      return buildCharacterQuestion(key);
    }
  }

  return finalizeCharacter();
}

function finalizeCharacter() {
  state.PS = state.tempCharacter;
  delete state.tempCharacter;
  delete state.requesting;
  delete state.creationStep;

  // Config: Game Mode decides where the run begins — open-world starts in the
  // safe haven, rogue-like drops you straight into the dungeon.
  const start = rpgStartingLocation();
  state.PS.location = start.location;
  state.PS.playerloc = start.playerloc;

  // Actually create the player Story Card. Without this call the "✅SC Created"
  // message below was a claim with nothing behind it — addStoryCard never ran,
  // so no card ever reached the Story Cards view.
  addPlayerSummary(state);

  return {
    message: `✅SC Created \nUse Command for needed info: "show help" Once you get a feel for the commands. Make sure to change your name under the flame icon in the top left of the screen, to be your players name. When you are ready to begin please type: "start game engine" To start the game. If done right you should see [Game Engine Started!] at the bottom of the screen! Dont forget to equip all gear! You can move threw location by: enter labyrith(The main dungeon) or enter safe haven(Safe area and shop)`,
  };
}

function consumeItem(subtype) {
  const idx = state.PS.inventory.findIndex((i) => i.subtype === subtype);
  if (idx !== -1) {
    const item = state.PS.inventory.splice(idx, 1)[0];
    state.logMessages["Output"].push(`🍽️ Consumed: ${item.name}`);
    return item;
  }
  return null;
}

function playerFood() {
  //console.log(text)

  // Config: Survival off disables the hunger/thirst/fatigue systems entirely.
  if (!isSurvivalOn()) return;

  const PlayerName = state.PS.Name;
  // === INITIALIZE SURVIVAL STATS + IMMUNITY COUNTERS ===
  //if (!state.PS.hunger) state.PS.hunger = 150;
  //if (!state.PS.thirst) state.PS.thirst = 200;
  //if (!state.PS.fatigue) state.PS.fatigue = 200;
  //if (!state.PS.inventory) state.PS.inventory = [];

  if (!state.PS.immunity) state.PS.immunity = { hunger: 0, thirst: 0, rest: 0 };
  if (!state.turnCounter) state.turnCounter = 0;
  state.turnCounter++;

  // === PRECISE ITEM SCAN BY SUBTYPE ===
  const foodItems = state.PS.inventory.filter((i) => i.subtype === "food");
  const drinkItems = state.PS.inventory.filter((i) => i.subtype === "water");
  const restItems = state.PS.inventory.filter((i) => i.subtype === "rest");

  // ==================== HUNGER ====================
  if (state.PS.immunity.hunger <= 0) {
    state.PS.hunger = Math.max(0, state.PS.hunger - 3);
  } else {
    state.PS.immunity.hunger--; // tick down immunity
  }
  if (state.PS.hunger <= 0) {
    updateStat("health", -3);
    state.logMessages["Output"].push(`☠ ${PlayerName} is starving!`);
  }
  if (state.PS.hunger <= 30 && state.PS.immunity.hunger <= 0) {
    if (foodItems.length > 0) {
      const Food = foodItems.length
        ? foodItems.map((f) => f.name).join(", ")
        : "None";
      consumeItem(Food);
      state.PS.hunger = Math.min(150, state.PS.hunger + 40); // partial restore
      state.logMessages["Output"].push(`${PlayerName}|Consumed:${Food}`);
      state.PS.immunity.hunger = 15; // grant immunity
    } else {
      state.logMessages["Output"].push(`${PlayerName}has no Food!`);
    }
  }
  // Auto-grant immunity when eating brings hunger above 120 (successful meal)
  if (state.PS.hunger >= 120 && state.PS.immunity.hunger === 0) {
    state.PS.immunity.hunger = 15;
  }

  // ==================== THIRST ====================
  if (state.PS.immunity.thirst <= 0) {
    state.PS.thirst = Math.max(0, state.PS.thirst - 10);
  } else {
    state.PS.immunity.thirst--;
  }
  if (state.PS.thirst <= 40 && state.PS.immunity.thirst <= 0) {
    if (drinkItems.length > 0) {
      const Water = foodItems.length
        ? foodItems.map((f) => f.name).join(", ")
        : "None";
      consumeItem(Water);
      state.PS.thirst = Math.min(200, state.PS.thirst + 60);
      state.logMessages["Output"].push(`${PlayerName}|Consumed:${Water}`);
      state.PS.immunity.thirst = 15; // Gain immunity when eating
    } else {
      state.logMessages["Output"].push(`${PlayerName}has no Water!`);
    }
  }
  // [Auto-grant immunity] when drinking brings thirst above 160 (properly quenched)
  if (state.PS.thirst >= 160 && state.PS.immunity.thirst === 0) {
    state.PS.immunity.thirst = 15;
  }
  if (state.PS.thirst <= 0) {
    updateStat("health", -4);
    state.logMessages["Output"].push(`${PlayerName} is severely dehydrated!\n`);
  }

  // ==================== FATIGUE / REST ====================
  if (state.PS.immunity.rest <= 0) {
    state.PS.fatigue = Math.max(0, state.PS.fatigue - 2);
  } else {
    state.PS.immunity.rest--;
  }

  const tiredness = 200 - state.PS.fatigue;
  if (tiredness > 100) {
    const names = restItems.length
      ? restItems.map((r) => r.name).join(", ")
      : "None";
    state.logMessages["Output"].push(
      `\n${PlayerName}|Feeling tired!|Rest Gear:${names}\n`,
    );
  }
  if (state.PS.fatigue <= 0) {
    updateStat("health", -15);
    state.logMessages["Input"].push(
      `${PlayerName} collapses from exhaustion!\n`,
    );
    state.PS.fatigue = 200;
  }
  // [Auto-grant immunity] when getting rest brings fatigue back to 200
  if (state.PS.fatigue >= 200 && state.PS.immunity.rest === 0) {
    state.PS.immunity.rest = 15;
  }
}

// Function: Controlled Player Tracking and Memory Injection
function Gametrack() {
  /*const playerCombat = CommunityUtils.StoryCards.readSettings(PlayerCard, "CombatStatus", "None")
    // Define the combat status message
    // You can change the content of this message to whatever you choose.
    const nonCombatStatusMessage = `Monsters cant spawn and attack player`;
    const combatStatusMessage = `Monsters can spawn and attack player`
    // Pin the status message to state.message so the player sees it as an alert/overlay.*/
  /*let dungeonState = `Monsters cant spawn`;
    if (state.PS.location === "labyrinth") {
        dungeonState = `- Monsters can spawn`;
    }
    const alive = state.MS.activeMonsters.filter(m => m && m.health > 0);
    if (alive.length === 0) {
        return;
    }
    const Mstats = alive.map(m =>
        `[${m.name}:${m.count}x]`
    ).join("\n")

    const aliveMonsters = Mstats*/

  const identifier = "World Essentials:";
  const maxMonsters = 5;
  const maxStringLength = 1000;

  if (!state.MS || !Array.isArray(state.MS.activeMonsters)) {
    return;
  }

  advanceTime();

  const livingMonsters = state.MS.activeMonsters
    .filter((m) => m && typeof m === "object" && m.health > 0)
    .slice(0, maxMonsters);

  let displayString = "";

  if (livingMonsters.length > 0) {
    displayString = livingMonsters
      .map((m) => {
        const safeName = String(m.name || "Unknown")
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .trim()
          .slice(0, 30);
        const safeHealth = Math.max(0, Math.floor(Number(m.health) || 0));
        const safeCount = Math.max(1, Math.floor(Number(m.count) || 1));
        return `[- Monsters in area: ${safeName}\n- Monsters Health: ${safeHealth}\n- Amount of monsters: ${safeCount}]`;
      })
      .join("\n");
  } else {
    displayString = "- Monsters cant spawn";
  }

  // ---- ALLY SYSTEM ----
  // Tell the AI who is fighting alongside the player, using the same
  // sanitise-and-cap treatment the monster lines get.
  const companions = getLivingCompanions();
  if (companions.length > 0) {
    const partyString = companions
      .map((c) => {
        const safeName = String(c.name || "Unknown")
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .trim()
          .slice(0, 30);
        const safeRole = String(c.role || "companion")
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .trim()
          .slice(0, 30);
        const safeHealth = Math.max(0, Math.floor(Number(c.health) || 0));
        return `- ${safeName} (${c.kind === "summon" ? "summon" : "ally"}, ${safeRole}) Health: ${safeHealth}/${c.maxHealth}`;
      })
      .join("\n");
    displayString += `\n[Traveling with the player:\n${partyString}]`;
  }

  // ---- CURRENT LOCATION ----
  ensureWorldState();
  const richLoc = getRichLocation();
  if (richLoc) {
    const displayName = String(
      richLoc.displayName || richLoc.playerloc || "unknown",
    )
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .slice(0, 30);
    const subArea = String(richLoc.subArea || "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .slice(0, 30);
    const zoneType = String(richLoc.zoneType || "unknown")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .slice(0, 30);
    let locLine = `[Current Location: ${displayName}${subArea ? " / " + subArea : ""} (${zoneType})`;
    if (richLoc.exits && typeof richLoc.exits === "object") {
      const exitDirs = Object.keys(richLoc.exits);
      if (exitDirs.length > 0) {
        const locked = exitDirs.filter((d) => {
          const e = richLoc.exits[d];
          return (
            e && (e.locked === true || (typeof e === "object" && e.locked))
          );
        });
        const unlocked = exitDirs.filter((d) => !locked.includes(d));
        const safeDir = (d) =>
          String(d)
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 30);
        const u = unlocked.map(safeDir).join(",");
        const l = locked.map(safeDir).join(",");
        locLine += `\n- Exits unlocked: ${u || "none"}`;
        if (locked.length > 0) locLine += `\n- Exits locked: ${l}`;
      }
    }
    if (
      Array.isArray(richLoc.interactions) &&
      richLoc.interactions.length > 0
    ) {
      const inter = richLoc.interactions
        .slice(0, 5)
        .map((i) => {
          const id = String(i && i.id ? i.id : "")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 20);
          const type = String(i && i.type ? i.type : "")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 20);
          const statev = String(i && i.state ? i.state : "")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 20);
          return `${id || "?"}/${type || "?"}/${statev || "?"}`;
        })
        .join(",");
      locLine += `\n- Interactions: ${inter}`;
    }
    if (Array.isArray(richLoc.entities) && richLoc.entities.length > 0) {
      const ents = richLoc.entities
        .slice(0, 5)
        .map((e) => {
          const n = String(e && (e.name || e.id) ? e.name || e.id : "")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 30);
          const t = String(e && e.kind ? e.kind : "")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 20);
          return `${n || "?"}${t ? "(" + t + ")" : ""}`;
        })
        .join(",");
      locLine += `\n- Entities: ${ents}`;
    }
    if (richLoc.flags && typeof richLoc.flags === "object") {
      const disc = richLoc.flags.discovered === false ? "no" : "yes";
      const danger = Number.isFinite(Number(richLoc.flags.danger))
        ? Math.floor(Number(richLoc.flags.danger))
        : 0;
      locLine += `\n- Flags: discovered=${disc}, danger=${danger}]`;
    } else {
      locLine += "]";
    }
    displayString += `\n${locLine}`;
  }

  // ---- TIME ----
  if (state.world.time) {
    const t = state.world.time;
    const turn = Math.max(0, Math.floor(Number(t.turn) || 0));
    const day = Math.max(1, Math.floor(Number(t.day) || 1));
    const hour = Math.max(0, Math.min(23, Math.floor(Number(t.hour) || 0)));
    const minute = Math.max(0, Math.min(59, Math.floor(Number(t.minute) || 0)));
    const phase =
      String(t.cyclePhase || "day")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .slice(0, 20) || "day";
    const light = Math.max(0, Math.min(1, Number(t.lightLevel) || 0)).toFixed(
      2,
    );
    displayString += `\n[Time: turn ${turn} | day ${day} | ${hour}:${String(minute).padStart(2, "0")} | ${phase} | light ${light}]`;
  }

  // ---- WEATHER ----
  if (state.world.weather) {
    const w = state.world.weather;
    const cur =
      String(w.current || "clear")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .slice(0, 20) || "clear";
    const intensity = Math.max(
      0,
      Math.min(1, Number(w.intensity) || 0),
    ).toFixed(2);
    const vis = Math.max(
      0,
      Math.min(2, Number(w.visibilityModifier) || 1),
    ).toFixed(2);
    const temp =
      String(w.temperature || "mild")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .slice(0, 20) || "mild";
    displayString += `\n[Weather: ${cur} | intensity ${intensity} | visibility ${vis} | temp ${temp}]`;
  }

  // ---- WORLD REGISTRY ----
  displayString += `\n[World Registry:\n${summariseWorldRegistry(400)}]`;

  displayString = displayString.slice(0, maxStringLength);

  let currentContext = state.memory.context || "";
  const cleanRegex = new RegExp("\\n?" + identifier + "[\\s\\S]*", "g");
  currentContext = currentContext.replace(cleanRegex, "").trim();

  state.memory.context =
    currentContext + "\n" + identifier + "\n" + displayString;
}

function UpdatePlayers() {
  const player = state.PS;
  const CardName = player.Name;
  const card = CommunityUtils.StoryCards.find(CardName);

  let location = player.location;
  let playerloc = player.playerloc;
  let status = player.status;
  let gold = player.gold;
  let effects = player.effects;
  // Store the inventory representation in the story card (normal string, no JSON stringify)
  let inventory = formatStackedInventoryList(player.inventory || []);

  if (CardName) {
    gold = CommunityUtils.StoryCards.setSettings(card, "Gold", gold);
    inventory = CommunityUtils.StoryCards.setSettings(
      card,
      "inventory",
      inventory,
    );
    location = CommunityUtils.StoryCards.setSettings(
      card,
      "location",
      location,
    );
    status = CommunityUtils.StoryCards.setSettings(card, "status", status);
    playerloc = CommunityUtils.StoryCards.setSettings(
      card,
      "playerloc",
      playerloc,
    );
    effects = CommunityUtils.StoryCards.setSettings(card, "effects", effects);
    CommunityUtils.StoryCards.setSettings(
      card,
      "combatRange",
      player.combatRange,
    );
  }
}

function U_playerTrack() {
  // Universal player track

  const player = state.PS;
  const CardName = player.Name;

  if (CardName) {
    const card = CommunityUtils.StoryCards.find(CardName);

    // Sync spatial distance and proximity to Story Card
    if (state.MS.lastTarget) {
      const target = state.MS.activeMonsters.find(
        (m) => m && m.name === state.MS.lastTarget,
      );
      if (target) {
        const distClass = SpatialManager.classifyRange(target.distance);
        CommunityUtils.StoryCards.setSettings(card, "distanceClass", distClass);
        SpatialManager.updateProximity(state.PS, target);
        CommunityUtils.StoryCards.setSettings(
          card,
          "nearTarget",
          state.PS.nearTarget,
        );
      }
    }

    let locationChanged = false;
    let combatStatusChanged = false;
    let requestedLocation = null;
    let location = player.location;
    let playerloc = player.playerloc;
    let status = player.status;
    let gold = player.gold;
    let effects = player.effects;
    // Store the inventory representation in the story card (normal string, no JSON stringify)
    let inventory = formatStackedInventoryList(player.inventory || []);
    let playerStorage = state.PS.storage;

    /*const P_stats = `> Inventory: ${inventory}\n> Location: ${location}\n> SubLocation: ${playerloc}\n> Status: ${status}\n> Gold: ${gold}\n> Player Effects: ${effects}`*/

    if (CardName !== "None") {
      CommunityUtils.StoryCards.find(CardName, true, "", "Player SC");
    }

    // ────────────────────────────────────────────────
    //  Travel / Location Detection
    // ────────────────────────────────────────────────
    const playerInput = text.toLowerCase();
    //console.log(playerInput, "Player")

    if (!card) {
      console.log(`Story card "${CardName}" not found!`);
      return;
    }

    // Pattern 1: General travel phrases (go to X, move to the X, head toward...)
    const travelRegex =
      /(?:go|move|travel|walk|head|run|enter)\s+(?:to\s+)?(?:the\s+)?(.+)/i;
    const travelMatch = playerInput.match(travelRegex);

    // Pattern 2: Specific safe/labyrinth phrases
    const majorLocRegex =
      /(?:enter|enters|move|go\s+to)\s+(labyrinth|safe haven)/i;
    const majorMatch = playerInput.match(majorLocRegex);

    if (majorMatch) {
      requestedLocation = majorMatch[1].trim();
    } else if (travelMatch) {
      requestedLocation = travelMatch[1].trim();
    } else {
      return;
    }

    // Normalize and validate requested location
    if (requestedLocation) {
      const normalized = requestedLocation.toLowerCase();

      if (normalized.includes("safe haven")) {
        // Player is in safe haven
        if (player.location !== "safe haven") {
          player.location = "safe haven";
          player.playerloc = "safe area";
          player.combatstatus = "Not in Combat"; // or "safe" if you prefer that string
          locationChanged = true;
          combatStatusChanged = true;
          state.logMessages["Output"].push(
            `[${CardName} has entered safe haven.]`,
          );
        }
      }

      if (normalized.includes("labyrinth")) {
        // Player is in labyrinth

        if (player.location !== "labyrinth") {
          player.location = "labyrinth";
          player.playerloc = "dungeon"; // or whatever makes sense as starting point
          player.combatstatus = "Not in Combat"; // combat starts only when monsters appear
          locationChanged = true;
          combatStatusChanged = true;
          state.logMessages["Output"].push(
            `[${CardName} has entered the labyrinth.]`,
          );
        }
      }

      // Optional: handle other known locations from your validLocations array
      // You could add more conditions here for hallways, rooms, etc.
    }

    location = player.location;
    playerloc = player.playerloc;
    console.log(location); //Log Player Location

    // ────────────────────────────────────────────────
    //  Sync story cards ONLY if something meaningful changed
    // ────────────────────────────────────────────────
    if (locationChanged || combatStatusChanged) {
      //console.log(`PlayerStatus: Updated story cards for ${playerName} (location/combat changed)`);
    } else {
      // Optional: very light sync every few calls if you want cards to stay very fresh
      // but usually not needed — once per real change is enough
    }

    if (CardName) {
      gold = CommunityUtils.StoryCards.setSettings(card, "Gold", gold);
      inventory = CommunityUtils.StoryCards.setSettings(
        card,
        "inventory",
        inventory,
      );
      location = CommunityUtils.StoryCards.setSettings(
        card,
        "location",
        location,
      );
      status = CommunityUtils.StoryCards.setSettings(card, "status", status);
      playerloc = CommunityUtils.StoryCards.setSettings(
        card,
        "playerloc",
        playerloc,
      );
      effects = CommunityUtils.StoryCards.setSettings(card, "effects", effects);
    }
  }
}

const CommunityUtils = {
  Actions: {
    // Checks whether the last actions had any user input, if so then returns true.
    wasRetry: function () {
      if (
        state._communityUtils_wasInput ||
        readPastAction(0).type == "continue"
      ) {
        state._communityUtils_wasInput = false;
        return false;
      } else {
        return true;
      }
    },
  },
  StoryCards: {
    // Tries to find a story card, can create one if not found.
    // `name`: the name of the story card.
    // `createIfNotFound`: pretty self-explanatory, creates a card if true and not found.
    // `entry`: the entry of the story card (only used during creation).
    // `category`: the category of the story card (only used during creation).
    find: function (
      name,
      createIfNotFound = false,
      entry = "Imagine a very interesting entry here.",
      category = "Uncategorized",
    ) {
      // This below checks if there is a valid cache in which to save card identifiers.
      if (!state._communityUtils_cardCache)
        state._communityUtils_cardCache = {};

      // Try to find a cached card approach.
      const cachedCardId = state._communityUtils_cardCache[name];

      // If a cached card is found.
      if (cachedCardId) {
        // Try to find the card which matches the specific identifier.
        const cardFromCache = storyCards.find(
          (card) => card.id === cachedCardId,
        );

        // Either way return the valid card.
        if (cardFromCache) return cardFromCache;
        else delete state._communityUtils_cardCache[name]; // Or the card is invalid and not found, which means it was deleted by the user or something.
      }

      // If here then the card was never cached and saved.
      // In that case loop over all the cards and find it based on name.
      for (const card of storyCards) {
        // Check if the keys include whatever the name is, since that is most often used anyways.
        // Using the title is also valid but the scripting API lacks that cute little tidbit, so this is fine for now.
        if (card.keys.includes(name)) {
          state._communityUtils_cardCache[name] = card.id; // If we find a card by name then cache its identifier.
          return card; // Return the discovered card.
        }
      }

      // If here then the card wasn't ever cached or even found.
      // In that case simply check if card creation is enabled, if so then create card.
      if (createIfNotFound) {
        const newIndex = addStoryCard(name, entry, category); // Create a card and receive its index.
        const newCard = storyCards[newIndex - 1]; // For some reason the index starts at one (so that is why one is subtracted in order to get the right card).
        return newCard; // Return the newly created card.
      }

      // If returning here, then no card was ever found or cached and creation was disabled.
      // Which is why `null` is returned.
      return null;
    },
    // Safely reads all settings from a story card, if the value wasn't found then the default value is returned.
    // `storyCard`: the reference to the story card object to read from.
    // `settingName`: the name of the setting (ex. Number of Actions, Time, Whatever).
    // `defaultValue`: the default value which is returned if the setting was NOT found in the card.
    readSettings(storyCard, settingName, defaultValue) {
      const regex = new RegExp(`^>\\s*${settingName}:\\s*(.+)`, "m"); // Try to find all settings because they start with a `>` such as: `> Action Count: XYZ`.
      const match = storyCard.entry.match(regex); // Read the entry from the story card.

      // If the setting could not be found or anything else is wonky, then return the default value.
      if (!match || typeof match[1] !== "string") return defaultValue;

      // Otherwise trim it to get the real value.
      const value = match[1].trim();

      // These below are for boolean settings.
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;

      // These below are for numerical/floating-point values.
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(value)) return num;

      // Return the discovered value.
      return value;
    },
    // Sets a specific setting in the story card to a desired value.
    // `storyCard`: the reference to the story card object which needs to be modified.
    // `settingName`: the name of the setting (ex. Number of Actions, Time, Whatever).
    // `newValue`: the new value to assign to the setting.
    setSettings: function (storyCard, settingName, newValue) {
      // Safety measures, stops if something is wrong with the story card.
      if (!storyCard || typeof storyCard.entry !== "string") return;

      // Find the settings again.
      const regex = new RegExp(`^>\\s*${settingName}:\\s*(.+)`, "m");
      const settingLine = `> ${settingName}: ${newValue}`; // Set the correct line.
      let newEntry; // Assign the new entry value here.

      // Replace the contents of the entry.
      if (regex.test(storyCard.entry))
        newEntry = storyCard.entry.replace(regex, settingLine);
      else newEntry = storyCard.entry.trim() + `\n${settingLine}`;

      try {
        const cardIndex = storyCards.findIndex(
          (card) => card.id === storyCard.id,
        ); // Try to find the correct card.
        if (cardIndex !== -1) {
          // If the card was indeed found.
          updateStoryCard(
            cardIndex,
            storyCard.keys,
            newEntry,
            storyCard.type,
            storyCard.title,
            storyCard.description,
          ); // Then update it.
          storyCard.entry = newEntry; // Just in case the new `updateStoryCard` function gets wonky in the future.
        } else {
          // Recoverable: the card vanished before we could update it. Surface
          // it as a warning (console.error) rather than swallowing it.
          console.error(
            `setSettings: story card not found to update "${storyCard.title}" (id ${storyCard.id}); setting "${settingName}" was not saved.`,
          );
        }
      } catch (e) {
        console.error(
          `setSettings: failed updating story card "${storyCard.title}" (id ${storyCard.id}) for "${settingName}": ${e && e.message ? e.message : e}`,
        );
      }
    },
  },
};

// NOTE: This function needs to be called from the onModelContext or onOutput hook
// for the logic to execute each turn.

// Turn Counter Logic (Used in Context Hook)
function CounterUpdate() {
  if (
    typeof info !== "undefined" &&
    info.actionCount !== state.PA.lastActionCount
  ) {
    state.PA.turnCount = (state.PA.turnCount % state.PA.defaultTurns) + 1;
    state.PA.lastActionCount = info.actionCount;
  }
}

function WorldLootPlayer(text = "", options = {}) {
  // Initialize state properties if missing
  const playerName = state.PS.Name;
  const playerInventory = state.PS.inventory;

  if (typeof state.lootCooldown !== "number") state.lootCooldown = 0;
  if (typeof state.isCursed !== "boolean") state.isCursed = false;
  if (typeof state.isBlessed !== "boolean") state.isBlessed = false;

  // BOSS FLAG
  const isBoss = options.isBoss === true;

  const COOLDOWN_LENGTH = isBoss ? 5 : 25;

  // Tick down cooldown
  if (state.lootCooldown > 0) {
    state.lootCooldown--;
  }

  // IMPROVED COOLDOWN GATE (prevents loot every kill)
  const lootRoll = Math.random();
  const lootChance = isBoss ? 1.0 : 0.35; // bosses always drop, mobs don’t
  if (state.lootCooldown > 0 || lootRoll > lootChance) {
    return { text };
  }

  // Calculate loot tier based on player level
  let lootTier;
  if (state.PS.level <= 10) lootTier = "LL";
  else if (state.PS.level <= 25) lootTier = "ML";
  else lootTier = "HL";

  // Get random category (weighted)
  const categories = [
    "consumables",
    "weapons",
    "armor",
    "back",
    "rings",
    "necklaces",
    "bags",
  ];
  const categoryWeights = [30, 5, 10, 25, 15, 5, 5];

  // Roll against the actual weight total, not a hard-coded 100 — the weights
  // sum to 95, so a flat 0-99 roll used to fall through and leave 'None'.
  const weightTotal = categoryWeights.reduce((sum, w) => sum + w, 0);
  let categoryRoll = Math.random() * weightTotal;
  let selectedCategory = categories[categories.length - 1];
  let cumulativeWeight = 0;

  for (let i = 0; i < categories.length; i++) {
    cumulativeWeight += categoryWeights[i];
    if (categoryRoll < cumulativeWeight) {
      selectedCategory = categories[i];
      break;
    }
  }

  // BIOME-BASED BASE ITEM FILTERING
  const biome = state.worldBiome || "default";
  const categoryPool = (WorldLoot[lootTier] || {})[selectedCategory];
  if (!Array.isArray(categoryPool)) return { text };
  let categoryItems = categoryPool.filter((item) => {
    return !item.biomes || item.biomes.includes(biome);
  });
  //console.log(categoryItems)
  if (!categoryItems.length) return { text };

  const template =
    categoryItems[Math.floor(Math.random() * categoryItems.length)];

  // RARITY & STAT ROLL INHERITANCE
  // applyStatRolls returns a CLONE — everything below mutates that clone, never
  // the shared WorldLoot template (which used to get permanently corrupted).
  const rarity = rollRarity(template, isBoss);
  let baseItem = applyStatRolls(
    template,
    rarity,
    state.PS.level,
    state.PS.luck || 0,
  );

  // SET ITEM INJECTION (FIRE SET)
  if (selectedCategory === "armor" && Math.random() < 0.05) {
    if (Math.random() < 0.5) {
      baseItem.set = "Emberbound";
      baseItem.fireBonus = 5;
    }
  }

  // LUCK-BASED BONUS ITEM
  let bonusItem = null;
  let requiredLuck = 5 + state.PS.level * 0.5;
  let actualLuck = state.PS.luck || 0;

  if (actualLuck >= requiredLuck && Math.random() < actualLuck / 100) {
    const upgradedTier = lootTier === "LL" ? "ML" : "HL";
    const bonusPool = WorldLoot[upgradedTier][selectedCategory];
    if (bonusPool?.length) {
      bonusItem = {
        ...bonusPool[Math.floor(Math.random() * bonusPool.length)],
      };
    }
  }

  // Build text output
  console.log(baseItem.name);
  state.logMessages["Input"].push(
    `\n${playerName} gained items!|loot:` + baseItem.name,
  );

  if (bonusItem) {
    state.logMessages["Input"].push(
      `\nBonus loot:${playerName} gained items!|loot:${baseItem.name}` +
        `${bonusItem.name}`,
    );
    state.logMessages["Output"].push(`Bonus item gained!`);
  }

  // Apply cooldown
  state.lootCooldown = COOLDOWN_LENGTH;

  // Add loot to inventory
  if (playerName && playerInventory) {
    console.log("Item made");
    state.PS.inventory.push(baseItem);
    if (bonusItem) state.PS.inventory.push(bonusItem);
  } else {
    console.log("Nothing made!");
  }

  return text;
}

function getGold() {
  const player = state.PS;
  const Name = player.Name;

  // GOLD REWARD: always grant some gold when world loot triggers
  if (typeof state.PS.gold !== "number") {
    state.PS.gold = 0;
  }
  const playerLevel = state.PS.level || 1;
  let baseGold;
  switch (lootTier) {
    case "LL":
      baseGold = 3 + playerLevel * 1;
      break;
    case "ML":
      baseGold = 6 + playerLevel * 2;
      break;
    case "HL":
    default:
      baseGold = 10 + playerLevel * 3;
      break;
  }
  const goldReward = Math.max(
    1,
    Math.floor(baseGold * (0.75 + Math.random() * 0.5)),
  ); // ±25% variance

  if (goldReward && Name) {
    player.gold.push(goldReward);
    state.logMessages["Output"].push(`Gained: ${goldReward} gold!`);
  }
}

// Safe initialization (put this near your global init)
state.message = state.message || {};

// If you only want to set an empty string when context is missing:
if (state.message.context === undefined) {
  state.message.context = "";
}

//console.log()

function StoryCards() {
  // Generate starting story cards
  // This is just a dumb needed thing so the Ai does not get sent to valhalla
  const labyrinthenterEntry =
    "A character has entered the labyrinth threw a portal and now sits at the gates entrace or area. The labrinth now is before them as a masive stairway leading down. Only one character enters the labrinth at a time .";

  CommunityUtils.StoryCards.find(
    "enter labyrinth",
    true,
    labyrinthenterEntry,
    "Narritive: Locations",
  );

  const labyrinthEntry =
    "The labyrinth dungeon is divided into three main tiers: Top, Middle, and Lower Levels. Within lie massive caves, winding tunnels, boss chambers, and hidden sub - levels. Monster strength increases with each descent; upper levels remain suitable for novices. An identification enchantment created by the Noble Legion Guild allows recognition of monsters and their weaknesses. All monsters share a single vulnerability: a monster core. The lowest levels are perilous and few adventurers reach or return from them. The labyrinth is open to any who survive its depths.";

  CommunityUtils.StoryCards.find(
    "dungeon labyrinth, labyrinth, dungeon",
    true,
    labyrinthEntry,
    "Narritive: Locations",
  );
}

function indexLast(str, substr) {
  let i = str.indexOf(substr);
  if (i < 0) {
    return -1;
  }
  return i + substr.length;
}

function once(key) {
  key = key + "_ONCE";
  var retval = state[key] == undefined || state[key];
  state[key] = false;
  return retval;
}

function inject(
  ctx,
  payload,
  action = (ctx, payload) => {
    ctx.LA += payload;
  },
) {
  const prefix = "..."; // AI doesn't seem to have much of an issue when this is put into the beginning of the recent story
  let additions = prefix.length + payload.length;
  let overflow = ctx.length + additions - info.maxChars;
  if (0 < overflow) {
    ctx.RS = ctx.RS.slice(overflow);
    ctx.RS = ctx.RS.slice(ctx.RS.search(/[\s]/g));
    ctx.RS = prefix + ctx.RS;
  }
  action(ctx, payload);
  ctx.length = Object.values(ctx).reduce((accum, sum) => {
    return typeof sum !== "string" ? accum : accum + sum.length;
  }, 0);
  return ctx; // For convenience
}

function extractSections(text, headings) {
  let result = [];
  let cursor = 0;

  for (let i = 0; i < headings.length; i++) {
    let start = text.indexOf(headings[i], cursor);
    if (start === -1) {
      result.push("");
      continue;
    }
    start += headings[i].length;

    let end = -1;
    for (let j = i + 1; j < headings.length && end === -1; j++) {
      end = text.indexOf(headings[j], start);
    }

    if (end === -1) {
      end = text.length;
    }
    result.push(text.slice(start, end));
    cursor = end;
  }

  return result;
}

const ctxHeadings = [
  "",
  "World Lore:\n",
  "Story Summary:\n",
  "Memories:\n",
  "Recent Story:\n",
  "[Author's note: ",
  "]\n",
];

function splatContext(text) {
  let result = extractSections(text, ctxHeadings);

  return {
    /* If one of the sections is empty, it is set to '' instead. */
    PE: result[0], // Plot Essentials
    SC: result[1], // Story Cards
    SS: result[2], // Story Summary
    MM: result[3], // Memories
    RS: result[4], // Recent Story
    AN: result[5], // Author's Note
    LA: result[6], // Last Action
    length: text.length,
  };
}

function unsplatContext(ctx) {
  return (
    ctxHeadings[0] +
    ctx.PE +
    ctxHeadings[1] +
    ctx.SC +
    ctxHeadings[2] +
    ctx.SS +
    ctxHeadings[3] +
    ctx.MM +
    ctxHeadings[4] +
    ctx.RS +
    ctxHeadings[5] +
    ctx.AN +
    ctxHeadings[6] +
    ctx.LA
  );
}

// End Of Constants

function arreq(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}

///// ---------- Story Progression Script ----------

if (state.EventsPool == undefined) {
  // you can Adjust [0,Your text goes here]
  // The number is for current turns you want it too apear
  // the text is for what you want loaded at the botttem of the context
  state.EventsPool = [
    [2, "An evil pressence is watching you"],
    [5, '"Goblin Kings boss has spawnned"'],
  ];
}

const FireEvents = () => {
  // Creates event baseed on the current action
  let newpool = [];
  let fired = "";
  for (e of state.EventsPool) {
    if (e[0] < state.PS.level) {
      // Uses level to control events from Story Cards.
      fired += " " + e[1];
    } else {
      newpool.push(e);
    }
    state.EventsPool = newpool;
    return fired;
  }
};

const WorldLoot = {
  // Base items for the player
  LL: {
    consumables: [
      {
        name: "Lesser Healing Potion",
        level: "LL",
        type: "consumable",
        subtype: "potion",
        uses: 1,
        effect: { health: 10 },
      },
      {
        name: "Health Potion",
        level: "LL",
        type: "consumable",
        subtype: "potion",
        uses: 2,
        effect: { health: 20 },
      },
      {
        name: "Healing Salve",
        level: "LL",
        type: "consumable",
        subtype: "salve",
        effect: { health: 10 },
      },
      {
        name: "Minor Mana Potion",
        level: "LL",
        type: "consumable",
        subtype: "potion",
        uses: 1,
        effect: { mana: 10 },
      },
      {
        name: "Mana Potion",
        level: "LL",
        type: "consumable",
        subtype: "potion",
        uses: 1,
        effect: { mana: 15 },
      },
      {
        name: "Bread Loaf",
        level: "LL",
        type: "consumable",
        subtype: "food",
        uses: 3,
        effect: { health: 5 },
      },
      {
        name: "Sweetroll",
        level: "LL",
        type: "consumable",
        subtype: "food",
        effect: { health: 6, mana: 4 },
      },
      {
        name: "Cabbage Soup",
        level: "LL",
        type: "consumable",
        subtype: "food",
        effect: { health: 8 },
      },
      {
        name: "Apple",
        level: "LL",
        type: "consumable",
        subtype: "food",
        effect: { health: 4 },
      },
      {
        name: "Cheese Wheel",
        level: "LL",
        type: "consumable",
        subtype: "food",
        effect: { health: 6 },
      },
      {
        name: "Weak Poison Flask",
        level: "LL",
        type: "consumable",
        subtype: "throwable",
        uses: 1,
        effect: { damage: 6, poison: 4 },
      },
      {
        name: "Weak Fire Flask",
        level: "LL",
        type: "consumable",
        subtype: "throwable",
        uses: 1,
        effect: { damage: 6, fire: 5 },
      },
      {
        name: "Weak Frost Flask",
        level: "LL",
        type: "consumable",
        subtype: "throwable",
        uses: 1,
        effect: { damage: 6, frost: 5 },
      },
      {
        name: "Glass Bottle (Empty)",
        level: "LL",
        type: "misc",
        subtype: "container",
      },
      {
        name: "Glass Flask (Empty)",
        level: "LL",
        type: "misc",
        subtype: "container",
      },
      {
        name: "Waterskin (Fresh)",
        level: "LL",
        type: "consumable",
        subtype: "water",
        uses: 5,
        effect: { hydration: 30, stamina: 5 },
      },
      {
        name: "Bottled Water",
        level: "LL",
        type: "consumable",
        subtype: "water",
        uses: 2,
        effect: { hydration: 20 },
      },
      {
        name: "Dirty River Water",
        level: "LL",
        type: "consumable",
        subtype: "water",
        uses: 1,
        effect: { hydration: 15 },
      },
    ],
    weapons: [
      {
        name: "Copper Shortsword",
        level: "LL",
        type: "weapon",
        subtype: "sword",
        slot: "mainhand",
        modifiers: { strength: 3, damage: 6, range: 10, is2H: false },
      },
      {
        name: "Bronze Dagger",
        level: "LL",
        type: "weapon",
        subtype: "dagger",
        slot: "mainhand",
        modifiers: {
          dexterity: 4,
          damage: 7,
          critChance: 2,
          range: 8,
          is2H: false,
        },
      },
      {
        name: "Iron Mace",
        level: "LL",
        type: "weapon",
        subtype: "mace",
        slot: "offhand",
        modifiers: { strength: 5, damage: 8, range: 10, is2H: false },
      },
      {
        name: "Steel War Axe",
        level: "LL",
        type: "weapon",
        subtype: "axe",
        slot: "mainhand",
        modifiers: { strength: 6, damage: 9, range: 12, is2H: false },
      },
      {
        name: "Black Steel Bow",
        level: "LL",
        type: "weapon",
        subtype: "bow",
        slot: "mainhand",
        modifiers: { dexterity: 7, damage: 10, range: 45, is2H: true },
      },
      {
        name: "Iron Spear",
        level: "LL",
        type: "weapon",
        subtype: "spear",
        slot: "mainhand",
        modifiers: {
          strength: 4,
          dexterity: 3,
          damage: 8,
          range: 30,
          is2H: false,
        },
      },
      {
        name: "Rusty Shiv",
        level: "LL",
        type: "weapon",
        subtype: "dagger",
        slot: "mainhand",
        modifiers: { damage: 5, range: 8, is2H: false },
      },
    ],
    armor: [
      {
        name: "Fur Armor",
        level: "LL",
        type: "armor",
        subtype: "light",
        slot: "chest",
        modifiers: { maxHealth: 40, health: 8 },
      },
      {
        name: "Iron Helmet",
        level: "LL",
        type: "armor",
        subtype: "heavy",
        slot: "head",
        modifiers: { maxHealth: 20 },
      },
      {
        name: "Leather Boots",
        level: "LL",
        type: "armor",
        subtype: "light",
        slot: "boots",
        modifiers: { maxHealth: 15, mana: 5 },
      },
      {
        name: "Hide Shield",
        level: "LL",
        type: "armor",
        subtype: "shield",
        slot: "offhand",
        modifiers: { maxHealth: 35 },
      },
      {
        name: "Studded Imperial Armor",
        level: "LL",
        type: "armor",
        subtype: "light",
        slot: "chest",
        modifiers: { maxHealth: 50 },
      },
    ],
    back: [
      {
        name: "Traveler's Cloak",
        level: "LL",
        type: "accessory",
        subtype: "cloak",
        slot: "back",
        modifiers: { dexterity: 4, baseDamage: 5 },
      },
      {
        name: "Roughspun Cloak",
        level: "LL",
        type: "accessory",
        subtype: "cloak",
        slot: "back",
        modifiers: { maxHealth: 20 },
      },
    ],
    rings: [
      {
        name: "Copper Ring of Vitality",
        level: "LL",
        type: "accessory",
        subtype: "ring",
        slot: "ring",
        modifiers: { maxHealth: 25 },
      },
      {
        name: "Iron Band",
        level: "LL",
        type: "accessory",
        subtype: "ring",
        slot: "ring",
        modifiers: { strength: 5 },
      },
    ],
    necklaces: [
      {
        name: "Bronze Amulet",
        level: "LL",
        type: "accessory",
        subtype: "amulet",
        slot: "necklace",
        modifiers: { health: 15, mana: 10 },
      },
    ],
    bags: [
      {
        name: "Leather Satchel",
        level: "LL",
        type: "bag",
        subtype: "satchel",
        slot: "misc",
        inventoryMaxSize: 16,
      },
    ],
  },

  ML: {
    consumables: [
      {
        name: "Greater Healing Potion",
        level: "ML",
        type: "consumable",
        subtype: "potion",
        uses: 2,
        effect: { health: 22 },
      },
      {
        name: "Elixir of Health",
        level: "ML",
        type: "consumable",
        subtype: "elixir",
        effect: { health: 28 },
      },
      {
        name: "Greater Mana Potion",
        level: "ML",
        type: "consumable",
        subtype: "potion",
        uses: 2,
        effect: { mana: 22 },
      },
      {
        name: "Elixir of Magic",
        level: "ML",
        type: "consumable",
        subtype: "elixir",
        effect: { mana: 28 },
      },
      {
        name: "Hagraven Stew",
        level: "ML",
        type: "consumable",
        subtype: "food",
        effect: { health: 18, mana: 18 },
      },
      {
        name: "Venison Steak",
        level: "ML",
        type: "consumable",
        subtype: "food",
        effect: { health: 20 },
      },
      {
        name: "Fire Resist Potion",
        level: "ML",
        type: "consumable",
        subtype: "potion",
        uses: 1,
        effect: { fireResist: 30, duration: 60 },
      },
      {
        name: "Alchemist's Fire Flask",
        level: "ML",
        type: "consumable",
        subtype: "throwable",
        uses: 1,
        effect: { damage: 18, fire: 15 },
      },
      {
        name: "Frost Venom Flask",
        level: "ML",
        type: "consumable",
        subtype: "throwable",
        uses: 1,
        effect: { damage: 18, frost: 12, slow: 20 },
      },
      {
        name: "Sweetroll of Fortify",
        level: "ML",
        type: "consumable",
        subtype: "food",
        effect: { maxHealth: 40, duration: 120 },
      },
    ],
    weapons: [
      {
        name: "Silver Saber",
        level: "ML",
        type: "weapon",
        subtype: "sword",
        slot: "mainhand",
        modifiers: {
          strength: 10,
          damage: 16,
          critChance: 3,
          range: 12,
          is2H: false,
        },
      },
      {
        name: "Elven Dagger",
        level: "ML",
        type: "weapon",
        subtype: "dagger",
        slot: "mainhand",
        modifiers: {
          dexterity: 14,
          damage: 17,
          critChance: 5,
          range: 10,
          is2H: false,
        },
      },
      {
        name: "Dwarven Warhammer",
        level: "ML",
        type: "weapon",
        subtype: "hammer",
        slot: "mainhand",
        modifiers: { strength: 18, damage: 20, range: 15, is2H: true },
      },
      {
        name: "Glass Bow",
        level: "ML",
        type: "weapon",
        subtype: "bow",
        slot: "mainhand",
        modifiers: { dexterity: 16, damage: 19, range: 55, is2H: true },
      },
      {
        name: "Skyforge Steel Greatsword",
        level: "ML",
        type: "weapon",
        subtype: "greatsword",
        slot: "mainhand",
        modifiers: { strength: 15, damage: 22, range: 20, is2H: true },
      },
      {
        name: "Orcish Mace",
        level: "ML",
        type: "weapon",
        subtype: "mace",
        slot: "offhand",
        modifiers: { strength: 16, damage: 18, range: 10, is2H: false },
      },
    ],
    armor: [
      {
        name: "Elven Armor",
        level: "ML",
        type: "armor",
        subtype: "light",
        slot: "chest",
        modifiers: { maxHealth: 120, mana: 25 },
      },
      {
        name: "Scaled Horn Armor",
        level: "ML",
        type: "armor",
        subtype: "light",
        slot: "chest",
        modifiers: { maxHealth: 140, health: 15 },
      },
      {
        name: "Glass Helmet",
        level: "ML",
        type: "armor",
        subtype: "light",
        slot: "head",
        modifiers: { maxHealth: 70, mana: 20 },
      },
      {
        name: "Dwarven Shield",
        level: "ML",
        type: "armor",
        subtype: "shield",
        slot: "offhand",
        modifiers: { maxHealth: 150 },
      },
      {
        name: "Orcish Boots",
        level: "ML",
        type: "armor",
        subtype: "heavy",
        slot: "boots",
        modifiers: { maxHealth: 80 },
      },
    ],
    back: [
      {
        name: "Cloak of the Gray Fox",
        level: "ML",
        type: "accessory",
        subtype: "cloak",
        slot: "back",
        modifiers: { dexterity: 12, luck: 8 },
      },
      {
        name: "Shrouded Cowl (Back)",
        level: "ML",
        type: "accessory",
        subtype: "cloak",
        slot: "back",
        modifiers: { baseDamage: 5, critChance: 6 },
      },
    ],
    rings: [
      {
        name: "Ring of Namira",
        level: "ML",
        type: "accessory",
        subtype: "ring",
        slot: "ring",
        modifiers: { health: 40, damage: 12 },
      },
      {
        name: "Silver Blood Ring",
        level: "ML",
        type: "accessory",
        subtype: "ring",
        slot: "ring",
        modifiers: { maxHealth: 60 },
      },
    ],
    necklaces: [
      {
        name: "Amulet of Talos",
        level: "ML",
        type: "accessory",
        subtype: "amulet",
        slot: "necklace",
        modifiers: { stamina: 30, critChance: 6 },
      },
      {
        name: "Bone Hawk Amulet",
        level: "ML",
        type: "accessory",
        subtype: "amulet",
        slot: "necklace",
        modifiers: { mana: 40 },
      },
    ],
    bags: [
      {
        name: "Elven Pack",
        level: "ML",
        type: "bag",
        subtype: "backpack",
        slot: "misc",
        inventoryMaxSize: 28,
      },
    ],
  },

  HL: {
    consumables: [
      {
        name: "Supreme Healing Potion",
        level: "HL",
        type: "consumable",
        subtype: "potion",
        uses: 2,
        effect: { health: 40 },
      },
      {
        name: "Elixir of Ultimate Health",
        level: "HL",
        type: "consumable",
        subtype: "elixir",
        effect: { health: 55 },
      },
      {
        name: "Philter of True Magicka",
        level: "HL",
        type: "consumable",
        subtype: "potion",
        effect: { mana: 50 },
      },
      {
        name: "White-Gold Tower Elixir",
        level: "HL",
        type: "consumable",
        subtype: "elixir",
        effect: { health: 35, mana: 35 },
      },
      {
        name: "Mammoth Cheese Bowl",
        level: "HL",
        type: "consumable",
        subtype: "food",
        effect: { maxHealth: 60, duration: 300 },
      },
      {
        name: "Dragon's Breath Flask",
        level: "HL",
        type: "consumable",
        subtype: "throwable",
        uses: 1,
        effect: { damage: 35, fire: 25 },
      },
      {
        name: "Void Frost Flask",
        level: "HL",
        type: "consumable",
        subtype: "throwable",
        uses: 1,
        effect: { damage: 35, frost: 25, slow: 40 },
      },
      {
        name: "Potion of Blood",
        level: "HL",
        type: "consumable",
        subtype: "potion",
        effect: { health: 60, vampiric: 20 },
      },
    ],
    weapons: [
      {
        name: "Dragonbone Greatsword",
        level: "HL",
        type: "weapon",
        subtype: "greatsword",
        slot: "mainhand",
        modifiers: { strength: 28, damage: 34, range: 22, is2H: true },
      },
      {
        name: "Daedric Dagger",
        level: "HL",
        type: "weapon",
        subtype: "dagger",
        slot: "mainhand",
        modifiers: {
          dexterity: 25,
          damage: 30,
          critChance: 10,
          range: 10,
          is2H: false,
        },
      },
      {
        name: "Ebony War Axe",
        level: "HL",
        type: "weapon",
        subtype: "axe",
        slot: "offhand",
        modifiers: { strength: 30, damage: 32, range: 12, is2H: false },
      },
      {
        name: "Stalhrim Longbow",
        level: "HL",
        type: "weapon",
        subtype: "bow",
        slot: "mainhand",
        modifiers: {
          dexterity: 32,
          damage: 35,
          frost: 15,
          range: 65,
          is2H: true,
        },
      },
      {
        name: "Dawnbreaker",
        level: "HL",
        type: "weapon",
        subtype: "sword",
        slot: "mainhand",
        modifiers: {
          strength: 26,
          damage: 33,
          light: 20,
          range: 15,
          is2H: false,
        },
      },
      {
        name: "Volendrung",
        level: "HL",
        type: "weapon",
        subtype: "hammer",
        slot: "mainhand",
        modifiers: {
          strength: 35,
          damage: 40,
          absorbStamina: 25,
          range: 20,
          is2H: true,
        },
      },
    ],
    armor: [
      {
        name: "Dragonplate Armor",
        level: "HL",
        type: "armor",
        subtype: "heavy",
        slot: "chest",
        modifiers: { maxHealth: 350, health: 30 },
      },
      {
        name: "Daedric Helmet",
        level: "HL",
        type: "armor",
        subtype: "heavy",
        slot: "head",
        modifiers: { maxHealth: 180, mana: 40 },
      },
      {
        name: "Ebony Boots",
        level: "HL",
        type: "armor",
        subtype: "heavy",
        slot: "boots",
        modifiers: { maxHealth: 120, mana: 50 },
      },
      {
        name: "Spellbreaker",
        level: "HL",
        type: "armor",
        subtype: "shield",
        slot: "offhand",
        modifiers: { maxHealth: 250, magicResist: 25 },
      },
      {
        name: "Dragonbone Cuirass",
        level: "HL",
        type: "armor",
        subtype: "heavy",
        slot: "chest",
        modifiers: { maxHealth: 400 },
      },
    ],
    back: [
      {
        name: "Archmage's Robes (Back)",
        level: "HL",
        type: "accessory",
        subtype: "cloak",
        slot: "back",
        modifiers: { mana: 100, maxMana: 80, critChance: 8 },
      },
      {
        name: "Deathbrand Cloak",
        level: "HL",
        type: "accessory",
        subtype: "cloak",
        slot: "back",
        modifiers: { damage: 30, critChance: 12 },
      },
    ],
    rings: [
      {
        name: "Ring of the Erudite",
        level: "ML",
        type: "accessory",
        subtype: "ring",
        slot: "ring",
        modifiers: { mana: 80, intelligence: 20 },
      },
      {
        name: "Ahzidal's Ring of Arcana",
        level: "HL",
        type: "accessory",
        subtype: "ring",
        slot: "ring",
        modifiers: { damage: 25, fire: 20 },
      },
    ],
    necklaces: [
      {
        name: "Amulet of Dragons",
        level: "HL",
        type: "accessory",
        subtype: "amulet",
        slot: "necklace",
        modifiers: { damage: 30, fireResist: 40 },
      },
      {
        name: "Gauldur Amulet",
        level: "HL",
        type: "accessory",
        subtype: "amulet",
        slot: "necklace",
        modifiers: { maxHealth: 100, mana: 80, stamina: 80 },
      },
    ],
    bags: [
      {
        name: "Daedric Bag of Holding",
        level: "HL",
        type: "bag",
        subtype: "backpack",
        slot: "misc",
        inventoryMaxSize: 45,
      },
    ],
  },

  Utility: [
    { name: "Torch", type: "misc", subtype: "light" },
    { name: "Rope", type: "misc", subtype: "tool" },
    { name: "Small Key", type: "misc", subtype: "key" },
    { name: "Gold Coin", type: "misc", subtype: "currency" },
    { name: "Empty Pouch", type: "misc", subtype: "container" },
    { name: "Map", type: "misc", subtype: "document" },
  ],
};

function getBaseItemTypes() {
  // Base items types
  return {
    weapons: {
      oneHanded: {
        sword: {
          id: "weapon_1h_sword",
          name: "Sword",
          category: "weapon",
          subType: "sword",
          slot: "mainhand",
          implicitStats: { damage: 5 },
          allowedStats: ["strength", "dexterity", "physical", "critChance"],
          flags: { is2H: false },
        },

        dagger: {
          id: "weapon_dagger",
          name: "Dagger",
          category: "weapon",
          subType: "dagger",
          slot: "mainhand",
          implicitStats: { damage: 3, critChance: 3 },
          allowedStats: ["dexterity", "bleed", "poison", "critChance"],
          flags: { is2H: false },
        },

        mace: {
          id: "weapon_1h_mace",
          name: "Mace",
          category: "weapon",
          subType: "mace",
          slot: "mainhand",
          implicitStats: { damage: 6 },
          allowedStats: ["strength", "physical", "armor"],
          flags: { is2H: false },
        },

        hatchet: {
          id: "weapon_hatchet",
          name: "Hatchet",
          category: "weapon",
          subType: "axe",
          slot: "mainhand",
          implicitStats: { damage: 4 },
          allowedStats: ["strength", "bleed", "physical"],
          flags: { is2H: false },
        },
      },

      twoHanded: {
        greatsword: {
          id: "weapon_2h_greatsword",
          name: "Greatsword",
          category: "weapon",
          subType: "sword",
          slot: "mainhand",
          implicitStats: { damage: 10 },
          allowedStats: ["strength", "physical", "critChance"],
          flags: { is2H: true },
        },

        warhammer: {
          id: "weapon_2h_warhammer",
          name: "Warhammer",
          category: "weapon",
          subType: "hammer",
          slot: "mainhand",
          implicitStats: { damage: 12 },
          allowedStats: ["strength", "physical", "armor"],
          flags: { is2H: true },
        },

        spear: {
          id: "weapon_2h_spear",
          name: "Spear",
          category: "weapon",
          subType: "spear",
          slot: "mainhand",
          implicitStats: { damage: 8 },
          allowedStats: ["dexterity", "physical", "critChance"],
          flags: { is2H: true },
        },
      },

      ranged: {
        shortBow: {
          id: "weapon_short_bow",
          name: "Short Bow",
          category: "weapon",
          subType: "bow",
          slot: "mainhand",
          implicitStats: { damage: 6 },
          allowedStats: ["dexterity", "physical", "critChance"],
          flags: { is2H: true, isRanged: true },
        },

        longBow: {
          id: "weapon_long_bow",
          name: "Long Bow",
          category: "weapon",
          subType: "bow",
          slot: "mainhand",
          implicitStats: { damage: 9 },
          allowedStats: ["dexterity", "physical", "critChance"],
          flags: { is2H: true, isRanged: true },
        },

        crossbow1H: {
          id: "weapon_crossbow_1h",
          name: "One-Handed Crossbow",
          category: "weapon",
          subType: "crossbow",
          slot: "mainhand",
          implicitStats: { damage: 7 },
          allowedStats: ["dexterity", "physical"],
          flags: { is2H: false, isRanged: true },
        },
      },

      shields: {
        buckler: {
          id: "shield_buckler",
          name: "Wooden Buckler",
          category: "armor",
          subType: "shield",
          slot: "offhand",
          implicitStats: { armor: 3 },
          allowedStats: ["armor", "blockChance"],
          flags: { isShield: true },
        },

        tower: {
          id: "shield_tower",
          name: "Tower Shield",
          category: "armor",
          subType: "shield",
          slot: "offhand",
          implicitStats: { armor: 8 },
          allowedStats: ["armor", "maxHealth", "barrier"],
          flags: { isShield: true },
        },
      },
    },

    armor: {
      chest: {
        leather: {
          id: "armor_chest_leather",
          name: "Leather Jerkin",
          category: "armor",
          subType: "chest",
          slot: "chest",
          implicitStats: { armor: 4 },
          allowedStats: ["dexterity", "health"],
        },

        chain: {
          id: "armor_chest_chain",
          name: "Chain Shirt",
          category: "armor",
          subType: "chest",
          slot: "chest",
          implicitStats: { armor: 7 },
          allowedStats: ["strength", "health", "barrier"],
        },
      },

      boots: {
        traveler: {
          id: "armor_boots_traveler",
          name: "Traveler's Boots",
          category: "armor",
          subType: "boots",
          slot: "boots",
          implicitStats: { vision: 2 },
          allowedStats: ["dexterity", "luck"],
        },
      },
    },

    jewelry: {
      rings: {
        iron: {
          id: "ring_iron",
          name: "Iron Ring",
          category: "jewelry",
          subType: "ring",
          slot: "ring",
          implicitStats: {},
          allowedStats: ["strength", "health", "armor"],
        },
      },

      necklaces: {
        copper: {
          id: "amulet_copper",
          name: "Copper Amulet",
          category: "jewelry",
          subType: "necklace",
          slot: "necklace",
          implicitStats: {},
          allowedStats: ["mana", "intelligence", "luck"],
        },
      },
    },

    foci: {
      oakWand: {
        id: "focus_oak_wand",
        name: "Oak Wand",
        category: "focus",
        subType: "wand",
        slot: "mainhand",
        implicitStats: { "spell damage": 4 },
        allowedStats: ["intelligence", "mana", "spell damage"],
      },

      spellbook: {
        id: "focus_spellbook_basic",
        name: "Beginner Spellbook",
        category: "focus",
        subType: "spellbook",
        slot: "offhand",
        implicitStats: { mana: 5 },
        allowedStats: ["intelligence", "mana", "spell damage"],
      },
    },
  };
}

const ITEM_RARITIES = {
  // Item Rarities
  common: {
    name: "Common",
    statRange: [1, 2],
    tagChance: 0,
    specialChance: 0,
    drawbackChance: 0,
    weight: 20,
  },

  magic: {
    name: "Magic",
    statRange: [1, 3],
    tagChance: 0.1,
    specialChance: 0,
    drawbackChance: 0,
    weight: 30,
  },

  rare: {
    name: "Rare",
    statRange: [2, 5],
    tagChance: 0.15,
    specialChance: 0,
    drawbackChance: 0,
    weight: 10,
  },

  mythic: {
    name: "Mythic",
    statRange: [3, 6],
    tagChance: 0.2,
    specialChance: 0.1,
    drawbackChance: 0,
    weight: 5,
  },

  legendary: {
    name: "Legendary",
    statRange: [5, 6],
    tagChance: 0.25,
    specialChance: 1,
    drawbackChance: 0,
    weight: 2,
  },

  unique: {
    name: "Unique",
    statRange: [6, 6],
    tagChance: 1,
    specialChance: 1,
    drawbackChance: 0.2,
    weight: 1,
  },
};

// === NEW: Stat Whitelist ===
const PLAYER_STATS = new Set([
  "armor",
  "damage",
  "spell damage",
  "skill damage",
  "fire",
  "frost",
  "lightning",
  "nature",
  "physical",
  "bleed",
  "poison",
  "chaos",
  "barrier",
  "maxBarrier",
  "health",
  "maxHealth",
  "mana",
  "maxMana",
  "strength",
  "dexterity",
  "intelligence",
  "vision",
  "luck",
  "critChance",
]);

const STAT_TIERS = [
  { tier: 1, multiplier: 0.6 },
  { tier: 2, multiplier: 0.85 },
  { tier: 3, multiplier: 1.0 },
  { tier: 4, multiplier: 1.25 },
  { tier: 5, multiplier: 1.6 },
];

function weightedPick(entries) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
}

function rollStatTier(playerLevel, luck) {
  const tierWeights = STAT_TIERS.map((t) => {
    const levelBias = Math.min(playerLevel / 50, 1);
    const luckBias = Math.min(luck / 100, 1);

    return {
      value: t,
      weight: (1 + t.tier * levelBias) * (1 + luckBias),
    };
  });

  return weightedPick(tierWeights);
}

function rollStatValue(stat, tier, playerLevel) {
  const base = 1 + Math.floor(playerLevel / 10);
  return Math.round(base * tier.multiplier);
}

// ---- Loot rarity & stat rolls ----------------------------------------------
// Keys that live in an item's `modifiers` but are NOT scalable stats.
const NON_SCALING_MODIFIERS = new Set(["is2H", "range", "slot", "set"]);

// Roll a rarity off the ITEM_RARITIES weight ladder. High rarities are rare by
// design; a boss shifts the odds away from common.
function rollRarity(baseItem, isBoss) {
  const entries = Object.keys(ITEM_RARITIES).map((key) => ({
    value: key,
    weight:
      ITEM_RARITIES[key].weight * (isBoss ? (key === "common" ? 0.25 : 2) : 1),
  }));
  return weightedPick(entries) || "common";
}

// Return a CLONE of `item` with its numeric modifiers scaled by rarity, player
// level and luck. Never mutates the source — WorldLoot entries are shared
// templates and must stay pristine for the rest of the run.
function applyStatRolls(item, rarityKey, playerLevel, luck) {
  const rarity = ITEM_RARITIES[rarityKey] || ITEM_RARITIES.common;
  const rolled = { ...item, rarity: rarityKey };

  if (item && item.modifiers) {
    const tier = rollStatTier(playerLevel || 1, luck || 0);
    // statRange sets how generous this rarity is; midpoint keeps it stable.
    const rarityMult = (rarity.statRange[0] + rarity.statRange[1]) / 2 / 2;
    const levelMult = 1 + Math.max(1, playerLevel || 1) / 20;

    rolled.modifiers = { ...item.modifiers };
    for (const stat of Object.keys(rolled.modifiers)) {
      const value = rolled.modifiers[stat];
      if (NON_SCALING_MODIFIERS.has(stat)) continue;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      rolled.modifiers[stat] = Math.max(
        1,
        Math.round(value * tier.multiplier * rarityMult * levelMult),
      );
    }
    rolled.statTier = tier.tier;
  }

  return rolled;
}

function applyRarityToBaseItem(baseItem, rarityKey, state) {
  const rarity = ITEM_RARITIES[rarityKey];
  const player = state.PS;

  const item = structuredClone(baseItem);

  item.uid = `${baseItem.id}_${crypto.randomUUID()}`;
  item.rarity = rarityKey;
  item.stats = {};
  item.tags = [];
  item.specialEffects = [];
  item.drawbacks = [];

  // How many stats?
  const statCount = randomInt(...rarity.statRange);

  const validStats = baseItem.allowedStats.filter((s) => PLAYER_STATS.has(s));

  shuffle(validStats);

  for (let i = 0; i < statCount && i < validStats.length; i++) {
    const stat = validStats[i];
    const tier = rollStatTier(player.level, player.luck);
    item.stats[stat] = rollStatValue(stat, tier, player.level);
    item.stats[stat + "_tier"] = tier.tier;
  }

  // Tags
  if (Math.random() < rarity.tagChance) {
    item.tags.push("onKill"); // placeholder
  }

  // Special Effects
  if (Math.random() < rarity.specialChance) {
    item.specialEffects.push("special_effect_placeholder");
  }

  // Drawbacks
  if (Math.random() < rarity.drawbackChance) {
    item.drawbacks.push("drawback_placeholder");
  }

  return item;
}

function makeItem(item) {
  for (const key in item.stats) {
    if (key.endsWith("_tier")) continue;
    item.stats[key] = Math.ceil(item.stats[key] * 1.25);
  }
  item.rarity = "P1";
  return item;
}

// === Starting Inventory Function (improved & fixed) ===
function getStartingInventory(className, randomObject) {
  // Normalize class name (lowercase, trim)
  const cls = className.toLowerCase().trim();

  switch (
    cls // Starting Classes
  ) {
    case "knight":
      return [
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        {
          name: "Shiny Sword",
          type: "weapon",
          slot: "mainhand",
          modifiers: { strength: 2, "base damage": 10, range: 10, is2H: false },
        },
        {
          name: "Sturdy Shield",
          type: "armor",
          slot: "offhand",
          modifiers: { maxHealth: 15 },
        },
        {
          name: "Iron Chest",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 5, mana: 10 },
        },
        {
          name: "Iron legs",
          type: "armor",
          slot: "legs",
          modifiers: { health: 5 },
        },
        {
          name: "Iron boots",
          type: "armor",
          slot: "boots",
          modifiers: { maxHealth: 5 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "wizard":
      return [
        { name: "Magic Potion", type: "consumable", effect: { mana: 50 } },
        {
          name: "Fire Staff",
          type: "weapon",
          slot: "mainhand",
          modifiers: {
            intelligence: 3,
            "base damage": 10,
            range: 10,
            is2H: true,
          },
        },
        {
          name: "Wizard Robe",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 5, maxMana: 10 },
        },
        {
          name: "Silk Legs",
          type: "armor",
          slot: "legs",
          modifiers: { health: 5 },
        },
        {
          name: "Silk Boots",
          type: "armor",
          slot: "boots",
          modifiers: { maxHealth: 5, maxMana: 5 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "druid":
      return [
        { name: "magic motion", type: "consumable", effect: { mana: 50 } },
        {
          name: "life staff",
          type: "weapon",
          slot: "mainhand",
          modifiers: {
            intelligence: 4,
            "base damage": 10,
            range: 60,
            is2H: true,
          },
        },
        {
          name: "Overgrowth Robe",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 10 },
        },
        {
          name: "Overgrowth Legs",
          type: "armor",
          slot: "legs",
          modifiers: { maxHealth: 5 },
        },
        { name: "Health Potion", type: "consumable", effect: { health: 5 } },
        {
          name: "Overgrowth Shoes",
          type: "armor",
          slot: "boots",
          modifiers: { maxHealth: 5, mana: 10 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "rogue":
      return [
        {
          name: "MainHand Dagger",
          type: "weapon",
          slot: "mainhand",
          modifiers: { dexterity: 2, "base damage": 10, range: 5, is2H: false },
        },
        {
          name: "OffHand Dagger",
          type: "weapon",
          slot: "offhand",
          modifiers: { dexterity: 2, "base damage": 5, range: 5, is2H: false },
        },
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        {
          name: "Shadow Cloak",
          type: "accessory",
          slot: "back",
          modifiers: { maxHealth: 5, health: 5 },
        },
        {
          name: "Leather Armor",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 5, health: 5 },
        },
        {
          name: "Leather Legs",
          type: "armor",
          slot: "legs",
          modifiers: { maxHealth: 5, health: 5 },
        },
        {
          name: "Leather Shoes",
          type: "armor",
          slot: "boots",
          modifiers: { critChance: 5 },
        },
        {
          name: "Leather Hood",
          type: "armor",
          slot: "head",
          modifiers: { maxMana: 5, mana: 5 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "cleric":
      return [
        {
          name: "Healing Staff",
          type: "weapon",
          slot: "mainhand",
          modifiers: { "base damage": 10, range: 10, is2H: true },
        },
        {
          name: "Blessed Robe",
          type: "armor",
          slot: "chest",
          modifiers: { maxMana: 10 },
        },
        {
          name: "Cleric Boots",
          type: "armor",
          slot: "boots",
          modifiers: { maxHealth: 5, maxMana: 10 },
        },
        {
          name: "Cleric Legs",
          type: "armor",
          slot: "legs",
          modifiers: { maxHealth: 5 },
        },
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        { name: "Mana Potion", type: "consumable", effect: { mana: 25 } },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "barbarian":
      return [
        {
          name: "Two-Handed Axe",
          type: "weapon",
          slot: "mainhand",
          modifiers: { strength: 5, "base damage": 8, range: 20, is2H: true },
        },
        { name: "Rage Potion", type: "consumable", effect: { strength: 3 } },
        {
          name: "Fur Armor",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 5 },
        },
        {
          name: "Fur Legs",
          type: "armor",
          slot: "legs",
          modifiers: { maxHealth: 5 },
        },
        {
          name: "Fur Boots",
          type: "armor",
          slot: "boots",
          modifiers: { maxMana: 10 },
        },
        {
          name: "Meat Chunk",
          type: "consumable",
          subtype: "food",
          uses: 2,
          effect: { health: 10 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "battlemage":
      return [
        {
          name: "Crude Battle Mace",
          type: "weapon",
          slot: "mainhand",
          modifiers: { strength: 2, "base damage": 10, range: 10, is2H: false },
        },
        {
          name: "Crude Iron Shield",
          type: "weapon",
          slot: "offhand",
          modifiers: { strength: 1, is2H: false },
        },
        {
          name: "Plate Armor",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 10, maxBarrier: 10 },
        },
        {
          name: "Plate Legs",
          type: "armor",
          slot: "legs",
          modifiers: { maxHealth: 5, maxMana: 10 },
        },
        {
          name: "Plate Helm",
          type: "armor",
          slot: "head",
          modifiers: { strength: 2, maxHealth: 5 },
        },
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        { name: "Magic Potion", type: "consumable", effect: { mana: 25 } },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "revanant":
      return [
        {
          name: "Serrated Blade",
          type: "weapon",
          slot: "mainhand",
          modifiers: {
            strength: 2,
            "base damage": 8,
            "bleed damage": 6,
            range: 5,
            is2H: false,
          },
        },
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        {
          name: "Bloodbound Cuirass",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 15 },
        },
        {
          name: "Bloodbound Legs",
          type: "armor",
          slot: "legs",
          modifiers: { maxHealth: 10 },
        },
        {
          name: "Bloodbound Boots",
          type: "armor",
          slot: "boots",
          modifiers: { maxHealth: 5 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    case "necromancer":
      return [
        { name: "Magic Potion", type: "consumable", effect: { mana: 50 } },
        { name: "Magic Potion", type: "consumable", effect: { mana: 50 } },
        {
          name: "Bone Staff",
          type: "weapon",
          slot: "mainhand",
          modifiers: {
            intelligence: 4,
            "base damage": 8,
            "void damage": 6,
            range: 60,
            is2H: true,
          },
        },
        {
          name: "Grave Robe",
          type: "armor",
          slot: "chest",
          modifiers: { maxHealth: 5, maxMana: 15 },
        },
        {
          name: "Grave Legs",
          type: "armor",
          slot: "legs",
          modifiers: { maxHealth: 5, maxMana: 5 },
        },
        {
          name: "Grave Boots",
          type: "armor",
          slot: "boots",
          modifiers: { maxHealth: 5, maxMana: 5 },
        },
        {
          name: "Skull Charm",
          type: "accessory",
          slot: "necklace",
          modifiers: { maxMana: 10, intelligence: 1 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];

    default:
      return [
        { name: "Health Potion", type: "consumable", effect: { health: 25 } },
        { name: "Magic Potion", type: "consumable", effect: { mana: 25 } },
        {
          name: "Shiny Sword",
          type: "weapon",
          slot: "mainhand",
          modifiers: { strength: 2, "base damage": 10, range: 10, is2H: false },
        },
        {
          name: "Sturdy Shield",
          type: "armor",
          slot: "offhand",
          modifiers: { maxHealth: 15 },
        },
        {
          name: "Bread Loaf",
          level: "LL",
          type: "consumable",
          subtype: "food",
          uses: 3,
          effect: { health: 5 },
        },
        {
          name: "Waterskin (Fresh)",
          level: "LL",
          type: "consumable",
          subtype: "water",
          uses: 5,
          effect: { hydration: 30, stamina: 5 },
        },
        { name: "Bed Roll", subtype: "rest", effect: { health: 100 } },
        randomObject,
      ];
  }
}

// State Object for starter Skills
// Which ability keys each class starts knowing. The definitions themselves
// live once, in the AbilityRegistry above — here we only list membership.
// Per-race Health/Mana bonuses, layered on the 50/50 base at creation.
// This map is the source of truth; the optionDescriptions.Race text mirrors it.
// Per-element affinities: a flat bonus to that element's damage stat, plus a
// better chance to inflict its matching status effect. Void and holy have no
// DoT of their own, so they nudge EVERY status chance instead.
const ELEMENT_AFFINITIES = {
  fire: { stat: "fire damage", bonus: 10, status: "burn", chanceBonus: 0.1 },
  frost: { stat: "frost damage", bonus: 10, status: "chill", chanceBonus: 0.1 },
  lightning: {
    stat: "lightning damage",
    bonus: 10,
    status: "shock",
    chanceBonus: 0.1,
  },
  nature: {
    stat: "nature damage",
    bonus: 10,
    status: "poison",
    chanceBonus: 0.1,
  },
  chaos: { stat: "chaos damage", bonus: 10, status: "bleed", chanceBonus: 0.1 },
  void: { stat: "void damage", bonus: 12, status: null, chanceBonus: 0.05 },
  holy: { stat: "holy damage", bonus: 12, status: null, chanceBonus: 0.05 },
};

// Creation hook: stamp the element's damage bonus onto the character.
function applyElementBonus(character, element) {
  const affinity = ELEMENT_AFFINITIES[(element || "").toLowerCase()];
  if (!affinity || !character) return null;
  character[affinity.stat] =
    (Number(character[affinity.stat]) || 0) + affinity.bonus;
  return affinity;
}

// Extra proc chance the player's element grants for a given status effect.
// An exact affinity match gets the full bonus; void/holy get their flat nudge.
function elementChanceBonus(statusKey) {
  if (!state.PS || !state.PS.Element) return 0;
  const affinity = ELEMENT_AFFINITIES[String(state.PS.Element).toLowerCase()];
  if (!affinity) return 0;
  if (affinity.status === null) return affinity.chanceBonus; // void / holy: all effects
  return affinity.status === statusKey ? affinity.chanceBonus : 0;
}

const RACE_BONUSES = {
  human: { health: 10, mana: 10 },
  elf: { health: 5, mana: 20 },
  dwarf: { health: 25, mana: 0 },
  halfling: { health: 15, mana: 5 },
  orc: { health: 25, mana: 0 },
  tiefling: { health: 5, mana: 20 },
  dragonborn: { health: 20, mana: 10 },
  gnome: { health: 5, mana: 20 },
  default: { health: 0, mana: 0 },
};

// Apply a race's bonus to a character-in-creation, bumping both current and max
// (creation happens at full HP/mana, so current tracks max).
function applyRaceBonuses(character, race) {
  const bonus =
    RACE_BONUSES[(race || "").toLowerCase()] || RACE_BONUSES.default;
  character.health += bonus.health;
  character.maxHealth += bonus.health;
  character.mana += bonus.mana;
  character.maxMana += bonus.mana;
  return bonus;
}

const STARTING_ABILITIES = {
  knight: ["slash", "bash"],
  wizard: ["fireball", "iceshot"],
  druid: ["lifespring", "spore"],
  rogue: ["backstab", "stealth"],
  cleric: ["heal", "smite"],
  barbarian: ["twin slash", "furry"],
  battlemage: ["barrier", "judicar"],
  revanant: ["blood rend", "empower", "mend"],
  necromancer: ["summon skeleton", "decay", "soul drain"],
  default: ["slash"],
};

// Build a per-player known-skill entry from the canonical registry definition.
// Keeps the { level, description, effect } shape older code expects, while the
// authoritative stats are always re-read from the registry at cast time.
function buildKnownAbility(key) {
  const def = getAbility(key);
  if (!def) return { level: 1, description: "", effect: {} };
  return {
    level: 1,
    displayName: def.displayName,
    description: def.description,
    abilityType: def.abilityType,
    magicEffect: def.magicEffect,
    targetType: def.targetType,
    cd: def.cd,
    effect: def.effect,
  };
}

function getStartingSkills(StarterSkills) {
  const key = String(StarterSkills || "").toLowerCase().trim();
  const keys = STARTING_ABILITIES[key] || STARTING_ABILITIES.default;
  const skills = {};
  for (const k of keys) skills[k] = buildKnownAbility(k);
  return skills;
}

state.logMessages = state.logMessages || {};

state.logMessages["Output"] = state.logMessages["Output"] || []; //To store friendly game messages for the player

const labyrinthMap = {
  "Top Level": ["Middle Level"],
  "Middle Level": ["Top Level", "Low Level"],
  "Low Level": ["Middle Level", "Sub Level"],
  "Sub Level": ["Low Level"],
};

const Location = ["labyrinth", "safe haven"];

const playertakestruedamage = ["magic recoil", "failed to", "spell fail"];
const TrueDamage = playertakestruedamage;

// Damage Types
const playertakesdamage = [
  { name: "*poison", icon: "☠️" },
  { name: "*bleed", icon: "💉" },
  { name: "*void", icon: "🕳️" },
  { name: "*physical", icon: "⚔️" },
  { name: "*fire", icon: "🔥" },
  { name: "*cold", icon: "❄️" },
  { name: "*electric", icon: "⚡" },
];
const PTD = playertakesdamage;

const playerattackWords = [
  // For when the player deals damage
  "strike the ",
  "hit the ",
  "attack the ",
  "launch an assault",
  "land a blow",
  "deliver a strike",
  "unleash a barrage",
  "slam your weapon down",
  "pummel the ",
  "crush their defenses",
  "pierce their armor",
  "slash the ",
  "  stab the",
  "fire a bolt",
  "blast the monster",
  "charge the enemy",
  "tackle the opponent",
  "ambush the ",
  "  get the drop on them",
  "wallop the enemy",
  "maul the ",
  "defeat the enemy",
  "vanquish the ",
  "slay the ",
  "eliminate the ",
  "attack",
  "Attack",
  "attacks",
];
const Paw = playerattackWords;

const expGained = [
  // For when the player would gain EXP
  "Experience Gained",
  "You earned XP",
  "You leveled up",
  "Skill increased",
  "Power surged",
  "Gained a level",
  "You are victorious",
  "Combat won",
  "Enemy defeated",
  "Threat eliminated",
  "You emerged triumphant",
  "Battle won",
  "Victory",
  "You survived",
  "Enemies vanquished",
  "slain",
  "killed",
  "killing blow",
  "confirmation of the kill",
  "confirm kill",
  "final strike",
  "lethal hit",
  "fatal blow",
  "death dealt",
  "target down",
  "enemy neutralized",
  "secured kill",
  "confirmed elimination",
  "clean kill",
  "terminated target",
  "enemy dispatched",
  "death confirmed",
  "enemy down",
  "clean elimination",
  "silent kill",
  "executed target",
  "no longer a threat",
  "monster kill",
  "monster slain",
  "monster executed",
  "executed",
  "has been defeated!",
];
const EXP_G = expGained;

const lowlevelMonsters = [
  {
    name: "Maze Rat",
    type: "Beast",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Chitterling",
    type: "Beast",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Stone Mites",
    type: "Aberration",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Gloom Spider",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Shard Beetle",
    type: "Beast",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Sludge Crawler",
    type: "Ooze",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Murk Slime",
    type: "Ooze",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Cave Tick",
    type: "Beast",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Echo Wisp",
    type: "Spirit",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Grime Ghoul",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Lurker Fungus",
    type: "Plant",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Hollow Skeleton",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Scrap Construct",
    type: "Construct",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Crawling Hand",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Tunnel Lizard",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Ooze Puddle",
    type: "Ooze",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Mind Maggot",
    type: "Aberration",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Feral Shade",
    type: "Spirit",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Marrow Vermin",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  { name: "Ash Imp", type: "Fiend", class: "any", rarity: "None", title: null },
  {
    name: "Narrow Wolf",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Bat",
    type: "Beast",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Grit Serpent",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Dusk Moth Swarm",
    type: "Beast",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Drip Ooze",
    type: "Ooze",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  { name: "Goblin", type: "Beast", class: "any", rarity: "None", title: null },
  { name: "Kobold", type: "Beast", class: "any", rarity: "None", title: null },
  {
    name: "Skeleton",
    type: "Undead",
    class: "any",
    rarity: "None",
    title: null,
  },
  { name: "Zombie", type: "Undead", class: "any", rarity: "None", title: null },
  { name: "Slime", type: "Beast", class: "any", rarity: "None", title: null },
  { name: "Gnoll", type: "Beast", class: "any", rarity: "None", title: null },
  {
    name: "Hobgoblin",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  { name: "Ghoul", type: "Undead", class: "any", rarity: "None", title: null },
  {
    name: "Vampire",
    type: "Undead",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Giant Spider",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Mimic",
    type: "Beast",
    class: "restricted",
    rarity: "None",
    title: null,
  },
];
const LLM = lowlevelMonsters;

const middlelevelMonsters = [
  {
    name: "Labyrinth Stalker",
    type: "Monstrosity",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Warden Construct",
    type: "Construct",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Gloom Revenant",
    type: "Undead",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Twisted Minotaur",
    type: "Monstrosity",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Bone Strider",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Hollow Knight",
    type: "Construct",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Corridor Phantom",
    type: "Spirit",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Maze Wraith",
    type: "Undead",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Shard Golem",
    type: "Construct",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Echo Beast",
    type: "Aberration",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Bloodcap Brute",
    type: "Plant",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Gravemaw Ghoul",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Fleshbound Horror",
    type: "Aberration",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Crumbling Guardian",
    type: "Construct",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Rotting Minion",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Dire Slime",
    type: "Ooze",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Shadowbound Serpent",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Blood Spider",
    type: "Beast",
    class: "any",
    rarity: "None",
    title: null,
  },
  {
    name: "Cinder Wraith",
    type: "Undead",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Tomb Eater",
    type: "Monstrosity",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Inkfiend",
    type: "Aberration",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Soul Leech",
    type: "Aberration",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Ironbound Carcass",
    type: "Undead",
    class: "restricted",
    rarity: "None",
    title: null,
  },
];
const MLM = middlelevelMonsters;

const highlevelMonsters = [
  {
    name: "Ancient Dragon",
    type: "Dragon",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Gynosphinx",
    type: "Monstrosity",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Androsphinx",
    type: "Monstrosity",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Elder Tempest",
    type: "Elemental",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Abyssal Horror",
    type: "Fiend",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Elder Brain",
    type: "Aberration",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Demilich",
    type: "Undead",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Beholder",
    type: "Aberration",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Death Tyrant",
    type: "Aberration",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Iron Golem",
    type: "Construct",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Adamantine Golem",
    type: "Construct",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Marut",
    type: "Construct",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Kraken",
    type: "Monstrosity",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Tarrasque",
    type: "Monstrosity",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Purple Worm",
    type: "Monstrosity",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Lich",
    type: "Undead",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Mind Flayer",
    type: "Aberration",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Illithid",
    type: "Aberration",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Archdevil",
    type: "Fiend",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Pit Fiend",
    type: "Fiend",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Demon Lord",
    type: "Fiend",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Couatl",
    type: "Celestial",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Empyrean",
    type: "Celestial",
    class: "restricted",
    rarity: "None",
    title: null,
  },
  {
    name: "Storm Titan",
    type: "Elemental",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Cloud Titan",
    type: "Elemental",
    class: "spellcaster",
    rarity: "None",
    title: null,
  },
  {
    name: "Dragon",
    type: "Dragon",
    class: "restricted",
    rarity: "None",
    title: null,
  },
];
const HLM = highlevelMonsters;

const Safeareawords = ["safe haven", "Safe Haven", "commander", "Commander"];

const CampWords = [
  "Campfire",
  "Resting Spot",
  "Sleeping Quarters",
  "Bedroll",
  "Supply Cache",
  "Abandoned Camp",
  "Tent Circle",
  "Cookfire",
  "-Camp Area-",
];

const DungeonRoomWords = [
  "Chamber",
  "Cell",
  "Guard Room",
  "Ritual Room",
  "Summoning Circle",
  "Prison Block",
  "Secret Room",
  "Treasure Room",
  "Shrine",
  "Sanctum",
  "Vault",
  "Crypt",
  "Ossuary",
  "Altar Room",
  "-Dungeon Room-",
];

const HallwayWords = [
  "Corridor",
  "Passage",
  "Tunnel",
  "Crawlspace",
  "Trap Corridor",
  "Narrow Hallway",
  "Hidden Passage",
  "Staircase",
  "Spiral Stairs",
  "-Hallway-",
];

const CheckStrength = [
  "Lifting",
  "Pushing",
  "Pull",
  "Dragging",
  "Breaking",
  "Climbing",
  "Forcing",
  "Grappling",
  "Shoving",
  "Swinging",
  "Smashing",
  "Tugging",
  "Heaving",
  "Hoisting",
  "Carrying",
  "Holding",
  "Bracing",
  "Throwing",
  "Kicking",
  "Bending",
  "Tackling",
  "Prying",
  "Lunging",
  "Charging",
];

// === CLEANUP ===
function cleanupMonsters() {
  state.MS.deadMonsters = (state.MS.deadMonsters || []).filter(
    (m) => m && m.isDead,
  );
  if (state.MS.activeMonsters.length === 0) {
    //console.log("All monsters defeated, cleaning up state.");
  }
}

const recentRaw = splatContext(text).RS;
const lowerRecent = recentRaw.toLowerCase();

if (!state.MS) {
  state.MS = {
    level: 1,
    damage: { weak: 5, normal: 15, strong: 25 },
    damageMax: { weak: 10, normal: 20, strong: 30 },
    health: 50,
    maxHealth: 50,
    mana: 50,
    maxMana: 50,
    vision: 25,
    activeMonsters: [],
    deadMonsters: [],
    turnDelay: 5,
    maxMonsters: 5,
    lastTarget: null,
    skills: [],
    equipped: {
      mainhand: null,
      offhand: null,
    },
  };
}

if (!state.world || !state.world.LocalLocation) {
  ensureWorldState();
}

const KnownMonsters = [...LLM, ...MLM, ...HLM].map((m) => m.name);

function parseStory(text, type) {
  // First, extract the sections using splatContext
  const context = splatContext(text).RS; // splatContext expects raw AI output
  // Define regex patterns
  const patterns = {
    dialogue: /^>\s*You\s+say\s+"([^"]+)"/gm,
    action: /^>\s*(\w+)(?!\s+say)\s+"([^"]+)"/gm,
  };

  if (!patterns[type]) {
    throw new Error(
      `Invalid type "${type}". Valid types: dialogue, action, all`,
    );
  }

  const regex = patterns[type];
  const matches = [];
  let match;

  while ((match = regex.exec(context)) !== null) {
    if (type === "dialogue") {
      matches.push(match[1]);
    } else if (type === "action") {
      matches.push(match[2]);
    }
  }

  return matches;
}

// Shop Menu
function normalizeShopItemName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function shopMenu() {
  const shopItems = Array.isArray(state.shopItems) ? state.shopItems : [];
  state.shopOptions = shopItems;
  state.awaitingShopChoice = true;

  let menu = `[🛍️Safe Haven Shop\n`;
  shopItems.forEach((item) => {
    const price = item.price || 0;
    const desc = item.description ? ` - ${item.description}` : "";
    menu += `${item.name} [Price: ${price} gold]${desc}\n`;
  });
  menu += "Type the number or exact item name you want to buy.]";

  state.overwrite = true;
  state.output = menu.trimEnd();
}

function shop(text) {
  const player = state.PS.Name;
  const shopOptions = Array.isArray(state.shopOptions) ? state.shopOptions : [];

  // 1. Clean the input
  let trimmed = text.trim();
  trimmed = trimmed.replace(/^(>\s*)?(you\s+)?/i, "").trim();
  trimmed = trimmed.replace(/[.!?,;:]+$/, "").trim();

  // Handle cancel/empty input
  if (!trimmed || trimmed.toLowerCase() === "cancel") {
    state.awaitingShopChoice = false;
    state.shopOptions = [];
    if (trimmed.toLowerCase() === "cancel") {
      state.overwrite = true;
      state.logMessages["Output"].push("You step away from the shop.");
    }
    return text;
  }

  const desiredName = normalizeShopItemName(trimmed);
  console.log("🔍 Looking for:", desiredName);

  // 2. Lookup: exact match
  let offer = shopOptions.find(
    (item) => normalizeShopItemName(item.name) === desiredName,
  );

  // 3. Fallback: partial match
  if (!offer) {
    offer = shopOptions.find(
      (item) =>
        normalizeShopItemName(item.name).includes(desiredName) ||
        desiredName.includes(normalizeShopItemName(item.name)),
    );
  }

  // 4. Fallback: numeric index (1-based)
  if (!offer && /^\d+$/.test(trimmed)) {
    const index = parseInt(trimmed, 10) - 1;
    if (index >= 0 && index < shopOptions.length) {
      offer = shopOptions[index];
    }
  }

  console.log("✅ Found offer:", offer?.name || null);

  // ❌ Shop item not found
  if (!offer) {
    state.overwrite = true;
    state.logMessages["Output"].push(
      "That item is not sold here right now. Try the exact name or item number.",
    );
    state.awaitingShopChoice = false;
    state.shopOptions = [];
    return text;
  }

  const price = offer.price ?? 0;
  state.PS.gold = typeof state.PS.gold === "number" ? state.PS.gold : 0;

  //Validate funds BEFORE deducting
  if (state.PS.gold < price) {
    state.overwrite = true;
    state.logMessages["Output"].push(
      `🎒 ${player} does not have enough gold to buy ${offer.name}. It costs ${price}g, but you only have ${state.PS.gold}g.`,
    );
    state.awaitingShopChoice = false;
    state.shopOptions = [];
    return text; // Stop execution here
  }

  // ✅ Process purchase (only reached if funds are sufficient)
  state.PS.gold -= price; // Now safe from going negative
  const purchasedItem = JSON.parse(JSON.stringify(offer));
  state.PS.inventory.push(purchasedItem);

  state.logMessages["Output"].push(
    `[🎒 ${player} has purchased ${purchasedItem.name}]`,
  );
  state.logMessages["Input"].push(
    `${player} bought ${purchasedItem.name} for ${price}g then put it in their backpack.`,
  );

  state.awaitingShopChoice = false;
  state.shopOptions = [];
  state.overwrite = false;

  return text;
}

// ---------------- Monster Titles and Effects ----------------
/*const monsterTitles = {
    "1UP": { effect: (monster) => { monster.healOnLowHP = true; } },
    "Alchemist": { effect: (monster, target) => { monster.throwPotion = true; } },
    "Berserk": { effect: (monster) => { monster.berserk = true; } },
    "Blastoff": { effect: (monster, target) => { monster.canLaunchPlayer = true; } },
    "Bulwark": { effect: (monster) => { monster.damageResistance = 0.5; } },
    "Cloaking": { effect: (monster) => { monster.invisible = true; } },
    "Darkness": { effect: (monster, target) => { target.blind = true; } },
    "Ender": { effect: (monster, target) => { monster.teleports = true; } },
    "Exhaust": { effect: (monster, target) => { target.exhausted = true; } },
    "Fiery": { effect: (monster, target) => { target.onFire = true; } },
    "Ghastly": { effect: (monster, target) => { target.ghastFire = true; } },
    "Gravity": { effect: (monster, target) => { target.knockback = true; } },
    "Lifesteal": { effect: (monster) => { monster.lifesteal = true; } },
    "Ninja": { effect: (monster, target) => { monster.teleports = true; monster.resistanceAfterTeleport = 4; } },
    "Poisonous": { effect: (monster, target) => { target.poisoned = true; } },
    "Quicksand": { effect: (monster, target) => { target.slowness = true; } },
    "Regen": { effect: (monster) => { monster.regen = 2; } },
    "Rust": { effect: (monster, target) => { target.rust = true; } },
    "Sapper": { effect: (monster, target) => { target.hungry = true; } },
    "Sprint": { effect: (monster) => { monster.fast = true; } },
    "Sticky": { effect: (monster, target) => { target.canDropWeapon = true; } },
    "Storm": { effect: (monster, target) => { target.lightningStruck = true; } },
    "Twin": { effect: (monster) => { monster.canResurrect = true; } },
    "Undying": { effect: (monster) => { monster.respawnChance = true; } },
    "Vengeance": { effect: (monster, target) => { target.reflectDamage = true; } },
    "Weakness": { effect: (monster, target) => { target.weakened = true; } },
    "Webber": { effect: (monster, target) => { target.webbed = true; } },
    "Wither": { effect: (monster, target) => { target.withered = true; } }
};*/

// ---------------- Create Monster ----------------
const tierMultipliers = { weak: 0.3, normal: 0.5, strong: 0.9 };

const monsterTierMap = new Map([
  ...LLM.map((m) => [
    m.name.toLowerCase(),
    {
      ...m,
      tier: "weak",
      mult: tierMultipliers.weak,
      healthScale: 1,
    },
  ]),
  ...MLM.map((m) => [
    m.name.toLowerCase(),
    {
      ...m,
      tier: "normal",
      mult: tierMultipliers.normal,
      healthScale: 1.5,
    },
  ]),
  ...HLM.map((m) => [
    m.name.toLowerCase(),
    {
      ...m,
      tier: "strong",
      mult: tierMultipliers.strong,
      healthScale: 2,
    },
  ]),
]);

function createMonster(identifier) {
  let lastAction = splatContext(text).LA;
  if (lastAction !== "Defeated:") {
    if (!identifier || typeof identifier !== "string") return null;

    let library = LLM.concat(MLM, HLM);
    let libEntry = library.find(
      (m) => m.name.toLowerCase() === identifier.toLowerCase().trim(),
    );
    if (!libEntry) {
      //console.log(`[createMonster] Unknown monster: ${identifier}`);
      return null;
    }

    // Get tier data from the map
    const tierData = monsterTierMap.get(libEntry.name.toLowerCase()) || {
      tier: "normal",
      mult: tierMultipliers.normal,
      healthScale: 2,
    };

    const base = state.MS;
    const playerLevel = state.PS.level;

    // Assign class if "any"
    let mClass =
      libEntry.class === "any"
        ? classes[Math.floor(Math.random() * classes.length)]
        : libEntry.class;

    // Rarity
    let rarity =
      libEntry.rarity || rarities[Math.floor(Math.random() * rarities.length)];
    const rarityScale = {
      Common: 0.2,
      Magic: 0.4,
      Rare: 0.8,
      Mythic: 0.9,
      Legendary: 1.2,
    };

    // Build monster
    const levelMult = 1 + playerLevel * 0.05;
    const rMult = rarityScale[rarity] ?? 1;
    const tierMult = tierData.mult;
    const healthScale = tierData.healthScale;

    const monster = {
      name: libEntry.name || "None",
      count: 1,
      tier: tierData.tier,
      state: "Idle",
      class: mClass,
      rarity,
      skills: [],
      equipped: {
        mainhand: null,
        offhand: null,
        head: null,
        chest: null,
        legs: null,
        boots: null,
        back: null,
        ring1: null,
        ring2: null,
        necklace: null,
      },
      turnDelay: base.turnDelay ?? 5,
      attackDelay: base.turnDelay ?? 5,
      isDead: false,
      EXP_Value: Math.max(1, Math.round(100 * levelMult * rMult)),
      level: Math.max(1, Math.round(base.level * levelMult)),
      // Health now uses tier-specific mult and healthScale
      health: Math.max(
        1,
        Math.round(base.health * levelMult * rMult * tierMult * healthScale),
      ),
      maxHealth: Math.max(
        1,
        Math.round(base.maxHealth * levelMult * rMult * tierMult * healthScale),
      ),
      mana: Math.max(0, Math.round(base.mana * levelMult * rMult)),
      maxMana: Math.max(0, Math.round(base.maxMana * levelMult * rMult)),
      vision: base.vision ?? 10,
      enemyDefenses: {
        // Armor scales with levels and tier, defaulting to 20 base if undefined
        armor: Math.max(
          0,
          Math.round(
            (base.armor?.[tierData.tier] ?? 20) * levelMult * rMult * tierMult,
          ),
        ),
        // Magic Resist is capped at 95%, scaling with rarity
        magicRes: Math.min(
          95,
          Math.max(
            0,
            Math.round((base.magicRes?.[tierData.tier] ?? 5) * rMult),
          ),
        ),
        // Common monsters are slightly more vulnerable
        vulnerability: rarity === "Common" ? 0.1 : 0,
      },
    };

    // Damage (unchanged)
    const baseDamage = (base.damage && base.damage[monster.tier]) ?? 1;
    const baseDamageMax =
      (base.damageMax && base.damageMax[monster.tier]) ?? baseDamage + 5;
    monster.damage = Math.max(1, Math.round(baseDamage * levelMult * rMult));
    monster.damageMax = Math.max(
      monster.damage,
      Math.round(baseDamageMax * levelMult * rMult),
    );
    monster.baseDamage = monster.damage;
    // === DYNAMIC SPAWN DISTANCE ===
    // Spawn distance is now based on monster type, range, and tier.
    // Ranged monsters spawn farther away; melee monsters spawn closer.
    // Higher tier monsters spawn closer to increase threat.
    const isRanged = libEntry.range === "ranged";
    const baseSpawnDistance = isRanged ? 30 : 10; // Ranged: 60, Melee: 40
    const tierDistanceMod = { mythic: -15, legendary: -10, rare: -5, magic: 0, common: 5 };
    const tierMod = tierDistanceMod[tierData.tier?.toLowerCase()] ?? 0;
    const rarityDistanceMod = {
      Legendary: -5,
      Mythic: -3,
      Rare: 0,
      Magic: 5,
      Common: 10,
    };
    const rarityMod = rarityDistanceMod[rarity] ?? 0;
    monster.distance = Math.max(10, baseSpawnDistance + tierMod + rarityMod);
    // Speed scales with tier and rarity: higher tiers are faster
    const baseSpeed = Math.floor(Math.random() * 11) + 5; // 5-15
    const speedTierMult = {
      mythic: 1.5,
      legendary: 1.3,
      rare: 1.1,
      magic: 1.0,
      common: 1.0,
    };
    monster.speed = Math.floor(
      baseSpeed * (speedTierMult[tierData.tier?.toLowerCase()] ?? 1.0),
    );
    monster.baseRange = isRanged ? 40 : 5;
    monster.nearTarget = false;
    monster.spawnDistance = monster.distance; // Track original spawn distance for MS
    // Push into activeMonsters should not happen here; spawn handles insertion
    console.log(
      `[createMonster]Created:${monster.name}|Class: ${mClass}|Tier: ${tierData.tier}|Rarity:${rarity}|DMG:${monster.damage}-${monster.damageMax}|HP:${monster.maxHealth}|Armor:${monster.enemyDefenses.armor}|Magic Res:${monster.enemyDefenses.magicRes}|Vulnerability:${monster.enemyDefenses.vulnerability}`,
    );
    return monster;
  }
  return text;
}

// === Set base damage for a single monster based on its tier ===
function setBaseDamage(monster) {
  if (!monster) return;

  // Fallback to 'normal' if tier missing
  const tier = monster.tier || "normal";

  // Pull min/max from state.MS.damage objects
  const min = (state.MS.damage && state.MS.damage[tier]) ?? 1;
  const max = (state.MS.damageMax && state.MS.damageMax[tier]) ?? min + 5;

  // Pick random base damage in range
  monster.baseDamage = Math.floor(Math.random() * (max - min + 1)) + min;

  // Current pack damage initially same as base
  monster.damage = monster.baseDamage;

  // Ensure damageMax ≥ damage
  monster.damageMax = Math.max(monster.damage, max);
}

// === Rescale damage for packs based on count ===
function rescalePackDamage(monster) {
  if (!monster) return;

  const count = Math.max(1, monster.count); // avoid division by 0
  const minPer = state.MS.packMinDamage ?? 1;

  // Scale down damage by pack size, but never below minPer
  monster.damage = Math.max(minPer, Math.floor(monster.baseDamage / count));

  // Keep damageMax ≥ damage
  monster.damageMax = Math.max(
    monster.damage,
    monster.damageMax ?? monster.damage + 5,
  );
}

//log(storyCards)
function printMonsterStats() {
  const alive = state.MS.activeMonsters.filter((m) => m && m.health > 0);
  //console.log(alive)
  const stats = alive
    .map(
      (m) =>
        `[${m.name}:${m.state}|${m.count}x|HP:${m.health}/${m.maxHealth}|Rarity:${m.rarity}|Lvl:${m.level}]`,
    )
    .join("\n");

  state.logMessages["Output"].push(stats);
  //console.log(Monster, "Monst all stats")
}

function Authornote() {
  /*text = `
Plot Essentials: ${state.memory.context = state.memory.context + ' ' + info.actionCount}
  
Author's Note: ${state.memory.authorsNote = state.memory.authorsNote + ' ' + info.actionCount}
  `
  return {text}*/
}

// ---- Damage model ----------------------------------------------------------
// Damage is computed here, never parsed out of text. The tables below are the
// only things you edit to extend it: add a damage type to DAMAGE_STATS, a class
// to CLASS_DAMAGE_PROFILE, or a bucket to DAMAGE_MITIGATION.

// Which stats feed which bucket. Add a new damage type by adding it here.
const DAMAGE_STATS = {
  base: ["base damage"],
  physical: ["physical damage", "bleed damage"],
  magic: [
    "spell damage",
    "fire damage",
    "frost damage",
    "lightning damage",
    "nature damage",
    "chaos damage",
    "void damage",
    "holy damage",
  ],
  status: ["status damage"], // defined for future use; no class deals in it yet
};

// Which buckets a class actually deals in. Add a class by adding one line.
const CLASS_DAMAGE_PROFILE = {
  knight: ["physical"],
  barbarian: ["physical"],
  rogue: ["physical"],
  revanant: ["physical"],
  wizard: ["magic"],
  druid: ["magic"],
  cleric: ["magic"],
  battlemage: ["magic"],
  necromancer: ["magic"],
  default: ["physical", "magic"],
};

// Per-bucket mitigation, keyed by bucket so a new bucket brings its own rule.
const DAMAGE_MITIGATION = {
  physical: (d) => 1 - (d.armor || 0) / ((d.armor || 0) + 400),
  magic: (d) => 1 - Math.min(95, d.magicRes || 0) / 100,
};

// Only real, positive numbers count toward a bucket. A negative modifier (the
// Weaken curse authors damage: -5) contributes 0 instead of subtracting.
function sumPositiveStats(effective, statNames) {
  let total = 0;
  for (const name of statNames) {
    const v = Number(effective[name]);
    if (Number.isFinite(v) && v > 0) total += v;
  }
  return total;
}

function applyVulnerability(total, enemyDefenses) {
  return enemyDefenses.vulnerability
    ? total * (1 + enemyDefenses.vulnerability)
    : total;
}

function applyCrit(total, effective) {
  const critChance = sumPositiveStats(effective, ["crit chance"]);
  const critBonus = (Number(effective["crit damage"]) || 50) / 100;
  return Math.random() * 100 < critChance ? total * (1 + critBonus) : total;
}

function getPlayerDamage(
  enemyDefenses = { armor: 0, magicRes: 0, vulnerability: 0 },
) {
  if (!state.PS) return 0;

  const effective = calculateEffectiveStats();
  const className = (state.PS.Class || "").toLowerCase().trim();
  const buckets =
    CLASS_DAMAGE_PROFILE[className] || CLASS_DAMAGE_PROFILE.default;

  // Base damage ignores mitigation; every other bucket takes its own.
  let totalDamage = sumPositiveStats(effective, DAMAGE_STATS.base);
  for (const bucket of buckets) {
    totalDamage +=
      sumPositiveStats(effective, DAMAGE_STATS[bucket]) *
      DAMAGE_MITIGATION[bucket](enemyDefenses);
  }

  totalDamage = applyVulnerability(totalDamage, enemyDefenses);
  totalDamage = applyCrit(totalDamage, effective);

  return Math.max(0, Math.round(totalDamage));
}

// damage calculation test
function PlayerDamagetest() {
  console.log(`--- Testing Damage Engine ---`);
  console.log(`Player Class: ${state.PS.Class}`);

  // 1. Check Effective Stats Output
  const stats = calculateEffectiveStats();
  console.log("Effective Base Damage:", stats["base damage"]);
  console.log("Effective Physical Dmg:", stats["physical damage"]);

  // 2. Roll Damage 5 times
  console.log("\nRolling Damage 5 times...");
  for (let i = 1; i <= 5; i++) {
    const dmg = getPlayerDamage();
    console.log(`Strike ${i}: ${dmg} Output Damage`);
  }
}

// ---- Range / reach ----------------------------------------------------------
// Range gates WHO you can hit. Ranged attacks (bows, bolts, spells like fireball)
// reach any monster at any distance. Melee attacks require the target to be in
// reach; monsters spawn at range ("ranged"), so a melee swing first closes the
// distance and connects next turn. Monsters advance to "melee" when they act.

// Words in the player's text that imply a ranged strike (used for basic attacks).
const rangedAttackWords = [
  "fire a bolt",
  "bolt",
  "arrow",
  "shoot",
  "blast",
  "ranged",
  "from afar",
  "from a distance",
];

// Decide the range of a basic (weapon) attack: an equipped weapon's own range
// wins; otherwise infer from the wording; default to melee.
function getAttackRange(attackText, equipped) {
  const weapon =
    equipped && (equipped.weapon || equipped.mainhand || equipped.righthand);
  if (weapon && typeof weapon.range === "string")
    return weapon.range.toLowerCase();
  if (weapon && weapon.ranged === true) return "ranged";
  const t = (attackText || "").toLowerCase();
  if (rangedAttackWords.some((w) => t.includes(w))) return "ranged";
  return "melee";
}

// === PLAYER MOVEMENT SPEED SCALING ===
// Speed scales from 10 (base) to 30 (max) based on level and dexterity.
// Formula: baseSpeed + (level * 0.5) + (dexterity * 0.8) + equipment bonuses
// Caps at 30 for balance.
function calculatePlayerSpeed() {
  if (!state.PS) return 10;

  const baseSpeed = 10;
  const levelBonus = (state.PS.level || 1) * 0.5;
  const dexBonus = (state.PS.dexterity || 5) * 0.8;

  // Equipment speed bonuses (from boots, enchantments, etc.)
  let equipmentBonus = 0;
  if (state.PS.equipped?.boots) {
    const boots = state.PS.equipped.boots;
    equipmentBonus += boots.speedBonus || 0;
  }
  if (state.PS.equipped?.back) {
    const back = state.PS.equipped.back;
    equipmentBonus += back.speedBonus || 0;
  }

  // Calculate total speed with cap
  const totalSpeed = baseSpeed + levelBonus + dexBonus + equipmentBonus;
  const cappedSpeed = Math.min(30, Math.max(10, Math.round(totalSpeed)));

  // Cache the result on state.PS for easy access
  state.PS.speed = cappedSpeed;
  return cappedSpeed;
}

// Helper to get current player movement speed (uses cached value or recalculates)
function getPlayerSpeed() {
  if (!state.PS) return 10;
  if (state.PS.speed && state.PS.speed > 0) return state.PS.speed;
  return calculatePlayerSpeed();
}

// Helper to get monster movement speed
function getMonsterSpeed(monster) {
  if (!monster) return 10;
  return monster.speed || 10;
}

// Update player speed after stat changes (level up, equipment change, etc.)
function updatePlayerSpeed() {
  if (!state.PS) return;
  calculatePlayerSpeed();
}

// Can `range` reach `target` right now? Ranged always can. Melee needs the target
// === MOVEMENT SPEED SCALING SYSTEM ===
// Player speed: 10-30 based on level (×0.5) + dexterity (×0.8) + equipment
// Monster speed: 5-22 based on base roll (5-15) × tier multiplier (1.0-1.5)
// Distance tracking: numeric values, updated via SpatialManager.updateDistance()
const SpatialManager = {
  classifyRange(distance) {
    return distance < 30 ? "melee" : "ranged";
  },
  calculateReach(attacker, target) {
    if (!attacker || attacker.distance === undefined) return false;
    return attacker.distance <= (attacker.baseRange || 5);
  },
  updateProximity(attacker, target) {
    if (!attacker || !target) return;
    const isNear = SpatialManager.calculateReach(attacker, target);
    if (attacker === state.PS) {
      state.PS.nearTarget = isNear;
    } else if (attacker.nearTarget !== undefined) {
      attacker.nearTarget = isNear;
    }
  },
  updateDistance(entity, delta) {
    if (!entity) return;
    entity.distance = Math.max(0, (entity.distance || 0) + delta);
  },
};

function processEntityMovement(entity, targetDistance = 0) {
  if (!entity) return;
  if (entity.state === "Approaching") {
    SpatialManager.updateDistance(entity, -entity.speed);
    if (entity.distance <= (entity.baseRange || 5)) {
      entity.state = "Fighting";
    }
  }
  // Synchronize proximity flag after movement
  const target = entity === state.PS ? state.MS?.activeMonsters?.[0] : state.PS;
  if (target) {
    SpatialManager.updateProximity(entity, target);
  }
}

// in reach; if not, the attacker closes the gap this turn (canHit=false) and is in
// reach from then on. Returns { canHit, note }.
function resolveReach(target, range) {
  if (!target) return { canHit: false, note: "" };
  if ((range || "melee").toLowerCase() === "ranged")
    return { canHit: true, note: "" };

  // New proximity-based check
  const attacker =
    target === state.PS ? state.MS?.activeMonsters?.[0] : state.PS;
  const isNear =
    (attacker && attacker.nearTarget) ||
    (target === state.PS && state.PS.nearTarget);

  if (isNear) return { canHit: true, note: "" };

  // Legacy charge mechanic: close distance for next turn
  if (target.distance !== "melee") {
    target.distance = "melee";
  }

  return {
    canHit: false,
    note: `${target.name} is out of melee range — you close the distance, weapon ready.`,
  };
}

function playerAttack() {
  if (state.PS.Name !== undefined) {
    const PlayerName = state.PS.Name;
    state.MS.activeMonsters = state.MS.activeMonsters || [];

    if (!state.MS.activeMonsters.length) {
      console.log("No active monsters.");
      return text;
    }

    // In combat, any non-command input is an attack attempt
    const attacking = playerattackWords.some((word) =>
      text.includes(word.toLowerCase()),
    );
    const inCombat = state.PS.combatstatus === "In Combat";
    const isCommand = text.trim().startsWith("/");

    if (!attacking && !inCombat) {
      console.log("No attack detected in text and not in combat.");
      return text;
    }

    if (!attacking && isCommand) {
      return text;
    }

    // 1️⃣ Find the target monster OBJECT (not just name)
    let target = null;

    // Try to parse target name from text (simplified example)
    const mentionedName = parseMonsterNameFromText(
      text,
      state.MS.activeMonsters,
    );

    if (mentionedName) {
      target = state.MS.activeMonsters.find(
        (m) => m.name.toLowerCase() === mentionedName.toLowerCase(),
      );
    }

    // Fallback to last targeted monster
    if (!target && state.MS.lastTarget) {
      target = state.MS.activeMonsters.find(
        (m) => m.name.toLowerCase() === state.MS.lastTarget.toLowerCase(),
      );
    }

    // Default to first monster if still no target
    if (!target && state.MS.activeMonsters.length > 0) {
      target = state.MS.activeMonsters[0];
    }

    if (!target) {
      state.logMessages["Output"].push("[No valid target found.]");
      return;
    }

    // A live monster you are attacking means you are in combat. This used to
    // be gated on playerloc !== "safe area", but playerloc defaults to
    // "safe area", so fresh players never got a monster response. Monsters
    // only exist in the labyrinth, so a present target is the reliable signal.
    const inTown =
      state.PS.location === "safe haven" &&
      state.MS.activeMonsters.length === 0;

    if (!inTown && state.PS.combatstatus !== "In Combat") {
      state.PS.combatstatus = "In Combat";
      state.logMessages["Output"].push(`[Combat Started]`);
    }

    state.MS.lastTarget = target.name; // Store name, not object

    // === RANGE / REACH ===
    // Use numeric distance: if distance > player's baseRange, close the gap.
    const attackRange = getAttackRange(text, state.PS.equipped);
    const playerBaseRange = attackRange === "ranged" ? 40 : 5;
    const playerSpeed = getPlayerSpeed(); // Get scaled movement speed (10-30)

    let targetDefeated = false;

    if (target.distance > playerBaseRange) {
      // Player closes the distance using their movement speed
      const oldDistance = target.distance;
      SpatialManager.updateDistance(target, -playerSpeed);
      SpatialManager.updateProximity(state.PS, target);
      console.log(`Closing distance: ${oldDistance} -> ${target.distance} (speed: ${playerSpeed}, range needed: ${playerBaseRange}, nearTarget: ${state.PS.nearTarget})`);
      state.logMessages["Output"].push(`[${PlayerName} closes the distance to ${target.name}.]`);
      return text; // Skip damage phase this turn
    } else {
      const dmg = getPlayerDamage();
      target.state = "Attacking";

      SpatialManager.updateProximity(state.PS, target);

      target.health -= dmg;
      if (target.health < 0) target.health = 0;

      state.logMessages["Output"].push(
        `[${PlayerName}|Hit:${target.name}|Damage:${dmg}]`,
      );

      // Basic attacks carry the player's chosen elemental aspect.
      if (target.health > 0 && state.PS.Element) {
        rollStatusEffect(target, state.PS.Element, dmg);
      }

      // === MONSTER DEFEATED ===
      if (target.health <= 0) {
        console.log(`${target.name} defeated`);

        if (target.count > 1) {
          const deadOne = { ...target, count: 1, health: 0, isDead: true };
          state.MS.deadMonsters.push(deadOne);
          target.count--;
          target.health = target.maxHealth;
          rescalePackDamage(target);
          state.logMessages["Output"].push(
            `[One ${target.name} dies. ${target.count} remain.]`,
          );
          onMonsterDefeated(deadOne);
        } else {
          const defeatedSnapshot = { ...target };
          target.isDead = true;
          targetDefeated = true;
          state.MS.deadMonsters.push(target);
          // ✅ Properly remove from array
          state.MS.activeMonsters = state.MS.activeMonsters.filter(
            (m) => m !== target,
          );
          state.logMessages["Input"].push(
            `\n${PlayerName}|Defeated:${target.name}`,
          );
          state.logMessages["Output"].push(
            `(${PlayerName}|Defeated:${target.name})`,
          );
          onMonsterDefeated(defeatedSnapshot);

          if (state.MS.activeMonsters.length === 0) {
            state.PS.combatstatus = "Not in Combat";
          }
        }
      }

      // === MONSTER STILL ALIVE === (only if this target survived the blow)
      if (!targetDefeated && target.health > 0) {
        const lines = [
          `${target.name} is still alive and snarling with rage!`,
          `${target.name} shrugs off the blow and glares at you!`,
          `${target.name} roars defiantly, barely scratched!`,
          `${target.name} laughs off your attack!`,
          `${target.name} stands strong, ready to strike back!`,
          `${target.name} is still alive, but badly hurt!`,
          `${target.name} staggers, blood pouring from its wounds!`,
          `${target.name} growls through clenched teeth, weakened but fighting!`,
          `${target.name} is breathing heavily, clearly in pain!`,
          `${target.name} clutches its wound but refuses to fall!`,
        ];
        state.logMessages["Input"].push(
          `\n${lines[Math.floor(Math.random() * lines.length)]}`,
        );
      }
    }

    // === COUNTER-ATTACK ===
    // Monsters retaliate whenever the fight is on and something is left alive
    // to strike back — regardless of your attack's range. A monster that
    // retaliates has closed to melee range.
    if (
      state.PS.combatstatus === "In Combat" &&
      !inTown &&
      state.MS.activeMonsters.length > 0
    ) {
      const attacker =
        state.MS.activeMonsters.find((m) => m.name === target.name) ||
        state.MS.activeMonsters[0];
      // Monster closes to melee range if not already there
      if (attacker && attacker.distance > 5) {
        const monsterSpeed = getMonsterSpeed(attacker);
        SpatialManager.updateDistance(attacker, -monsterSpeed);
        state.logMessages["Output"].push(
          `[${attacker.name} closes the distance to you.]`,
        );
      }
      const damage = Math.floor(Math.random() * 8) + 3;
      let remainingDamage = damage;

      if (state.PS.barrier && state.PS.barrier > 0) {
        const absorbed = Math.min(state.PS.barrier, remainingDamage);
        updateStat("barrier", -absorbed);
        remainingDamage -= absorbed;
        state.logMessages["Input"].push(
          `\nYour barrier absorbed ${absorbed} damage. Barrier now: ${state.PS.barrier}.`,
        );
        state.logMessages["Output"].push(
          `Your barrier absorbed ${absorbed} damage. Barrier now: ${state.PS.barrier}.`,
        );
      }

      if (remainingDamage > 0) {
        updateStat("health", -remainingDamage);
        state.logMessages["Output"].push(
          `[Taken ${remainingDamage} damage. Your health is now ${state.PS.health}.] GameMessage`,
        );
      } else {
        state.logMessages["Input"].push(
          `No damage taken — your barrier held strong!`,
        );
        state.logMessages["Output"].push(
          "No damage taken — your barrier held strong!",
        );
      }
    }

    console.log(state.logMessages["Input"], "Input text added!");
    return;
  }
}

// Helper: extract monster name from player text (basic implementation)
function parseMonsterNameFromText(inputText, monsters) {
  for (const monster of monsters) {
    if (inputText.toLowerCase().includes(monster.name.toLowerCase())) {
      return monster.name;
    }
  }
  return null;
}

function winHook(defeatedMonster) {
  const nameKey =
    defeatedMonster && typeof defeatedMonster.name === "string"
      ? defeatedMonster.name.toLowerCase().trim()
      : "";
  const monsterData = nameKey ? monsterTierMap.get(nameKey) : null;
  alreadyWon = true;
  const level = state.PS?.level || 1;
  const baseXP = Math.floor(Math.random() * 20) + 10;
  const tierKey = monsterData && monsterData.tier ? monsterData.tier : null;
  const tierXPBoost =
    tierKey && tierMultipliers[tierKey] != null ? tierMultipliers[tierKey] : 1;
  const scaledXP = Math.floor(baseXP * (1 + level * 0.25) * tierXPBoost);

  gainXP(scaledXP);
  WorldLootPlayer("", { isBoss: false });
  if (!state.MS.activeMonsters || state.MS.activeMonsters.length === 0) {
    state.PS.combatstatus = "Not in Combat";
  }
}

function onMonsterDefeated(defeatedSnapshot) {
  if (!defeatedSnapshot || !defeatedSnapshot.name) return;
  grantMonsterCore(defeatedSnapshot);
  recordCorpse(defeatedSnapshot);
  winHook(defeatedSnapshot);
}

// ---- ALLY SYSTEM ----
// Corpses "raise thrall" can draw on. This cannot read state.MS.deadMonsters:
// that array is unconditionally emptied by a top-level statement every time the
// Library is loaded, so it never survives a turn. Bounded so a long dungeon run
// does not grow state without limit.
const MAX_CORPSES = 5;
function recordCorpse(monster) {
  if (!state.MS) return;
  if (!Array.isArray(state.MS.corpses)) state.MS.corpses = [];
  state.MS.corpses.push({
    name: monster.name,
    level: monster.level,
    maxHealth: monster.maxHealth,
    damage: monster.damage,
    damageMax: monster.damageMax,
  });
  while (state.MS.corpses.length > MAX_CORPSES) state.MS.corpses.shift();
}

// ---- CARRYING CAPACITY / BIOMASS SYSTEM ----
const CARRYING_CAPACITY_CONFIG = {
  costPerSpawn: 10,
  regenPerTurn: 5,
  capacity: 100,
  modifierCostMult: {
    leader: 1.2,
    elite: 1.3,
    wounded: 0.8,
    injured: 0.85,
    weak: 0.9,
    starving: 0.8,
    angry: 1.1,
    enraged: 1.3,
    frenzied: 1.3,
    berserk: 1.5,
    huge: 1.6,
    giant: 2.0,
  },
};

function ensureWorldState() {
  if (!state.world) {
    state.world = {
      LocalLocation: {},
      time: {
        turn: 0,
        day: 1,
        hour: 6,
        minute: 0,
        cyclePhase: "dawn",
        lightLevel: 1.0,
      },
      weather: {
        current: "clear",
        intensity: 0,
        visibilityModifier: 1.0,
        temperature: "mild",
      },
      worldRegistry: { modifiedLocations: {}, activeWorldEvents: [] },
      dungeon: {
        levels: {},
        currentLevel: null,
        activeMap: null,
        grid: null,
        rows: 8,
        cols: 5,
        floor: 1,
        playerPosition: { row: 1, col: "A" },
        generatedAt: 0,
        currentLevelName: null,
        dugfloor: 1,
      },
    };
  }
  if (!state.world.LocalLocation) state.world.LocalLocation = {};
  if (!state.world.dungeon) {
    state.world.dungeon = {
      levels: {},
      currentLevel: null,
      activeMap: null,
      grid: null,
      rows: 8,
      cols: 5,
      floor: 1,
      playerPosition: { row: 1, col: "A" },
      generatedAt: 0,
      currentLevelName: null,
      dugfloor: 1,
    };
  }
  if (!state.world.time) {
    state.world.time = {
      turn: 0,
      day: 1,
      hour: 6,
      minute: 0,
      cyclePhase: "dawn",
      lightLevel: 1.0,
    };
  }
  if (!state.world.weather) {
    state.world.weather = {
      current: "clear",
      intensity: 0,
      visibilityModifier: 1.0,
      temperature: "mild",
    };
  }
  if (!state.world.worldRegistry) {
    state.world.worldRegistry = {
      modifiedLocations: {},
      activeWorldEvents: [],
    };
  } else {
    if (!state.world.worldRegistry.modifiedLocations)
      state.world.worldRegistry.modifiedLocations = {};
    if (!Array.isArray(state.world.worldRegistry.activeWorldEvents))
      state.world.worldRegistry.activeWorldEvents = [];
  }
}

function getCurrentLocationKey() {
  const playerloc =
    state.PS && state.PS.playerloc ? state.PS.playerloc : "safe area";
  return playerloc.toLowerCase().replace(/\s+/g, "");
}

function getLocationEntry(key) {
  ensureWorldState();
  if (!key) return null;
  if (!state.world.LocalLocation[key]) {
    state.world.LocalLocation[key] = {
      biomass: 0,
      lastRegenTurn: 0,
      famine: false,
      spawnedSinceFamine: 0,
    };
  }
  return state.world.LocalLocation[key];
}

function getRichLocation() {
  ensureWorldState();
  const key = getCurrentLocationKey();
  const entry = getLocationEntry(key);
  if (!entry) return null;
  if (!entry.id) {
    entry.id = key;
    entry.playerloc = state.PS && state.PS.playerloc ? state.PS.playerloc : key;
    entry.zoneType = entry.zoneType || "unknown";
    entry.displayName =
      entry.displayName || (state.PS && state.PS.playerloc) || key;
    entry.subArea = entry.subArea || "";
    entry.exits = entry.exits || {};
    entry.interactions = entry.interactions || [];
    entry.entities = entry.entities || [];
    entry.flags = entry.flags || {};
  }
  return entry;
}

const CYCLE_PHASE_BASELINES = { dawn: 0.6, day: 1.0, dusk: 0.45, night: 0.1 };

function advanceTime() {
  ensureWorldState();
  const t = state.world.time;
  const w = state.world.weather;
  t.turn = (Number(t.turn) || 0) + 1;
  t.minute = (Number(t.minute) || 0) + 10;
  while (t.minute >= 60) {
    t.minute -= 60;
    t.hour = (Number(t.hour) || 0) + 1;
  }
  while (t.hour >= 24) {
    t.hour -= 24;
    t.day = (Number(t.day) || 1) + 1;
  }
  const h = Number(t.hour) || 0;
  let phase;
  if (h < 6) phase = "night";
  else if (h < 9) phase = "dawn";
  else if (h < 18) phase = "day";
  else if (h < 21) phase = "dusk";
  else phase = "night";
  t.cyclePhase = phase;
  const baseline =
    CYCLE_PHASE_BASELINES[phase] !== undefined
      ? CYCLE_PHASE_BASELINES[phase]
      : 1.0;
  const intensity = Math.max(0, Math.min(1, Number(w && w.intensity) || 0));
  const raw = baseline - intensity * 0.3;
  t.lightLevel = Math.max(0, Math.min(1, raw));
}

function summariseWorldRegistry(maxChars) {
  ensureWorldState();
  const reg = state.world.worldRegistry || {
    modifiedLocations: {},
    activeWorldEvents: [],
  };
  const mods = reg.modifiedLocations || {};
  let locCount = 0;
  let doorCount = 0;
  let lootedCount = 0;
  for (const locId in mods) {
    if (!mods[locId]) continue;
    locCount += 1;
    doorCount += Array.isArray(mods[locId].unlockedDoors)
      ? mods[locId].unlockedDoors.length
      : 0;
    lootedCount += Array.isArray(mods[locId].lootedInteractions)
      ? mods[locId].lootedInteractions.length
      : 0;
  }
  const events = (reg.activeWorldEvents || [])
    .slice(0, 5)
    .map((e) =>
      String(e || "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .slice(0, 30),
    )
    .filter(Boolean);
  let summary = `- Locations modified: ${locCount}\n- Doors unlocked: ${doorCount}\n- Interactions looted: ${lootedCount}`;
  if (events.length > 0) {
    summary += `\n- Active events: ${events.join(", ")}`;
  }
  return summary.slice(0, maxChars || 400);
}

function computeSpawnCost(count, modifiers) {
  const cfg = CARRYING_CAPACITY_CONFIG;
  const base = cfg.costPerSpawn * Math.max(1, count || 1);
  if (!modifiers || !modifiers.desc) return base;
  const descs = String(modifiers.desc)
    .toLowerCase()
    .split(/\s+and\s+/);
  let mult = 1;
  for (const d of descs) {
    const m = cfg.modifierCostMult[d.trim()];
    if (m) mult *= m;
  }
  return Math.max(1, Math.round(base * mult));
}

function consumeLocationBiomass(name, cost) {
  const key = getCurrentLocationKey();
  const entry = getLocationEntry(key);
  if (!entry) return { ok: false, reason: "no-location" };
  if (entry.famine) return { ok: false, reason: "famine" };
  const capacity = CARRYING_CAPACITY_CONFIG.capacity;
  if (entry.biomass + cost > capacity)
    return { ok: false, reason: "over-capacity" };
  entry.biomass += cost;
  if (entry.biomass >= capacity && !entry.famine) {
    entry.famine = true;
    entry.spawnedSinceFamine = Number.MAX_SAFE_INTEGER;
  }
  return { ok: true, entry };
}

function tickLocationRegen() {
  ensureWorldState();
  const cfg = CARRYING_CAPACITY_CONFIG;
  for (const key in state.world.LocalLocation) {
    const entry = state.world.LocalLocation[key];
    if (!entry) continue;
    if (entry.biomass > 0) {
      entry.biomass = Math.max(0, entry.biomass - cfg.regenPerTurn);
    }
    if (entry.famine && entry.biomass <= 0) {
      entry.famine = false;
      entry.spawnedSinceFamine = 0;
    }
  }
}

function spawn(name, count = 1, modifiers = {}) {
  if (!name) return;
  name = name.toLowerCase();

  if (!state.MS.spawnCooldowns) state.MS.spawnCooldowns = {};

  // Check if this monster was just slain this turn (prevent immediate respawn)
  if (state.processedMonsterDeaths && state.processedMonsterDeaths.has(name)) {
    console.log(`⏳ ${name} was just slain. Cannot respawn this turn.`);
    return { text };
  }

  // ⏳ Cooldown check
  if (state.MS.spawnCooldowns[name] > 0) {
    console.log(
      `⏳ Cannot spawn ${name} - ${state.MS.spawnCooldowns[name]} turn(s) remaining.`,
    );
    state.logMessages["Input"].push(`No monsters in the area`);
    return;
  }

  const cost = computeSpawnCost(count, modifiers);
  const charge = consumeLocationBiomass(name, cost);
  if (!charge.ok && charge.reason === "famine") {
    const key = getCurrentLocationKey();
    const entry = state.world.LocalLocation[key];
    if (entry && entry.spawnedSinceFamine === Number.MAX_SAFE_INTEGER) {
      state.logMessages["Input"].push(
        `The ${key.replace(/([A-Z])/g, " $1").trim()} has been picked clean — no monsters can be found here for now.`,
      );
      entry.spawnedSinceFamine = 1;
    }
    console.log(`🌿 ${name} blocked — famine at ${getCurrentLocationKey()}.`);
    return;
  }
  if (!charge.ok && charge.reason === "over-capacity") {
    console.log(`🌿 ${name} blocked — biomass would exceed capacity.`);
    return;
  }
  if (charge.ok && charge.entry) {
    if (charge.entry.spawnedSinceFamine !== Number.MAX_SAFE_INTEGER) {
      charge.entry.spawnedSinceFamine += 1;
    }
  }

  // Cap total monsters
  if (state.MS.activeMonsters.length >= state.MS.maxMonsters) {
    console.log(`⚠️ Max monster types reached (${state.MS.maxMonsters}).`);
    return;
  }

  const MAX_PACK = 5;

  // Try to find existing pack
  let pack = state.MS.activeMonsters.find((p) => p.name.toLowerCase() === name);

  if (!pack) {
    // Create a new pack
    const newMonster = createMonster(name);
    if (!newMonster) return text;

    newMonster.count = Math.min(count, MAX_PACK);

    if (count > MAX_PACK) {
      console.log(`⚠️ Pack size capped at ${MAX_PACK} for ${newMonster.name}.`);
    }

    setBaseDamage(newMonster);
    rescalePackDamage(newMonster);

    state.MS.activeMonsters.push(newMonster);

    console.log(
      `🟢 Spawned UNIQUE monster: ${newMonster.name} x${newMonster.count}|DMG:${newMonster.damage}-${newMonster.damageMax}`,
    );
    state.logMessages["Input"].push(
      `You have spotted a ${newMonster.name} in the area! There is ${newMonster.count} of them`,
    );
  }
  return text;
}

function tickMonsterCooldowns() {
  if (!state.MS.spawnCooldowns) return;

  for (const name in state.MS.spawnCooldowns) {
    let cd = state.MS.spawnCooldowns[name];

    // Skip monsters that have no cooldown or are already 0
    if (cd <= 0) continue;

    // Reduce cooldown
    state.MS.spawnCooldowns[name] = cd - 1;

    // If it hits 0, announce cooldown completion
    if (state.MS.spawnCooldowns[name] === 0) {
      console.log(`✔️ ${name} is ready to spawn again.`);
    }
  }
}

// ---------------- Monster Attacks ----------------
function startMonsterAttacks() {
  let library = LLM.concat(MLM, HLM);
  let libEntry = library.find((m) => m.name.toLowerCase().trim());
  const monsterName = monsterTierMap.get(libEntry.name.toLowerCase());
  const Player = state.PS;
  const monster = state.MS.activeMonsters.filter((m) => m.name !== monsterName);
  // Default monster to physical damage
  const dmgType = PTD.find((type) => type.name === "*physical") || PTD[0];
  const dmg =
    Math.floor(Math.random() * (monster.damageMax - monster.damage + 1)) +
    monster.damage;
  let alreadyWon = false;
  let alreadyStarted = false;
  let combatStatus = state.PS.combatStatus;
  let playerloc = state.PS.playerloc;

  if (Player.Name && Player.combatStatus === "In Combat") {
    if (!monster || monster.isDead) return;
    if (!state.MS.activeMonsters || !state.MS.activeMonsters.includes(monster))
      return;
    if (!state.MS.monsterAttacksEnabled) return;

    // Default state if none exists
    if (!monster.state) monster.state = "Idle";

    // --- STOP CONDITIONS ---
    if (
      monster.isDead ||
      !state.MS.activeMonsters.includes(monster) ||
      !state.MS.monsterAttacksEnabled
    ) {
    }

    // Future: monster.class/type/title conditions here
    /*
        if (monster.class === "fire elemental") {
            dmgType = PTD.find(t => t.name === "*fire");
        } else if (monster.type === "spider") {
            dmgType = PTD.find(t => t.name === "*poison");
        }
        */

    if (
      !alreadyWon &&
      !alreadyStarted &&
      combatStatus !== "In Combat" &&
      playerloc !== "safe area"
    ) {
      combatstatus = "In Combat";
      state.logMessages["Output"].push(`-Combat Started-`);
      alreadyStarted = true;
    }

    if (combatStatus === "In Combat" && playerloc !== "safe area") {
      let remainingDamage = dmg;

      if (state.PS.barrier && state.PS.barrier > 0) {
        const absorbed = Math.min(state.PS.barrier, remainingDamage);
        updateStat("barrier", -absorbed);
        remainingDamage -= absorbed;
        state.logMessages["Output"].push(
          `Your barrier absorbed ${absorbed} damage barrier now ${state.PS.barrier}.`,
        );
      }

      if (remainingDamage > 0) {
        updateStat("health", -remainingDamage);
        state.logMessages["Output"].push(
          `${PlayerName}|Taken:${dmgType.name}|${remainingDamage}damage!|Health:${state.PS.health}`,
        );
      } else {
        state.logMessages["Input"].push(
          "No damage taken, barrier held strong!",
        );
      }
    }
  }
}

// — Cleanup —
state.MS.deadMonsters = state.MS.deadMonsters.filter((m) => m && m.isDead);
// Fully clear if you want empty array after filter(Optinal)
state.MS.deadMonsters = [];

const activeList =
  (state.MS.activeMonsters || [])
    .map((m) => `${m.name}x${m.count}`)
    .join(", ") || "none";
//console.log(`Active:${activeList}|Dead:${state.MS.deadMonsters.length}`);

function InsertMonster(text) {
  text = typeof text === "string" ? text.toLowerCase() : "";

  state.MS.activeMonsters = state.MS.activeMonsters || [];
  state.MS.deadMonsters = state.MS.deadMonsters || [];

  const deathWords = [
    "dies",
    "dead",
    "slain",
    "falls",
    "collapses",
    "bleeds out",
    "killed",
    "defeated",
    "corpse",
  ];

  // === DEATH DETECTION ===
  for (const m of [...state.MS.activeMonsters]) {
    const nameKey = m.name;
    if (!nameKey) continue;

    const foundDeath = deathWords.some((dw) => {
      return (
        text.includes(`${nameKey} ${dw}`) ||
        text.includes(`${dw} ${nameKey}`) ||
        (text.includes(nameKey) &&
          text.includes(dw) &&
          Math.abs(text.indexOf(dw) - text.indexOf(nameKey)) < 25)
      );
    });

    if (foundDeath) {
      console.log(`[InsertMonster] Death detected: ${m.name}`);

      if (m.count > 1) {
        const deadOne = { ...m, count: 1, health: 0, isDead: true };
        state.MS.deadMonsters.push(deadOne);

        m.count--;
        m.health = m.maxHealth;
        rescalePackDamage(m);

        state.logMessages["Output"].push(
          `[One ${m.name} dies. ${m.count} remain.]`,
        );
        onMonsterDefeated(deadOne);
      } else {
        const defeatedSnapshot = { ...m };
        m.isDead = true;
        state.MS.deadMonsters.push(m);

        state.MS.activeMonsters = state.MS.activeMonsters.filter(
          (x) => x !== m,
        );

        state.logMessages["Output"].push(`[${m.name} has been slain!]`);
        onMonsterDefeated(defeatedSnapshot);
      }
    }
  }
}

function applyDamage(damageAmount, source = "unknown") {
  // If the player takes damage or takes before barrier
  if (!state.PS) {
    console.warn("Player state not initialized.");
    return;
  }

  let remaining = Math.max(0, Math.floor(damageAmount)); // sanitize input

  // Barrier absorbs first
  if (state.PS.barrier && state.PS.barrier > 0) {
    const absorbed = Math.min(state.PS.barrier, remaining);
    updateStat("barrier", -absorbed);
    remaining -= absorbed;

    state.logMessages["Output"].push(
      `🛡️Your barrier absorbed ${absorbed} damage${source !== "unknown" ? ` from ${source}` : ""}.`,
    );
  }

  // Apply remaining damage to health
  if (remaining > 0) {
    updateStat("health", -remaining);
    state.logMessages["Output"].push(
      `💥You took ${remaining} damage${source !== "unknown" ? ` from ${source}` : ""}. Health: ${state.PS.health}.`,
    );
  } else {
    state.logMessages["Output"].push(
      `💥No damage taken — barrier held strong${source !== "unknown" ? ` against ${source}` : ""}!`,
    );
  }

  // Defeat check — resolved per the config (permadeath vs revive).
  if (state.PS.health <= 0) {
    handlePlayerDeath(source !== "unknown" ? source : null);
  }
}

function filterP(item) {
  if (item.type == "consumable") {
    return false;
  } else if (item.type == "misc") {
    return false;
  } else {
    return true;
  }
}

// Auto Combat for the player
function AutoCombat() {
  if (!state.MS.activeMonsters || state.MS.activeMonsters.length === 0) {
    state.logMessages["Output"].push("[There are no monsters to fight!]");
    console.log("CombatTurn aborted — no monsters present.");
    return;
  }

  if (!state.PS || state.PS.health <= 0) {
    state.logMessages["Output"].push("[You are too weak to fight!]");
    console.log("CombatTurn aborted — player is dead or missing.");
    return;
  }

  console.log("=== Combat Turn Start ===");

  // Player's attack phase
  playerAttack();

  // Remove dead monsters immediately
  state.MS.activeMonsters = state.MS.activeMonsters.filter((m) => m.health > 0);

  // Check for victory before monsters act
  if (state.MS.activeMonsters.length === 0) {
    state.logMessages["Output"].push("[All monsters defeated!]");
    console.log("CombatTurn ended — all monsters defeated.");
    return;
  }

  // Monster retaliation phase
  monsterAttack();

  // Post-combat check — resolved per the config (permadeath vs revive).
  if (state.PS.health <= 0) {
    state.logMessages["Output"].push("[You have been slain in battle!]");
    console.log("CombatTurn ended — player defeated.");
    handlePlayerDeath("battle");
    return;
  }

  console.log("=== Combat Turn End ===");
}

// Helper function to get an integer from a float for dice rolls.
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// NEW: Function to find a pickable item by a general name
function findPickableItemByName(queryName) {
  const lowerQuery = queryName.toLowerCase();
  for (const item of WorldLoot) {
    // More flexible matching: checks if the query is included in the item's name
    // or if the item's name is included in the query (useful for "pick up sword" matching "Shiny Sword")
    if (
      item.name.toLowerCase().includes(lowerQuery) ||
      lowerQuery.includes(item.name.toLowerCase())
    ) {
      // Return a new object to avoid modifying the original definition in the global list
      return { ...item };
    }
  }
  return null; // Item not found
}

// Function to calculate effective stats (base + equipment modifiers)
function calculateEffectiveStats() {
  if (state.PS === undefined) return null;

  // Shallow copy player state, but deep copy resistances to avoid mutating base state
  let effective = {
    ...state.PS,
    resistances: { ...state.PS.resistances },
  };

  // Apply equipment modifiers
  for (const slot in state.PS.equipped) {
    const item = state.PS.equipped[slot];
    if (item && item.modifiers) {
      for (const [stat, value] of Object.entries(item.modifiers)) {
        if (stat.endsWith("Resist")) {
          const resType = stat.replace("Resist", "").toLowerCase();
          if (effective.resistances.hasOwnProperty(resType)) {
            effective.resistances[resType] += value;
          }
        } else if (effective.hasOwnProperty(stat)) {
          effective[stat] += value;
        }
      }
    }
  }

  // Apply RPG Attribute Scaling
  if (effective.strength)
    effective["physical damage"] += effective.strength * 2;
  if (effective.intelligence)
    effective["spell damage"] += effective.intelligence * 2;
  if (effective.dexterity) effective["skill damage"] += effective.dexterity * 2;

  // Ensure health/mana don't exceed new maxHealth/maxMana from equipment
  effective.health = Math.min(effective.health, effective.maxHealth);
  effective.mana = Math.min(effective.mana, effective.maxMana);
  effective.barrier = Math.min(effective.barrier, effective.maxBarrier);

  return effective;
}

/*// Function to calculate effective stats for monsters (base + equipment modifiers)
function calculateEffectiveMonsterStats() {
    // Start with base stats
    let mseffective = { ...state.MS };
 
    // Apply equipment modifiers
    for (const slot in state.MS.equipped) {
        const item = state.MS.equipped[slot];
        if (item && item.modifiers) {
            for (const stat in item.modifiers) {
                if (effective.hasOwnProperty(stat)) {
                    effective[stat] += item.modifiers[stat];
                }
            }
        }
    }
 
    // Ensure health/mana don't exceed new maxHealth/maxMana from equipment
    effective.health = Math.min(effective.health, effective.maxHealth);
    effective.mana = Math.min(effective.mana, effective.maxMana);
 
    return mseffective;
}*/

// Function to get a specific effective stat
function getEffectiveStat(statName) {
  const effectiveStats = calculateEffectiveStats();
  return effectiveStats[statName] || 0; // Return 0 if stat doesn't exist
}

// Function to update a Monster stat (now applies to base stats)
/*function updateStat(statName, value) {
    if (state.MS.hasOwnProperty(statName)) {
        state.MS[statName] += value;
 
        // Clamp health and mana to their max values and min 0
        if (statName === 'health') {
            state.MS.health = Math.min(Math.max(state.MS.health, 0), getEffectiveStat('maxHealth')); // Use effective maxHealth
 
        } else if (statName === 'mana') {
            state.MS.mana = Math.min(Math.max(state.MS.mana, 0), getEffectiveStat('maxMana')); // Use effective maxMana
        }
        return true; // Stat updated successfully
    }
    return false; // Stat not found
}*/

// Function to update a protagonist stat (now applies to base stats)
function updateStat(statName, value) {
  if (state.PS.hasOwnProperty(statName)) {
    state.PS[statName] += value;

    if (statName === "barrier") {
      // Use effective maxBarrier
      state.PS.barrier = Math.min(
        Math.max(state.PS.barrier, 0),
        getEffectiveStat("maxBarrier"),
      );
    }

    // Clamp health and mana to their max values and min 0
    if (statName === "health") {
      state.PS.health = Math.min(
        Math.max(state.PS.health, 0),
        getEffectiveStat("maxHealth"),
      ); // Use effective maxHealth
      /*if (state.PS.health <= 0) {
                state.logMessages['Output'].push("Oh no! Your health reached zero! You have died");
                // Cragins Game Over Logic
                
            }*/
    } else if (statName === "mana") {
      state.PS.mana = Math.min(
        Math.max(state.PS.mana, 0),
        getEffectiveStat("maxMana"),
      ); // Use effective maxMana
    } else if (statName === "hunger") {
      // Hunger ranges from 0 (starving) to 200 (full)
      state.PS.hunger = Math.min(Math.max(state.PS.hunger, 0), 200);
    } else if (statName === "thirst") {
      // Thirst ranges from 0 (dehydrated) to 200 (hydrated)
      state.PS.thirst = Math.min(Math.max(state.PS.thirst, 0), 200);
    } else if (statName === "fatigue") {
      // Fatigue ranges from 0 (fully rested) to 200 (exhausted)
      state.PS.fatigue = Math.min(Math.max(state.PS.fatigue, 0), 200);
    }
    return true; // Stat updated successfully
  } else {
    console.log("Stat not found");
    return false; // Stat not found
  }
}

// Function to gain experience points
function gainXP(amount) {
  const PlayerName = state.PS.Name;
  state.PS.experience += amount;
  state.logMessages["Output"].push(`🌟${PlayerName}|Gained:${amount}EXP!`);

  // Check for level up
  if (state.PS.experience >= state.PS.xpToNextLevel) {
    state.PS.level++;
    state.PS.experience -= state.PS.xpToNextLevel; // Carry over excess XP
    state.PS.xpToNextLevel = Math.floor(state.PS.xpToNextLevel * 1.5); // Increase XP needed for next level

    // Increase core stats on level-up
    state.PS.maxHealth += 5;
    state.PS.health = getEffectiveStat("maxHealth"); // Full heal on level up!
    state.PS.maxMana += 5;
    state.PS.mana = getEffectiveStat("maxMana"); // Full mana!
    state.PS.strength += 1;
    state.PS.damage += 1;
    state.PS.dexterity += 1;
    state.PS.intelligence += 1;
    state.PS.luck += 1;
    state.PS.skillPoints += 1; // New: Gain a skill point!

    state.logMessages["Output"].push(
      `\n🎉 WOOHOO! You leveled up to Level ${state.PS.level}! You feel much stronger! You also gained 1 Skill Point!`,
    );
  }
}

// Simple list of craftable item templates for Safe Haven crafting
// Each recipe specifies required ingredients by item name.
const CRAFTABLE_ITEMS = [
  // --- Food crafts (5 total) ---
  {
    name: "Bread Loaf",
    level: "LL",
    type: "consumable",
    subtype: "food",
    uses: 3,
    effect: { hunger: 30, health: 5 },
    description:
      "A simple loaf of bread that restores a little health and eases your hunger.",
    ingredients: [{ name: "Apple", qty: 2 }],
  },
  {
    name: "Sweetroll",
    level: "LL",
    type: "consumable",
    subtype: "food",
    uses: 2,
    effect: { hunger: 25, health: 5, mana: 5 },
    description: "A sweet, frosted pastry favored by adventurers.",
    ingredients: [
      { name: "Bread Loaf", qty: 1 },
      { name: "Apple", qty: 1 },
    ],
  },
  {
    name: "Cabbage Soup",
    level: "LL",
    type: "consumable",
    subtype: "food",
    uses: 2,
    effect: { hunger: 20, health: 8 },
    description:
      "A warm bowl of soup that fills you up and restores a bit of health.",
    ingredients: [
      { name: "Bread Loaf", qty: 1 },
      { name: "Bottled Water", qty: 1 },
    ],
  },
  {
    name: "Cheese Wheel",
    level: "LL",
    type: "consumable",
    subtype: "food",
    uses: 2,
    effect: { hunger: 20, health: 10 },
    description: "A hearty wheel of cheese that restores health and hunger.",
    ingredients: [
      { name: "Bread Loaf", qty: 1 },
      { name: "Apple", qty: 2 },
    ],
  },
  {
    name: "Venison Steak",
    level: "ML",
    type: "consumable",
    subtype: "food",
    uses: 1,
    effect: { hunger: 35, health: 20 },
    description:
      "A cooked venison steak that greatly restores health and hunger.",
    ingredients: [{ name: "Meat Chunk", qty: 1 }],
  },

  // --- Filled water container craft (1 total) ---
  {
    name: "Bottled Water",
    level: "LL",
    type: "consumable",
    subtype: "water",
    uses: 2,
    effect: { thirst: 20 },
    description: "Clean bottled water that helps quench your thirst.",
    ingredients: [{ name: "Glass Bottle (Empty)", qty: 1 }],
  },

  // --- Potion crafts (Health & Mana) ---
  {
    name: "Health Potion",
    level: "LL",
    type: "consumable",
    subtype: "potion",
    uses: 2,
    effect: { health: 20 },
    description:
      "A basic healing potion that restores a moderate amount of health.",
    ingredients: [
      { name: "Glass Flask (Empty)", qty: 1 },
      { name: "Healing Salve", qty: 1 },
    ],
  },
  {
    name: "Mana Potion",
    level: "LL",
    type: "consumable",
    subtype: "potion",
    uses: 1,
    effect: { mana: 15 },
    description: "A simple mana potion that restores a bit of magical energy.",
    ingredients: [
      { name: "Glass Flask (Empty)", qty: 1 },
      { name: "Magic Potion", qty: 1 },
    ],
  },
];

// Simple list of Safe Haven shop items (ingredients only) for the /shop command
// Each entry has a price in gold and an item template to add to the inventory.
const SAFE_HAVEN_SHOP_ITEMS = [
  {
    name: "Apple",
    level: "LL",
    type: "consumable",
    subtype: "food",
    uses: 1,
    effect: { hunger: 15 },
    description: "A simple snack used in many basic recipes.",
    price: 2,
  },
  {
    name: "Bread Loaf",
    level: "LL",
    type: "consumable",
    subtype: "food",
    uses: 3,
    effect: { hunger: 30, health: 5 },
    description: "Fresh bread, useful on its own or as a crafting ingredient.",
    price: 4,
  },
  {
    name: "Meat Chunk",
    level: "LL",
    type: "consumable",
    subtype: "food",
    uses: 2,
    effect: { health: 10 },
    description: "Raw meat that can be cooked into something more filling.",
    price: 5,
  },
  {
    name: "Glass Bottle (Empty)",
    level: "LL",
    type: "misc",
    subtype: "container",
    description: "An empty glass bottle, perfect for holding water or potions.",
    price: 3,
  },
  {
    name: "Glass Flask (Empty)",
    level: "LL",
    type: "misc",
    subtype: "container",
    description: "A small glass flask used for brewing potions.",
    price: 4,
  },
  {
    name: "Healing Salve",
    level: "LL",
    type: "consumable",
    subtype: "salve",
    uses: 1,
    effect: { health: 10 },
    description: "A basic healing salve used as a component for potions.",
    price: 6,
  },
  {
    name: "Magic Potion",
    level: "LL",
    type: "consumable",
    subtype: "potion",
    uses: 1,
    effect: { mana: 25 },
    description: "A simple mana-restoring draught used in alchemy.",
    price: 8,
  },
];

// Expose craftable items and shop items via state so other hooks (like input.js) can read them
if (typeof state !== "undefined") {
  state.craftableItems = CRAFTABLE_ITEMS;
  state.shopItems = SAFE_HAVEN_SHOP_ITEMS;
}

// --- Inventory display: stacking + materials (used by backpack & story cards) ---
const MATERIAL_NAME_ALLOWLIST = new Set([
  "Glass Bottle (Empty)",
  "Glass Flask (Empty)",
  "Healing Salve",
  "Magic Potion",
  "Meat Chunk",
]);

function isMaterialItem(item) {
  if (item == null || typeof item === "string") return false;
  if (item.type === "material") return true;
  if (item.subtype === "material" || item.subtype === "monster_core")
    return true;
  if (item.name && MATERIAL_NAME_ALLOWLIST.has(item.name)) return true;
  return false;
}

// ---------------------------------------------------------------------------
//  MULTI-TIERED INVENTORY CONTAINERS
// ---------------------------------------------------------------------------
// `state.PS.inventory` stays the backing array for the "main" container so
// every existing read/write site still works. `state.PS.containers.main` is
// a reference alias (set during migration), so containerArray("main") and
// state.PS.inventory are the same array. Other containers are independent
// arrays filled on demand by the classifier and addItem.

function classifyItemToContainer(item) {
  if (item == null || typeof item === "string") return "main";
  // Materials: existing rule (type/subtype + MATERIAL_NAME_ALLOWLIST).
  if (isMaterialItem(item)) return "materials";
  // Skill Stones: forward-compatible rule. Today no item shape exists, but
  // the moment a spellstone drops as loot it routes here automatically.
  if (item.type === "skillStone") return "skillStones";
  if (item.subtype === "skill_stone") return "skillStones";
  if (typeof item.name === "string" && /\bspellstone\b/i.test(item.name))
    return "skillStones";
  // Artifacts: new taxonomy.
  if (item.type === "artifact") return "artifacts";
  if (item.subtype === "artifact") return "artifacts";
  return "main";
}

function containerArray(key) {
  if (!state.PS) return [];
  if (key === "main") {
    if (!Array.isArray(state.PS.inventory)) state.PS.inventory = [];
    return state.PS.inventory;
  }
  if (!state.PS.containers || !Array.isArray(state.PS.containers[key])) {
    if (!state.PS.containers || typeof state.PS.containers !== "object") {
      state.PS.containers = {};
    }
    state.PS.containers[key] = [];
  }
  return state.PS.containers[key];
}

function containerItems(key) {
  const arr = containerArray(key);
  return Array.isArray(arr) ? arr : [];
}

function findItemAcrossContainers(predicate) {
  for (const k of ITEM_CONTAINER_KEYS) {
    const arr = containerItems(k);
    const idx = arr.findIndex(predicate);
    if (idx !== -1) return { key: k, index: idx, item: arr[idx] };
  }
  return null;
}

function removeItemFromContainer(key, index) {
  const arr = containerArray(key);
  if (!Array.isArray(arr)) return null;
  return arr.splice(index, 1)[0] ?? null;
}

// Count items matching `predicate` across every container. Used by crafting
// to verify the player has enough of an ingredient regardless of which
// container it currently lives in.
function countItemAcrossContainers(predicate) {
  let total = 0;
  for (const k of ITEM_CONTAINER_KEYS) {
    const arr = containerItems(k);
    for (const it of arr) if (predicate(it)) total++;
  }
  return total;
}

function itemStackGroupKey(item) {
  if (typeof item === "string") return "str|" + item;
  const nm = (item.name || "item").toLowerCase();
  const typ = item.type || "";
  const sub = item.subtype || "";
  const slot = item.slot || "";
  const r = item.rarity || "";
  const lv = item.level != null ? String(item.level) : "";
  const uses = item.uses != null ? String(item.uses) : "";
  return [nm, typ, sub, slot, r, lv, uses].join("|");
}

function itemDisplayLabel(item) {
  if (typeof item === "string") return item;
  const name = item.name || "item";
  if (item.uses !== undefined) return `${name} (Uses:${item.uses})`;
  return name;
}

function formatStackedInventoryList(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const groups = new Map();
  for (const it of items) {
    const key = itemStackGroupKey(it);
    const label = itemDisplayLabel(it);
    const cur = groups.get(key);
    if (!cur) groups.set(key, { label, count: 1 });
    else cur.count += 1;
  }
  return [...groups.values()]
    .map(({ label, count }) => (count > 1 ? `${label} (x${count})` : label))
    .join(", ");
}

function formatUnstackedInventoryList(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items.map(itemDisplayLabel).join(", ");
}

function formatInventorySections(inventory) {
  const inv = Array.isArray(inventory) ? inventory : [];
  const gear = inv.filter((i) => !isMaterialItem(i));
  const mats = inv.filter((i) => isMaterialItem(i));

  // "Basic inventory" (non-materials) shown as a normal string (no JSON pretty print)
  const backpackLine = formatStackedInventoryList(gear) || "";

  // Materials remain separated and can be used elsewhere.
  const materialsLine = formatUnstackedInventoryList(mats) || "None";

  return {
    backpackLine,
    materialsLine,
  };
}

// Canonical "what the player sees" inventory string.
// IMPORTANT: Do not store this as a separate array/object; compute it from current state.PS.inventory
// so inventory.push/splice/etc automatically reflects.
function getInventoryDisplayLine() {
  const inv = state.PS?.inventory || [];
  const invSections = formatInventorySections(inv);
  return invSections.backpackLine;
}

function coreTierLabelFromMonster(monster) {
  const td =
    monster && monster.name
      ? monsterTierMap.get(monster.name.toLowerCase().trim())
      : null;
  if (!td || !td.tier) return "LL";
  if (td.tier === "weak") return "LL";
  if (td.tier === "normal") return "ML";
  return "HL";
}

function createMonsterCoreFromDefeat(monster) {
  if (!monster || !monster.name) return null;
  const tierData = monsterTierMap.get(monster.name.toLowerCase().trim());
  const creatureType = tierData?.type || monster.type || "Unknown";
  const coreTier = coreTierLabelFromMonster(monster);
  const lv = Math.max(1, Math.round(monster.level || 1));
  return {
    name: `${creatureType} Monster Core (${coreTier}, Lv ${lv})`,
    type: "material",
    subtype: "monster_core",
    sourceMonster: monster.name,
    coreType: creatureType,
    coreTier,
    coreLevel: lv,
    description: `Crystallized essence taken from a ${monster.name}.`,
    rarity: "common",
  };
}

function grantMonsterCore(monster) {
  const core = createMonsterCoreFromDefeat(monster);
  if (core) addItem(core);
}

// Function to add item to the player's inventory. Routes the item to the
// correct container via classifyItemToContainer (or the explicit `opts.container`
// override) so a material never lands on Main and gear never lands in
// Materials. The Main container is aliased to state.PS.inventory, so pushes
// to "main" still mutate the backing array every other site already touches.
function addItem(item, opts = {}) {
  if (!state.PS) return;
  if (!Array.isArray(state.PS.inventory)) state.PS.inventory = [];
  if (
    !state.PS.containers ||
    typeof state.PS.containers !== "object" ||
    Array.isArray(state.PS.containers)
  ) {
    state.PS.containers = {
      main: state.PS.inventory,
      materials: [],
      skillStones: [],
      artifacts: [],
    };
  }
  for (const k of ITEM_CONTAINER_KEYS) {
    if (!Array.isArray(state.PS.containers[k])) state.PS.containers[k] = [];
  }
  if (!state.logMessages["Output"]) state.logMessages["Output"] = [];

  const targetKey = opts.container || classifyItemToContainer(item);
  const arr =
    targetKey === "main" ? state.PS.inventory : state.PS.containers[targetKey];
  arr.push(item);

  const Player = state.PS.Name || "You";
  const label = targetKey === "main" ? "backpack" : targetKey;
  state.logMessages["Output"].push(
    `🎒 ${Player} ${label} gained a ${item.name}`,
  );
}

// Function to use a consumable item (enhanced to support food/water)
function useItem(itemName) {
  return useConsumableItem(itemName);
}

function equipItem(itemName) {
  Player = state.PS.Name;
  const itemList =
    formatStackedInventoryList(state.PS.inventory || []) || "None";
  //End

  if (itemName.toLowerCase() === "all") {
    // Equip all equippable items
    const equippedSlots = Object.keys(state.PS.equipped);
    for (let i = state.PS.inventory.length - 1; i >= 0; i--) {
      const item = state.PS.inventory[i];
      const slot = item.slot;
      //console.log(item)
      if (slot && equippedSlots.includes(slot)) {
        if (state.PS.equipped[slot] !== null) {
          const currentEquipped = state.PS.equipped[slot];
          state.PS.inventory.push(currentEquipped);
          state.logMessages["Output"].push(
            `🔄 You unequipped your ${currentEquipped.name} and put it back in your backpack.`,
          );
        }

        state.PS.equipped[slot] = item;
        state.PS.inventory.splice(i, 1);
        state.logMessages["Output"].push(`⚔️${Player} equipped ${item.name}!`);
        state.PS.inventory;
        if (!Player) {
          return;
        } else {
        }
      }
    }
  } else {
    // Equip a single item
    const itemIndex = state.PS.inventory.findIndex(
      (item) => item.name.toLowerCase() === itemName.toLowerCase(),
    );

    if (itemIndex !== -1) {
      const itemToEquip = state.PS.inventory[itemIndex];
      console.log(itemToEquip);
      const slot = itemToEquip.slot;

      if (state.PS.equipped[slot] !== null) {
        const currentEquipped = state.PS.equipped[slot];
        state.PS.inventory.push(currentEquipped);
        state.logMessages["Output"].push(
          `🔄 You unequipped your ${currentEquipped.name} and put it back in your backpack.`,
        );
      }

      state.PS.equipped[slot] = itemToEquip;
      state.PS.inventory.splice(itemIndex, 1);
      state.logMessages["Output"].push(
        `⚔️You equipped the ${itemToEquip.name} into your ${slot} slot!`,
      );
      //updatePlayerSummary(itemList, summaryKey)
      state.PS.inventory;
    } else {
      state.logMessages["Output"].push(
        `🤔 You don't have a ${itemName} that can be equipped.`,
      );
    }
  }
}

// New: Function to unequip an item
function unequipItem(slotName) {
  if (!state.PS || !state.PS.Name) return;
  const name = state.PS.Name || "Adventurer";
  const slot = slotName.toLowerCase();
  if (state.PS.equipped[slot]) {
    const itemToUnequip = state.PS.equipped[slot];
    state.PS.inventory.push(itemToUnequip); // Put item back in inventory
    state.PS.equipped[slot] = null; // Clear slot
    //console.log(slot)
    updatePlayerSummary(itemList, summaryKey);
    state.logMessages["Output"].push(
      `🎒 You unequipped the ${itemToUnequip.name} and put it back in your backpack.`,
    );
    return true;
  }
  state.logMessages["Output"].push(
    `🤔 You don't have anything equipped in your ${slotName} slot.`,
  );
  return false;
}

// New: Function to attempt to learn a skill
function learnSkill(skillName) {
  if (state.PS.skillPoints <= 0) {
    state.logMessages["Output"].push(
      "🙁 You don't have enough Skill Points to learn a new skill!",
    );
    return false;
  }

  if (state.PS.skills[skillName.toLowerCase()]) {
    state.logMessages["Output"].push(
      `🤔 You already know the skill "${skillName}"!`,
    );
    return false;
  }

  // For now, very simple skill definition.
  // In a more complex system, you'd define what each skill does.
  const def = AbilityRegistry.getSkill(skillName.toLowerCase());
  state.PS.skills[skillName.toLowerCase()] = def
    ? {
        level: 1,
        displayName: def.displayName,
        description: def.description,
        abilityType: def.abilityType,
        magicEffect: def.magicEffect,
        targetType: def.targetType,
        cd: def.cd,
        effect: def.effect,
      }
    : { level: 1, description: "", effect: {} };
  /*state.PS.skills = {
        // Add Skill names and effects
        // Example format- name: skillName, level: 1, effect:{ strength: 3,description:'Damage Buff' }
       slash: {level: 1, description:'Strong swing of your sword', effect: 10 },
        
    };*/
  state.PS.skillPoints--;
  state.logMessages["Output"].push(
    `✨ You learned the skill "${skillName}"! You have ${state.PS.skillPoints} Skill Points left.`,
  );
  return true;
}

// ---------------------------------------------------------------------------
//  EFFECT HELPERS — each magicEffect resolves to one of these. useSkill just
//  wires targets + ability into them, so the "final result" is built here.
// ---------------------------------------------------------------------------

// Deal `amount` damage to one monster and handle pack/single death.
// Extracted from the old inline block so damage abilities and normal attacks
// share the same death handling.
function damageMonster(target, amount, ability, PlayerName) {
  state.MS.lastTarget = target.name.toLowerCase();
  target.state = "Attacked";

  target.health -= amount;
  if (target.health < 0) target.health = 0;

  state.logMessages["Output"].push(
    `✨${PlayerName}|Used:${ability.displayName}|Target:${target.name}|Damage:${amount}`,
  );

  // Chance to inflict the ability's matching status effect on a survivor.
  // DoT ticks call back in without a damageType, so they can't re-proc.
  if (target.health > 0 && ability && ability.damageType) {
    rollStatusEffect(target, ability.damageType, amount);
  }

  if (target.health <= 0) {
    if (target.count > 1) {
      const deadOne = { ...target, count: 1, health: 0, isDead: true };
      state.MS.deadMonsters.push(deadOne);
      target.count--;
      target.health = target.maxHealth;
      rescalePackDamage(target);
      state.logMessages["Output"].push(
        `[One ${target.name} dies. ${target.count} remain.]`,
      );
      onMonsterDefeated(deadOne);
    } else {
      const defeatedSnapshot = { ...target };
      target.isDead = true;
      state.MS.deadMonsters.push(target);
      state.MS.activeMonsters = state.MS.activeMonsters.filter(
        (x) => x !== target,
      );
      state.logMessages["Output"].push(
        `☠️(${PlayerName}|Defeated:${target.name})`,
      );
      state.logMessages["Input"].push(`${PlayerName}|Defeated:${target.name}`);
      onMonsterDefeated(defeatedSnapshot);
    }
  }
}

function applyDamageEffect(ability, targets, PlayerName) {
  const amount = ability.effect.damage;
  for (const target of targets)
    damageMonster(target, amount, ability, PlayerName);
}

// `allyTargets` / `hitsSelf` come from resolveAbilityTargets: an "ally" cast
// heals a companion instead of the caster, a "party" cast heals both. Callers
// that pass neither keep the original self-heal behaviour.
function applyHealEffect(ability, PlayerName, allyTargets, hitsSelf) {
  const amount = ability.effect.heal || ability.effect.health;
  const allies = allyTargets || [];
  const healsSelf = hitsSelf !== false || allies.length === 0;

  if (healsSelf) {
    updateStat("health", amount);
    makelog(
      "Input",
      `\n${PlayerName} casts ${ability.displayName} for Healing.`,
    );
    state.logMessages["Output"].push(
      `💚${PlayerName} casts ${ability.displayName}|Restored:(${amount})HP!|❤️${state.PS.health}`,
    );
  }

  // ---- ALLY SYSTEM ----
  for (const c of allies) {
    if (!c || c.isDead) continue;
    const before = c.health;
    c.health = Math.min(c.maxHealth, c.health + amount);
    state.logMessages["Output"].push(
      `💚${PlayerName} heals ${c.name}|Restored:(${c.health - before})HP!|❤️${c.health}/${c.maxHealth}`,
    );
  }
}

// Buffs cover barrier, stealth and flat stat modifiers.
function applyBuffEffect(ability, PlayerName, allyTargets) {
  const eff = ability.effect;
  if (eff.barrier) {
    updateStat("barrier", eff.barrier);
    makelog(
      "Input",
      `\n${PlayerName} casts ${ability.displayName} for protection.`,
    );
    state.logMessages["Output"].push(
      `🛡️${PlayerName} casts ${ability.displayName}|Gains:${eff.barrier} barrier!|🛡️${state.PS.barrier}`,
    );
  }
  if (eff.stealth) {
    updateStat("stealth", eff.stealth);
    makelog("Input", `\n${PlayerName} fades into the shadows.`);
    for (const mon of state.MS.activeMonsters) mon.state = "Searching";
  }
  if (eff.modifiers) {
    // Apply as flat stat bumps. TODO: track timed stat modifiers so they
    // expire after `duration`; for now the buff persists (balanced by cost/cd).
    for (const [stat, amt] of Object.entries(eff.modifiers))
      updateStat(stat, amt);
    state.logMessages["Output"].push(
      `💪${PlayerName} is empowered by ${ability.displayName}.`,
    );

    // ---- ALLY SYSTEM ----
    // Companions only carry a flat damage line, so a party buff maps onto
    // that rather than the player's full stat sheet.
    for (const c of allyTargets || []) {
      if (!c || c.isDead) continue;
      const bump =
        Number(eff.modifiers.damage) ||
        Number(eff.modifiers["base damage"]) ||
        0;
      if (bump > 0) {
        c.damage += bump;
        c.damageMax += bump;
        state.logMessages["Output"].push(
          `💪${c.name} is empowered by ${ability.displayName}.`,
        );
      }
    }
  }
}

// Curse: a debuff on the enemy. Full timed-debuff tracking is not built yet,
// so for now we announce it and stamp a marker on the target.
function applyCurseEffect(ability, targets, PlayerName) {
  for (const target of targets) {
    target.cursed = ability.effect.curse || true;
    state.logMessages["Output"].push(
      `🕯️${PlayerName} curses ${target.name} with ${ability.displayName}.`,
    );
  }
}

// Hex: like a curse but tends to alter defenses/vulnerability. Same TODO.
function applyHexEffect(ability, targets, PlayerName) {
  for (const target of targets) {
    if (
      ability.effect.hex &&
      ability.effect.hex.vulnerability &&
      target.enemyDefenses
    ) {
      target.enemyDefenses.vulnerability =
        (target.enemyDefenses.vulnerability || 0) +
        ability.effect.hex.vulnerability;
    }
    state.logMessages["Output"].push(
      `🔮${PlayerName} hexes ${target.name} with ${ability.displayName}.`,
    );
  }
}

// Function to use Player Skills
function useSkill(skillName, text) {
  skillName = skillName.toLowerCase();
  const PlayerName = state.PS.Name;
  const characterClass = state.PS.Class;
  const known = (state.PS.skills || {})[skillName];

  // --- CLASS CHECK ---
  if (!characterClass) {
    state.logMessages["Output"].push(
      `You must select a class before using skills.`,
    );
    return [false, text];
  }

  // --- KNOWN CHECK (must be in the player's learned set) ---
  if (!known) {
    state.logMessages["Output"].push(
      `🤔 You don't know a skill called "${skillName}".`,
    );
    return [false, text];
  }

  // --- FUNCTION SKILL EFFECTS (legacy passthrough) ---
  if (typeof known.effect === "function") {
    const out = known.effect(skillName);
    return Array.isArray(out) ? out : [true, out];
  }

  // --- CANONICAL DEFINITION (registry is source of truth) ---
  const ability = getAbility(skillName);
  const eff = ability.effect;

  // --- COOLDOWN CHECK ---
  if (!isAbilityReady(skillName)) {
    state.logMessages["Output"].push(
      `⏳ ${ability.displayName} is on cooldown (${getCooldownRemaining(skillName)} turn(s) left).`,
    );
    return [false, text];
  }

  // --- MANA CHECK (ability.mana is the canonical cost) ---
  const manaCost = ability.mana || eff.mana || 0;
  if (state.PS.mana + manaCost < 0) {
    state.logMessages["Output"].push(
      `❌ Not enough mana to cast ${ability.displayName}.`,
    );
    return [false, text];
  }

  // --- HEALTH CHECK (blood-fueled abilities pay HP; never enough to self-kill) ---
  const healthCost = eff.healthCost || 0;
  if (healthCost && state.PS.health <= healthCost) {
    state.logMessages["Output"].push(
      `🩸 Not enough health to channel ${ability.displayName}.`,
    );
    return [false, text];
  }

  // --- TARGET RESOLUTION (by targetType) ---
  // `companions` is the ALLY SYSTEM's half: populated for targetType
  // "ally"/"party", empty otherwise.
  const { monsters, hitsSelf, companions } = resolveAbilityTargets(
    ability,
    text,
  );
  const allyTargets = companions || [];
  const needsEnemy = !!(eff.damage || eff.curse || eff.hex);
  if (needsEnemy && monsters.length === 0) {
    state.logMessages["Output"].push(`There are no monsters to target.`);
    return [false, text]; // do not spend mana or trigger cooldown
  }

  // --- RANGE / REACH ---
  // Ranged abilities reach any monster; a melee ability must be in reach. Any
  // out-of-reach target is closed on (via resolveReach) but not hit this cast.
  let reachable = monsters;
  if (needsEnemy && (ability.range || "melee").toLowerCase() !== "ranged") {
    reachable = monsters.filter((m) => resolveReach(m, "melee").canHit);
    if (reachable.length === 0) {
      state.logMessages["Output"].push(
        `[You close the distance for ${ability.displayName}.]`,
      );
      return [false, text]; // melee needs reach first; no mana/cooldown spent
    }
  }

  // --- PAY COST ---
  if (manaCost) updateStat("mana", manaCost);
  if (healthCost) {
    updateStat("health", -healthCost);
    state.logMessages["Output"].push(
      `🩸${PlayerName} spends ${healthCost} HP|❤️${state.PS.health}`,
    );
  }

  // --- DISPATCH EFFECTS ---
  let didSomething = false;
  if (eff.damage) {
    applyDamageEffect(ability, reachable, PlayerName);
    didSomething = true;
  }
  if (eff.heal || eff.health) {
    applyHealEffect(ability, PlayerName, allyTargets, hitsSelf);
    didSomething = true;
  }
  if (eff.barrier || eff.stealth || eff.modifiers) {
    applyBuffEffect(ability, PlayerName, allyTargets);
    didSomething = true;
  }
  // ---- ALLY SYSTEM ----
  if (eff.summon || eff.summonCorpse) {
    applySummonEffect(ability, PlayerName);
    didSomething = true;
  }
  if (eff.curse) {
    applyCurseEffect(ability, reachable, PlayerName);
    didSomething = true;
  }
  if (eff.hex) {
    applyHexEffect(ability, reachable, PlayerName);
    didSomething = true;
  }
  if (!didSomething) {
    state.logMessages["Input"].push(
      `\n${PlayerName} uses ${ability.displayName}.`,
    );
  }

  // --- START COOLDOWN ---
  startCooldown(skillName, ability);

  // ALWAYS show remaining mana
  state.logMessages["Output"].push(
    `🌀${PlayerName}|Mana:(${state.PS.mana}/${state.PS.maxMana})`,
  );

  return [true, text];
}

// New: Function to perform a stat check
function performStatCheck(statName, difficulty) {
  const effectiveValue = getEffectiveStat(statName);
  const roll = getRandomInt(1, 20); // D20 roll
  const total = effectiveValue + roll;

  let result = "";
  let success = false;

  // Define difficulty thresholds (can be expanded/adjusted). `difficulty` names
  // how hard THIS task is; callers may omit it (StatCheckStrength passes null),
  // so default to medium rather than throwing on .toLowerCase().
  const band = String(difficulty || "medium").toLowerCase();
  let difficultyValue;
  switch (band) {
    case "easy":
      difficultyValue = 10;
      break;
    case "medium":
      difficultyValue = 15;
      break;
    case "hard":
      difficultyValue = 20;
      break;
    case "impossible":
      difficultyValue = 25;
      break;
    default:
      difficultyValue = 15; // Default to medium
  }

  // Config: the world's Difficulty setting shifts every DC.
  difficultyValue = Math.max(1, difficultyValue + rpgDifficultyShift());

  if (total >= difficultyValue) {
    success = true;
    result = `✅ SUCCESS! Your ${statName} check (${effectiveValue} + ${roll} roll = ${total}) beat the DC ${difficultyValue}!`;
  } else {
    success = false;
    result = `❌ FAILURE! Your ${statName} check (${effectiveValue} + ${roll} roll = ${total}) couldn't beat the DC ${difficultyValue}.`;
  }

  state.logMessages["Output"].push(
    `🎲 Attempting a ${statName.toUpperCase()} check (Difficulty: ${band.toUpperCase()}, DC ${difficultyValue})...`,
  );
  state.logMessages["Output"].push(result);

  return success; // Return true/false for success
}

///// Code for Story Interactions\\\\\
function StatCheckStrength() {
  // Give it positive or negitive Return what the value was
  performStatCheck("strength", null);
}

function displayDefenses() {
  const effectiveStats = calculateEffectiveStats();
  let message = `----------------------------------\n`;
  message += `🛡️ Defenses & Resistances\n`;
  message += `Armor: ${effectiveStats.armor}\n`;

  if (effectiveStats.resistances) {
    for (const [type, value] of Object.entries(effectiveStats.resistances)) {
      message += `${type.charAt(0).toUpperCase() + type.slice(1)} Res: ${value}%\n`;
    }
  } else {
    message += `No resistances found.\n`;
  }

  message += `----------------------------------\n`;
  return message;
}

function displayStatsDetailed() {
  return (
    displayLevel() +
    displayAttributes() +
    displayEquipped() +
    displaySkills() +
    displayBackpack()
  );
}

function displayLevel() {
  // Show level stats
  const stats = state.PS || {};
  let message = `----------------------------------\n`;
  message += `🌟Level:${stats.level}|Next Level:${stats.experience}/${stats.xpToNextLevel}XP\n`;
  message += `📚Skill Points:${stats.skillPoints}\n`; // New: Show skill points
  message += `----------------------------------\n`;
  return message;
}

function displayAttributes() {
  // Show base stats
  const stats = state.PS || {};
  const effectiveStats = calculateEffectiveStats();
  let message = `----------------------------------\n`;
  message += `🌟Lvl: ${stats.level}\n`;
  message += `❤️ Health: ${effectiveStats.health} /${effectiveStats.maxHealth}\n`;
  message += `🛡️ Barrier: ${effectiveStats.barrier}/${effectiveStats.maxBarrier}\n`;
  message += `🌀 Mana: ${effectiveStats.mana}/${effectiveStats.maxMana}\n`;
  message += `👁️‍🗨️ Vision: ${effectiveStats.vision}\n`;
  message += `👥 Stealth: ${effectiveStats.stealth}\n`;
  message += `💪 Strength: ${effectiveStats.strength}\n`;
  message += `💨 Dexterity: ${effectiveStats.dexterity}\n`;
  message += `🧠 Intelligence: ${effectiveStats.intelligence}\n`;
  message += `💰💰Gold:${stats.gold}\n`;
  message += `🍀 Luck: ${effectiveStats.luck} (Base: ${stats.luck})\n`;

  message += `----------------------------------\n`;

  return message;
}

function displayDamage() {
  // Show damage stats
  //const stats = state.PS || {};

  const effectiveStats = calculateEffectiveStats();

  let message = `----------------------------------\n`;
  message += `🗡️ Damage: ${effectiveStats["base damage"]} \n`;
  message += `✨ Spell Damage: ${effectiveStats["spell damage"]} \n`;
  message += `🛠️ Skill Damage: ${effectiveStats["skill damage"]} \n`;
  message += `🔥 Fire Damage: ${effectiveStats["fire damage"]} \n`;
  message += `❄️ Frost Damage: ${effectiveStats["frost damage"]} \n`;
  message += `⚡ Lightning Damage: ${effectiveStats["lightning damage"]} \n`;
  message += `🌿 Nature Damage: ${effectiveStats["nature damage"]} \n`;
  message += `💪 Physical Damage: ${effectiveStats["physical damage"]} \n`;
  message += `🩸 Bleed Damage: ${effectiveStats["bleed damage"]} \n`;
  message += `☠️ Poison Damage: ${effectiveStats["poison damage"]} \n`;
  message += `⚗️ Chaos Damage: ${effectiveStats["chaos damage"]} \n`;
  message += `⚠️ Status Damage: ${effectiveStats["status damage"]} \n`;
  message += `🎯 Crit Chance: ${effectiveStats["crit chance"]}%\n`;
  message += `💥 Crit Damage: ${effectiveStats["crit damage"]}%\n`;

  return (message += `----------------------------------\n`);
}

function displayEquipped() {
  if (state.Players === undefined || !state.PS || !state.PS.equipped) return;

  const equipped = state.PS.equipped; // Shortcut to equipped object
  let message = `----------------------------------\n`;
  message += `⚔️ Equipped Items & Stats\n`;

  // Define the slots you want to check
  const slots = ["mainhand", "offhand", "head", "necklace", "chest", "back"];
  slots.forEach((slotName) => {
    const item = equipped[slotName];
    const itemName = item && item.name ? item.name : "None";

    // Add item name
    message += `${slotName.toUpperCase()}: ${itemName} \n`;

    // Add stats/modifiers if they exist
    if (item && item.modifiers) {
      // Loop through modifiers and format them nicely
      for (const [stat, value] of Object.entries(item.modifiers)) {
        message += `${stat}: ${value} \n`;
      }
    }
    message += `\n`;
  });

  message += `----------------------------------`;
  //console.log(message);
  return message;
}

function displaySkills() {
  let message = `----------------------------------\n`;
  if (state.PS !== undefined) {
    if (Object.keys(state.PS.skills).length > 0) {
      // New: Display skills
      message += `💡 Learned Skills: \n${Object.entries(state.PS.skills)
        .map((kvp) => kvp[0] + ": " + kvp[1].description)
        .join(".\n")}.\n`;
    } else {
      message += `💡 Learned Skills: None yet!\n`;
    }
    message += `----------------------------------\n`;
  }
  return message;
}

function displayBackpack() {
  // Legacy wrapper preserved for any external callers. The bare "show backpack"
  // command now opens the container menu (which auto-shows Main). This
  // function returns the menu so old direct callers still see something
  // sensible.
  return displayBackpackMenu();
}

const BACKPACK_SUBKEYS = ["main", "materials", "skillStones", "artifacts"];

function containerHeader(key) {
  switch (key) {
    case "main":
      return "🎒 Main Inventory";
    case "materials":
      return "🧱 Materials";
    case "skillStones":
      return "💎 Skill Stones";
    case "artifacts":
      return "🏺 Artifacts";
    default:
      return key;
  }
}

function displayBackpackContainer(key) {
  if (!state.PS) return "";
  if (!BACKPACK_SUBKEYS.includes(key)) return "";
  const items = containerItems(key);
  const cap = state.PS.containerCapacity
    ? state.PS.containerCapacity[key]
    : undefined;
  const count = items.length;
  const capStr =
    cap === Infinity || cap == null ? `${count}` : `${count}/${cap}`;
  const stacked = formatStackedInventoryList(items) || "None";
  const unstacked = formatUnstackedInventoryList(items) || "None";
  // Specialised containers (materials/skillStones/artifacts) read cleaner as
  // an unstacked list — each monster_core / spellstone / artifact is its own
  // entry with descriptive metadata. Main keeps the stacked gear format so
  // the "x3" grouping still applies.
  const body = key === "main" ? stacked : unstacked;
  return (
    `----------------------------------\n` +
    `${containerHeader(key)} (${capStr})\n` +
    `${body}\n` +
    `----------------------------------\n`
  );
}

function displayBackpackAll() {
  if (!state.PS) return "";
  let out = `----------------------------------\n`;
  for (const k of BACKPACK_SUBKEYS) {
    // Reuse displayBackpackContainer's body but strip its top/bottom rules so
    // the "all" view reads as one continuous panel.
    const section = displayBackpackContainer(k);
    const lines = section.split("\n");
    out += lines.slice(1, -2).join("\n") + "\n";
  }
  return out + `----------------------------------\n`;
}

function displayBackpackMenu() {
  // Hybrid UX: the bare "show backpack" prints the menu AND auto-opens Main
  // on the same turn so the player doesn't need a second command to see
  // their gear.
  if (!state.PS) return "";
  const inv = state.PS.inventory || [];
  const maxSlots = state.PS.inventoryMaxSize ?? 30;
  const matCount = containerItems("materials").length;
  const ssCount = containerItems("skillStones").length;
  const artCount = containerItems("artifacts").length;
  const mainSection = displayBackpackContainer("main");
  const mainBody = mainSection.split("\n").slice(1).join("\n");
  return (
    `----------------------------------\n` +
    `🎒 Backpack (${inv.length}/${maxSlots})\n` +
    `Choose a container:\n` +
    `  1) 🎒 Main Inventory\n` +
    `  2) 🧱 Materials (${matCount})\n` +
    `  3) 💎 Skill Stones (${ssCount})\n` +
    `  4) 🏺 Artifacts (${artCount})\n` +
    `  5) 📦 Show All\n` +
    `\nOpening Main Inventory now. Type "show backpack <key>" to switch.\n` +
    mainBody
  );
}

function handleBackpackCommand() {
  return displayBackpackMenu();
}

// Helper for natural regeneration (small health/mana regen over turns)
function naturalRegen() {
  if (state.PS.health < getEffectiveStat("maxHealth")) {
    updateStat("health", 1); // Gain 1 HP
  }
  if (state.PS.mana < getEffectiveStat("maxMana")) {
    updateStat("mana", 1); // Gain 1 MP
  }
}

///// End of Player stats code\\\\\

/////Start of endless dungeon code\\\\\
// Word lists used in output modifier.

function getGender() {
  return gender[Math.floor(Math.random() * gender.length)];
}
const gender = ["male", "female"];
function getRace() {
  return race[Math.floor(Math.random() * race.length)];
}
const race = [
  "human",
  "elf",
  "dwarf",
  "gnome",
  "halfling",
  "hobbit",
  "drow",
  "angel",
  "demon",
  "troll",
  "ogre",
  "vampire",
  "werewolf",
  "slimegirl",
  "Cthulhu",
  "fairy",
  "pixie",
  "sasquatch",
  "centaur",
  "merperson",
  "zombie",
  "harpy",
  "dragonborn",
  "dragon",
  "kobold",
  "ent",
  "aarakocra",
  "kitsune",
  "wood elf",
  "high elf",
  "golem",
  "ghost",
  "gargoyle",
  "sylph",
  "djinn",
  "android",
  "cyborg",
  "hill giant",
  "yeti",
  "orc",
  "half-orc",
  "goblin",
  "half-elf",
  "star-child",
  "titan",
  "mind flayer",
  "gorgon",
  "alien",
  "nymph",
  "dryad",
  "naiad",
  "cyclops",
  "minotaur",
  "banshee",
  "sidhe",
  "naga",
  "satyr",
  "faun",
];
function getClass() {
  return classes[Math.floor(Math.random() * classes.length)];
}
const classes = [
  "warrior",
  "mage",
  "thief",
  "bard",
  "wizard",
  "sorcerer",
  "warlock",
  "witch",
  "barbarian",
  "knight",
  "gladiator",
  "assassin",
  "priest",
  "cleric",
  "noble",
  "merchant",
  "sage",
  "acrobat",
  "peasant",
  "tourist",
  "gangster",
  "paladin",
  "soldier",
  "ranger",
  "hunter",
  "blacksmith",
  "healer",
  "alchemist",
  "pirate",
  "smuggler",
  "prisoner",
  "maid",
  "shaman",
  "monk",
  "ninja",
  "druid",
  "spellsword",
  "farmer",
  "runemaster",
  "scholar",
  "scribe",
  "scout",
  "Valkyrie",
  "samurai",
  "plague doctor",
  "necromancer",
  "miner",
  "monster tamer",
  "battlemage",
  "artificer",
  "aristocrat",
  "librarian",
  "psion",
  "hermit",
  "pilgrim",
  "butler",
];
function getMonAdj() {
  return monadj[Math.floor(Math.random() * monadj.length)];
}
const monadj = [
  "sabertooth",
  "fire-breathing",
  "venomous",
  "gelatinous",
  "winged",
  "flame",
  "dancing",
  "radioactive",
  "mechanical",
  "vorpal",
  "tentacled",
  "eldritch",
  "ethereal",
  "nightmare",
  "magical",
  "floating",
  "rabid",
  "were-",
  "screaming",
  "demonic",
  "angelic",
  "rotten",
  "twilight",
  "festering",
  "alien",
  "fungal",
  "giant",
  "writhing",
  "pustulent",
  "rainbow",
  "possessed",
  "feral",
  "fiendish",
  "prismatic",
  "furry",
  "verbose",
  "psionic",
  "carnivorous",
  "mummified",
  "glowing",
  "snow",
  "drunken",
  "primordial",
  "majestic",
  "storm",
  "acid",
  "frost",
  "shadow",
  "doom",
  "celestial",
  "hollow",
  "mountain",
  "eight-legged",
  "one-eyed",
  "shambling",
  "weeping",
  "demented",
  "phantom",
  "ancient",
  "skeletal",
  "lightning",
  "thunder",
  "ravenous",
  "steam",
  "river",
  "ocean",
  "cloud",
  "star",
  "armored",
  "ferocious",
  "voodoo",
  "sea",
  "sand",
  "lava",
  "chaos",
  "solar",
  "lunar",
  "void",
  "mythical",
  "magma",
  "crystalline",
  "stone",
  "golden",
  "vampiric",
  "undead",
  "mutant",
  "polar",
  "swamp",
  "gnarled",
  "twisted",
  "toxic",
  "cave",
  "chocolate",
  "flatulent",
  "bloated",
  "insane",
  "metal",
  "deformed",
];
function getMonType(level) {
  if (level === "low") {
    return LLM[Math.floor(Math.random() * LLM.length)];
  }
  if (level === "mid") {
    return MLM[Math.floor(Math.random() * MLM.length)];
  }
  if (level === "high") {
    return HLM[Math.floor(Math.random() * HLM.length)];
  }

  // fallback: all monsters
  const allMonsters = [...LLM, ...MLM, ...HLM];
  return allMonsters[Math.floor(Math.random() * allMonsters.length)];
}
const montype = [
  ...LLM.map((m) => m.name),
  ...MLM.map((m) => m.name),
  ...HLM.map((m) => m.name),
];
function getTrap() {
  return trap[Math.floor(Math.random() * trap.length)];
}
const trap = [
  "poison dart",
  "swinging axe blade",
  "falling boulder",
  "poison gas",
  "rolling log",
  "moving wall",
  "spiked wall",
  "spiked pit",
  "electric shock",
  "incineration",
  "fireball",
  "ice spikes",
  "earthquake",
  "paralysis",
  "hallucination",
  "summon monster",
  "life drain",
  "sleeping gas",
  "mental daze",
  "spirit lock",
  "screaming baby",
  "blindness",
  "searing flame",
  "crumbling floor",
  "alarm",
];
function getMetal() {
  return metal[Math.floor(Math.random() * metal.length)];
}
const metal = [
  "copper",
  "bronze",
  "lead",
  "iron",
  "steel",
  "black steel",
  "silvered steel",
  "silver",
  "gold",
  "platinum",
  "mythril",
  "adamantine",
  "orichalchum",
  "dragon metal",
  "demonite",
  "angelite",
  "jewel-encrusted",
  "bone",
  "ivory",
  "ceramic",
  "crystal",
  "glass",
  "coral",
];
function getItemAdj() {
  return itemadj[Math.floor(Math.random() * itemadj.length)];
}
const itemadj = [
  "glowing",
  "magical",
  "finely crafted",
  "cheap",
  "deadly",
  "rusty",
  "broken",
  "superior",
  "legendary",
  "epic",
  "cursed",
  "blessed",
  "reinforced",
  "royal",
  "ominous",
  "holy",
  "evil",
  "mighty",
  "glimmering",
  "radiant",
  "glorious",
  "slimy",
  "impervious",
  "corrosive",
  "cruel",
  "menacing",
  "valiant",
  "vicious",
  "sturdy",
  "shining",
  "talking",
  "vorpal",
  "dainty",
  "razor-sharp",
  "heavy",
  "light",
  "engraved",
  "stunning",
  "ancient",
  "mythical",
  "mystical",
  "enchanted",
  "runic",
  "jeweled",
  "prismatic",
];
function getMetalItem() {
  return metalitem[Math.floor(Math.random() * metalitem.length)];
}
const metalitem = [
  "dagger",
  "knife",
  "throwing knife",
  "shuriken",
  "chakhram",
  "short sword",
  "longsword",
  "broadsword",
  "claymore",
  "zweihander",
  "bastard sword",
  "falchion",
  "rapier",
  "epee",
  "kukri",
  "trident",
  "katana",
  "wakizashi",
  "cutlass",
  "scimitar",
  "main gauche",
  "nodachi",
  "tanto",
  "naginata",
  "spear",
  "pike",
  "javelin",
  "hand axe",
  "battle axe",
  "halberd",
  "mace",
  "flail",
  "morningstar",
  "hammer",
  "pickaxe",
  "stiletto",
  "hatchet",
  "breastplate",
  "helmet",
  "horned helmet",
  "helm",
  "hauberk",
  "cuirass",
  "pair of gauntlets",
  "pair of bracers",
  "pair of greaves",
  "pair of vambraces",
  "pair of boots",
  "chainmail",
  "platemail",
  "scale mail",
  "shield",
  "spiked shield",
  "kite shield",
  "tower shield",
  "chalice",
  "goblet",
  "amulet",
  "necklace",
  "ring",
  "bracelet",
  "circlet",
  "crown",
  "sword-breaker",
];
function getLeather() {
  return leather[Math.floor(Math.random() * leather.length)];
}
const leather = [
  "leather",
  "studded leather",
  "brigandine",
  "snakeskin",
  "sharkskin",
];
function getLeatherItem() {
  return leatheritem[Math.floor(Math.random() * leatheritem.length)];
}
const leatheritem = [
  "breastplate",
  "cap",
  "hat",
  "jerkin",
  "jacket",
  "hauberk",
  "cuirass",
  "pair of gauntlets",
  "pair of gloves",
  "pair of bracers",
  "pair of greaves",
  "pair of vambraces",
  "pair of boots",
  "pair of shoes",
  "quiver",
  "whip",
  "belt",
  "buckler",
  "satchel",
  "backpack",
  "bag",
  "purse",
];
function getItemMod() {
  return itemmod[Math.floor(Math.random() * itemmod.length)];
}
const itemmod = [
  "doom",
  "flame",
  "ice",
  "frost",
  "lightning",
  "thunder",
  "storms",
  "poison",
  "venom",
  "acid",
  "the waves",
  "the wind",
  "earthquakes",
  "the sun",
  "the moon",
  "the stars",
  "the night",
  "the raven",
  "the wolf",
  "the falcon",
  "the bear",
  "the fox",
  "the llama",
  "the tiger",
  "the lion",
  "the eagle",
  "the owl",
  "the spider",
  "the platypus",
  "the penguin",
  "the dragon",
  "Heaven",
  "Hell",
  "the apocalypse",
  "darkness",
  "shadows",
  "light",
  "mystery",
  "Zeus",
  "Ares",
  "Hades",
  "Artemis",
  "Apollo",
  "Poseidon",
  "Hermes",
  "Hephaestus",
  "Aphrodite",
  "Kali",
  "Vishnu",
  "Shiva",
  "Ra",
  "Osiris",
  "Isis",
  "Bastet",
  "Horus",
  "Thoth",
  "Anubis",
  "Hathor",
  "Thor",
  "Odin",
  "Freyr",
  "Freya",
  "Loki",
  "Valhalla",
  "Nyx",
  "Cthulhu",
  "invisibility",
  "healing",
  "the deep",
  "slime",
  "flatulence",
  "thorns",
  "life stealing",
  "silence",
  "disruption",
  "seeking",
  "wailing",
  "karma",
  "fate",
  "time",
  "chaos",
  "magic draining",
  "vomiting",
  "dreams",
  "dragon slaying",
  "banish undead",
  "troll slaying",
  "goblin slaying",
  "orc slaying",
  "ogre slaying",
  "demon slaying",
  "the void",
  "immortality",
  "invincibility",
  "anger",
  "love",
  "war",
  "grief",
  "fear",
  "mercy",
  "nightmares",
  "gravity",
  "twilight",
  "plague",
  "hallucination",
];
function getWood() {
  return wood[Math.floor(Math.random() * wood.length)];
}
const wood = [
  "pine",
  "birch",
  "cherrywood",
  "chestnut",
  "oak",
  "spruce",
  "poplar",
  "beech",
  "applewood",
  "elm",
  "hickory",
  "larch",
  "mulberry",
  "cedar",
  "yew",
  "redwood",
  "ivory",
  "ebony",
  "bone",
  "teak",
  "mahogany",
];
function getWoodItem() {
  return wooditem[Math.floor(Math.random() * wooditem.length)];
}
const wooditem = [
  "shortbow",
  "longbow",
  "crossbow",
  "staff",
  "quarterstaff",
  "bo-staff",
  "round shield",
  "wand",
  "rod",
  "cudgel",
  "club",
  "spear",
  "flute",
  "box",
];

function getMagicItem() {
  return magicitem[Math.floor(Math.random() * magicitem.length)];
}
const magicitem = ["scroll", "spellbook", "staff", "wand", "potion", "ring"];

function getSpell() {
  return spell[Math.floor(Math.random() * spell.length)];
}
const spell = [
  "fireball",
  "magic missile",
  "ice spikes",
  "lightning",
  "earthquake",
  "rockslide",
  "wind gust",
  "tornado",
  "lava",
  "glacier",
  "acid rain",
  "holy flame",
  "sunburst",
  "plasma flare",
  "featherfall",
  "light",
  "reveal traps",
  "purify",
  "healing",
  "polymorph self",
  "polymorph other",
  "cure poison",
  "cure disease",
  "resurrect",
  "teleport",
  "locate stairs",
  "locate monsters",
  "invisibility",
  "summon monster",
  "water walking",
  "water breathing",
  "charm monster",
  "stone skin",
  "petrify",
  "open door",
  "astral projection",
  "protection from fire",
  "protection from ice",
  "protection from lightning",
  "protection from earth",
  "curse",
  "bless",
  "banish undead",
  "growth",
  "shrink",
  "animal friendship",
  "giant strength",
  "celerity",
  "transmutation",
  "language translation",
  "stun",
  "animate object",
  "plant control",
  "animal control",
];

function getElement() {
  return element[Math.floor(Math.random() * element.length)];
}
const element = [
  "fire",
  "ice",
  "frost",
  "water",
  "lightning",
  "wind",
  "earth",
  "acid",
  "poison",
  "holy",
  "evil",
  "chaos",
  "void",
  "steam",
  "fate",
  "time",
  "shadow",
  "doom",
  "light",
  "nature",
];

function getGem() {
  return gem[Math.floor(Math.random() * gem.length)];
}
const gem = [
  "diamond",
  "ruby",
  "emerald",
  "sapphire",
  "amethyst",
  "topaz",
  "opal",
  "onyx",
  "garnet",
  "peridot",
  "alexandrite",
  "amber",
  "jade",
  "aquamarine",
  "turquoise",
  "pearl",
  "beryl",
  "black pearl",
  "tourmaline",
  "bloodstone",
  "moonstone",
  "spinel",
  "zircon",
  "carnelian",
  "quartz",
  "chrysoberyl",
  "citrine",
  "agate",
  "kyanite",
  "jasper",
  "lapis lazuli",
  "malachite",
  "obsidian",
  "sunstone",
  "tanzanite",
];

function getJewelry() {
  return jewelry[Math.floor(Math.random() * jewelry.length)];
}
const jewelry = [
  "necklace",
  "bracelet",
  "ring",
  "pendant",
  "pair of earrings",
  "anklet",
  "circlet",
  "crown",
];

function getClothingColor() {
  return clcolor[Math.floor(Math.random() * clcolor.length)];
}
const clcolor = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "white",
  "black",
  "brown",
  "pink",
  "magenta",
  "maroon",
  "violet",
  "tangerine",
  "turquoise",
  "teal",
  "cyan",
  "cerulean",
  "chartreuse",
  "mauve",
  "fuchsia",
  "beige",
  "tan",
  "gray",
  "olive green",
  "goldenrod",
  "silver",
  "indigo",
  "forest green",
  "rainbow colored",
  "polka-dotted",
  "plaid",
  "paisley",
  "checkered",
  "striped",
  "khaki",
  "camouflage",
];

function getFabric() {
  return fabric[Math.floor(Math.random() * fabric.length)];
}
const fabric = [
  "cotton",
  "wool",
  "linen",
  "silk",
  "satin",
  "lace",
  "burlap",
  "cashmere",
  "spidersilk",
  "muslin",
  "taffeta",
  "brocade",
  "terrycloth",
  "felt",
  "velvet",
  "fur-lined",
  "hemp",
];

function getGarment() {
  return garment[Math.floor(Math.random() * garment.length)];
}
const garment = [
  "tunic",
  "pair of breeches",
  "loincloth",
  "doublet",
  "cloak",
  "wizards robe",
  "bathrobe",
  "surcoat",
  "tabard",
  "pair of trousers",
  "skirt",
  "dress",
  "gown",
  "pair of socks",
  "pair of gloves",
  "top hat",
  "waistcoat",
  "kilt",
  "cummerbund",
  "bowtie",
  "necktie",
  "tuxedo",
  "kimono",
  "karate gi",
  "pair of toe socks",
  "sarong",
  "scarf",
  "pair of legwarmers",
  "trenchcoat",
  "pair of shorts",
  "pair of leggings",
  "blouse",
  "sweater",
  "cardigan",
  "wizards hat",
  "feathered hat",
  "tutu",
  "cape",
];

function getMiscItem() {
  return misc[Math.floor(Math.random() * misc.length)];
}
const misc = [
  "a quiver of arrows",
  "some gold coins",
  "a pile of rations",
  "a cheese wheel",
  "a few apples",
  "a loaf of stale bread",
  "a magic lamp",
  "some torches",
  "a set of lockpicks",
  "a magical harp",
  "a half-eaten ham sandwich",
  "a roast turkey",
  "several carrots",
  "a fruitcake",
  "a crystal skull",
  "a stone tablet",
  "some runestones",
  "an empty flask",
  "a broom",
  "a pair of scissors",
  "a mop",
  "a clown nose",
  "a raven totem",
  "a pig totem",
  "a wolf totem",
  "a fox totem",
  "an eagle totem",
  "a roc feather",
  "a bat wing",
  "an old painting",
  "a tinderbox",
  "a lantern",
  "a treasure map",
  "a rope",
  "a violin",
  "a lute",
  "a shrunken head",
  "an accordion",
  "some magic beans",
];

function getLootPlace() {
  return lootplace[Math.floor(Math.random() * lootplace.length)];
}
const lootplace = [
  "You open an old wooden treasure chest and find",
  "In an old wooden chest, you find",
  "Peering into a dark corner, you see a dusty shelf containing",
  "You see something glinting in a dark alcove. Looking closer, you find",
  "You trip over",
  "In a pile of junk, you find",
  "You find a barrel containing",
  "You notice a large canvas bag lying around. Inside it, you find",
  "A stone seems to be missing from the wall. Inside the hole, you find",
  "You notice an ancient altar containing",
  "Lying atop an intricately carved pedestal, you see",
  "Finding an old clay pot lying around, you reach inside and pull out",
];
function getRandomItem() {
  return item[Math.floor(Math.random() * item.length)];
}
const item = [
  `${getItemAdj()} ${getMetal()} ${getMetalItem()}.`,
  `${getMetal()} ${getMetalItem()} of ${getItemMod()}.`,
  `${getItemAdj()} ${getMetal()} ${getMetalItem()} of ${getItemMod()}.`,
  `${getMetal()} ${getMetalItem()} of ${getElement()}.`,
  `${getMetal()} ${getMetalItem()} of protection from ${getElement()}.`,
  `${getMetal()} ${getMetalItem()} of ${getSpell()} `,
  `${getItemAdj()} ${getMetal()} ${getMetalItem()} of ${getElement()}.`,
  `${getItemAdj()} ${getMetal()} ${getMetalItem()} of protection from ${getElement()}.`,
  `${getItemAdj()} ${getMetal()} ${getMetalItem()} of ${getSpell()} `,
  `${getLeather()} ${getLeatherItem()}.`,
  `${getItemAdj()} ${getLeather()} ${getLeatherItem()}.`,
  `${getLeather()} ${getLeatherItem()} of ${getItemMod()}.`,
  `${getItemAdj()} ${getLeather()} ${getLeatherItem()} of ${getItemMod()}.`,
  `${getLeather()} ${getLeatherItem()} of ${getElement()}.`,
  `${getLeather()} ${getLeatherItem()} of protection from ${getElement()}.`,
  `${getLeather()} ${getLeatherItem()} of ${getSpell()}.`,
  `${getItemAdj()} ${getLeather()} ${getLeatherItem()} of ${getElement()}.`,
  `${getItemAdj()} ${getLeather()} ${getLeatherItem()} of protection from ${getElement()}.`,
  `${getItemAdj()} ${getLeather()} ${getLeatherItem()} of ${getSpell()}.`,
  `${getWood()} ${getWoodItem()}.`,
  `${getItemAdj()} ${getWood()} ${getWoodItem()}.`,
  `${getWood()} ${getWoodItem()} of ${getItemMod()}.`,
  `${getItemAdj()} ${getWood()} ${getWoodItem()} of ${getItemMod()}.`,
  `${getWood()} ${getWoodItem()} of ${getElement()}.`,
  `${getWood()} ${getWoodItem()} of protection from ${getElement()}.`,
  `${getWood()} ${getWoodItem()} of ${getSpell()}.`,
  `${getItemAdj()} ${getWood()} ${getWoodItem()} of ${getElement()}.`,
  `${getItemAdj()} ${getWood()} ${getWoodItem()} of protection from ${getElement()}.`,
  `${getItemAdj()} ${getWood()} ${getWoodItem()} of ${getSpell()}.`,
  `${getMagicItem()} of ${getSpell()}.`,
  `${getClothingColor()} orb of ${getElement()}.`,
  `${getClothingColor()} orb of ${getSpell()}.`,
  `${getMetal()} and ${getGem()} ${getJewelry()}.`,
  `${getLeather()} quiver full of ${getWood()} arrows.`,
  `${getClothingColor()} ${getFabric()} ${getGarment()}.`,
];

const playerevents = {
  npc: [
    `Suddenly you see the corpse of a ${getGender()} ${getRace()} ${getClass()} lying on the ground.Should you loot it for equipment ? `,
    `You see a ${getGender()} ${getRace()} ${getClass()} walking down the hall towards you.`,
    `You stumble across a ${getGender()} ${getRace()} ${getClass()} who seems very lost.`,
    `Suddenly a secret door opens and a ${getGender()} ${getRace()} ${getClass()} steps out of it.`,
    `You spot a strange altar at the end of the hall.As you approach, you notice a ${getGender()} ${getRace()} ${getClass()} standing there holding ${getMiscItem()}.`,
    `"Greetings, adventurer," says a ${getGender()} ${getRace()} ${getClass()}, stepping out from the shadows. "I seek a ${getRandomItem()}. There is one nearby, but it is hidden in a dangerous ${getMonAdj()} ${getMonType()} lair. If you retrieve it for me, you will be richly rewarded."`,
    `Entering the next room, you startle a ${getGender()} ${getRace()} ${getClass()}, who drops ${getMiscItem()} and runs away.`,
    `Entering the next room, you find a ${getGender()} ${getRace()} ${getClass()} chained to the wall.`,
    `Suddenly a ${getGender()} ${getRace()} ${getClass()} comes running down the hallway towards you, chased by a ${getMonAdj()} ${getMonType()}.`,
    `The sounds of battle reach your ears, and you find a ${getGender()} ${getRace()} ${getClass()} fighting a ${getMonAdj()} ${getMonType()} up ahead.`,
    `A noise catches your attention, and you turn to see a ${getGender()} ${getRace()} ${getClass()} opening a nearby treasure chest.`,
    `You spot a ${getGender()} ${getRace()} ${getClass()} resting in a secluded alcove. "Oh good, a hero," the person says with a sigh of relief. "A ${getMonAdj()} ${getMonType()} just beat me up and stole my ${getRandomItem()}. Can you help me get it back?"`,
    `You jump as the ghost of a ${getGender()} ${getRace()} ${getClass()} floats through a nearby wall.This must be one of the unlucky adventurers whose life was claimed by the dungeon.`,
    `You notice something moving off in the distance and decide to investigate.As you get closer, you realize it's a ${getGender()} ${getRace()} ${getClass()} dressed in a ${getClothingColor()} ${getFabric()} ${getGarment()}.`,
    `Off in the distance, you see a ${getGender()} ${getRace()} ${getClass()} struggling to open a locked door.`,
    `You spot a male ${getRace()} ${getClass()} across the room. He appears to be wearing a ${getMetal()} and ${getGem()} ${getJewelry()}.`,
    `You spot a female ${getRace()} ${getClass()} across the room. She appears to be wearing a ${getMetal()} and ${getGem()} ${getJewelry()}.`,
    `Hearing footsteps nearby, you ready your weapon, but relax a moment later when the source of the noise walks into view. Whew, it's only a ${getGender()} ${getRace()} ${getClass()}!`,
  ],
  monster: {
    low: [
      `You see a ${getMonAdj()} ${getMonType("low")} step out from around a corner in front of you.`,
      `You hear a noise behind you and turn around. Oh no, it's a ${getMonAdj()} ${getMonType("low")}!`,
      `You see a ${getMonAdj()} ${getMonType("low")} lying on the floor. It appears to be dead.`,
      `You hear the cries of a ${getMonAdj()} ${getMonType("low")} in the distance.`,
      `You find a ${getMonAdj()} ${getMonType("low")} dressed in an ill-fitting ${getClothingColor()} ${getFabric()} ${getGarment()} rooting through some trash.`,
      `You see a treasure chest in the next room. Unfortunately, it's guarded by a ${getMonAdj()} ${getMonType("low")}.`,
      `Investigating a strange noise, you find a ${getMonAdj()} ${getMonType("low")} trapped inside an old cage.`,
      `A startled ${getMonAdj()} ${getMonType("low")} shrieks and runs away as soon as it notices you.`,
      `A sign on the wall reads: "Beware of the ${getMonAdj()} ${getMonType("low")}."`,
      `You spot a ${getMonAdj()} ${getMonType("low")} skulking through the shadows.`,
      `A ${getMonAdj()} ${getMonType("low")} drops a ${getMetal()} and ${getGem()} ${getJewelry()} and flees.`,
      `A ${getMonAdj()} ${getMonType("low")} drops ${getMiscItem()} before scrambling away.`,
      `You’ve wandered into a den of ${getMonAdj()} ${getMonType("low")}s.`,
      `A foul odor wafts through the air… must be a ${getMonAdj()} ${getMonType("low")} nearby.`,
      `Up ahead, a ${getMonAdj()} ${getMonType("low")} hasn’t noticed you yet.`,
      `A ${getMonAdj()} ${getMonType("low")} accidentally triggers a ${getTrap()} trap nearby!`,
      `You bend down to open a chest — but a ${getMonAdj()} ${getMonType("low")} lunges out at you!`,
    ],

    mid: [
      // --- More MLM mid-level content ---
      `A ${getMonAdj()} ${getMonType("mid")} emerges from between two shifting stone walls.`,
      `You freeze as a ${getMonAdj()} ${getMonType("mid")} phases partially through the floor.`,
      `A ${getMonAdj()} ${getMonType("mid")} prowls the corridor, its eyes glinting with malice.`,
      `You hear cracking stone — a ${getMonAdj()} ${getMonType("mid")} is forcing its way through a wall.`,
      `You spot a ${getMonAdj()} ${getMonType("mid")} performing a strange ritual with glowing dust.`,
      `You hear whispering voices, then a ${getMonAdj()} ${getMonType("mid")} materializes in front of you.`,
      `A ${getMonAdj()} ${getMonType("mid")} is inspecting a broken ${getMetal()} idol.`,
      `A low growl echoes — a ${getMonAdj()} ${getMonType("mid")} stalks you from the shadows.`,
      `You catch a ${getMonAdj()} ${getMonType("mid")} carving runes into the dungeon wall.`,
      `A ${getMonAdj()} ${getMonType("mid")} drags a heavy chest across the floor, leaving deep grooves.`,
      `You almost trip over a heap of bones — then a ${getMonAdj()} ${getMonType("mid")} rises from within it.`,
      `A strange hum fills the air. A ${getMonAdj()} ${getMonType("mid")} is siphoning energy from a crystal.`,
      `You peer around a corner and lock eyes with a ${getMonAdj()} ${getMonType("mid")} guarding a collapsed hallway.`,
      `A ${getMonAdj()} ${getMonType("mid")} carefully sorts through piles of discarded gear.`,
      `The air shimmers as a ${getMonAdj()} ${getMonType("mid")} partially dematerializes.`,
      `You see the silhouette of a ${getMonAdj()} ${getMonType("mid")} performing combat drills.`,
      `A trapped ${getMonAdj()} ${getMonType("mid")} glares at you as if daring you to approach.`,
      `You hear runic chanting. A ${getMonAdj()} ${getMonType("mid")} is summoning something best left unseen.`,
      `A ${getMonAdj()} ${getMonType("mid")} notices you and clutches a glowing ${getGem()} tightly.`,
      `You follow a trail of melted stone and find a ${getMonAdj()} ${getMonType("mid")} responsible for it.`,
    ],

    high: [
      // --- EVEN MORE HLM high-level content ---
      `A surge of arcane pressure surrounds you as a ${getMonAdj()} ${getMonType("high")} descends from above.`,
      `Reality flickers — a ${getMonAdj()} ${getMonType("high")} steps through a crack in the air.`,
      `The ground shakes violently. A ${getMonAdj()} ${getMonType("high")} approaches.`,
      `You hear a thunderous roar: a ${getMonAdj()} ${getMonType("high")} demands your attention.`,
      `You stumble upon a dormant ${getMonAdj()} ${getMonType("high")} surrounded by ancient relics.`,
      `A ${getMonAdj()} ${getMonType("high")} is devouring the essence of a fallen creature.`,
      `An oppressive aura weighs you down — a ${getMonAdj()} ${getMonType("high")} watches you silently.`,
      `A ${getMonAdj()} ${getMonType("high")} floats above the ground, surrounded by swirling matter.`,
      `Space distorts violently as a ${getMonAdj()} ${getMonType("high")} tears through dimensional fabric.`,
      `Pillars of light erupt around a ${getMonAdj()} ${getMonType("high")} performing an eldritch ritual.`,
      `You witness a ${getMonAdj()} ${getMonType("high")} effortlessly reshape stone with a gesture.`,
      `The walls crack as a ${getMonAdj()} ${getMonType("high")} flexes its impossible strength.`,
      `A ${getMonAdj()} ${getMonType("high")} guards a floating crystalline heart of the dungeon.`,
      `You watch a ${getMonAdj()} ${getMonType("high")} consume a spell and grow stronger.`,
      `A chilling silence falls… then a ${getMonAdj()} ${getMonType("high")} materializes right beside you.`,
      `You see a ${getMonAdj()} ${getMonType("high")} wearing ceremonial ${getClothingColor()} robes obtained from a forgotten empire.`,
      `A ${getMonAdj()} ${getMonType("high")} grips a colossal ${getMetal()} weapon crackling with raw power.`,
      `You enter a chamber filled with remains — the work of a ${getMonAdj()} ${getMonType("high")}.`,
      `A ${getMonAdj()} ${getMonType("high")} hovers silently, its many eyes studying every move you make.`,
      `The air vibrates as a ${getMonAdj()} ${getMonType("high")} invokes an ancient spell.`,
      `A ${getMonAdj()} ${getMonType("high")} raises a hand — gravity itself bends.`,
      `You watch in awe as a ${getMonAdj()} ${getMonType("high")} constructs a magical barrier with ease.`,
    ],
  },
  loot: [
    `${getLootPlace()} a small ${getWood()} figurine of a ${getGender()} ${getRace()}`,
    `${getLootPlace()} ${getMiscItem()}.`,
    `${getLootPlace()} a ${getMetal()} ${getMetalItem()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getMetal()} ${getMetalItem()}.`,
    `${getLootPlace()} a ${getMetal()} ${getMetalItem()} of ${getItemMod()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getMetal()} ${getMetalItem()} of ${getItemMod()}.`,
    `${getLootPlace()} a ${getMetal()} ${getMetalItem()} of ${getElement()}.`,
    `${getLootPlace()} a ${getMetal()} ${getMetalItem()} of protection from ${getElement()}.`,
    `${getLootPlace()} a ${getMetal()} ${getMetalItem()} of ${getSpell()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getMetal()} ${getMetalItem()} of ${getElement()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getMetal()} ${getMetalItem()} of protection from ${getElement()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getMetal()} ${getMetalItem()} of ${getSpell()}.`,
    `${getLootPlace()} a ${getLeather()} ${getLeatherItem()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getLeather()} ${getLeatherItem()}.`,
    `${getLootPlace()} a ${getLeather()} ${getLeatherItem()} of ${getItemMod()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getLeather()} ${getLeatherItem()} of ${getItemMod()}.`,
    `${getLootPlace()} a ${getLeather()} ${getLeatherItem()} of ${getElement()}.`,
    `${getLootPlace()} a ${getLeather()} ${getLeatherItem()} of protection from ${getElement()}.`,
    `${getLootPlace()} a ${getLeather()} ${getLeatherItem()} of ${getSpell()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getLeather()} ${getLeatherItem()} of ${getElement()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getLeather()} ${getLeatherItem()} of protection from ${getElement()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getLeather()} ${getLeatherItem()} of ${getSpell()}.`,
    `${getLootPlace()} a ${getWood()} ${getWoodItem()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getWood()} ${getWoodItem()}.`,
    `${getLootPlace()} a ${getWood()} ${getWoodItem()} of ${getItemMod()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getWood()} ${getWoodItem()} of ${getItemMod()}.`,
    `${getLootPlace()} a ${getWood()} ${getWoodItem()} of ${getElement()}.`,
    `${getLootPlace()} a ${getWood()} ${getWoodItem()} of protection from ${getElement()}.`,
    `${getLootPlace()} a ${getWood()} ${getWoodItem()} of ${getSpell()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getWood()} ${getWoodItem()} of ${getElement()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getWood()} ${getWoodItem()} of protection from ${getElement()}.`,
    `${getLootPlace()} a ${getItemAdj()} ${getWood()} ${getWoodItem()} of ${getSpell()}.`,
    `${getLootPlace()} a ${getMagicItem()} of ${getSpell()}.`,
    `${getLootPlace()} a ${getClothingColor()} orb. It seems to have power over the element of ${getElement()}.`,
    `${getLootPlace()} a ${getClothingColor()} orb of ${getSpell()}.`,
    `${getLootPlace()} a ${getMetal()} and ${getGem()} ${getJewelry()}.`,
    `${getLootPlace()} a ${getLeather()} quiver full of ${getWood()} arrows.`,
    `${getLootPlace()} a ${getClothingColor()} ${getFabric()} ${getGarment()}.`,
    `${getLootPlace()} a ${getMetal()} key. You wonder what it opens.`,
  ],
  trap: [
    `You feel something shift beneath your feet and your stomach clenches with dread. It's a ${getTrap()} trap!`,
    `Oops! You trip and fall, triggering a ${getTrap()} trap.`,
    `You stop abruptly as you realize there's a tripwire in front of you. It seems to be attached to a ${getTrap()} trap.`,
    `You pause to lean against the wall, only to regret it a moment later when you hear a ${getTrap()} trap go off.`,
    `You hear an ominous click. Oh no, you've triggered a ${getTrap()} trap!`,
    `As you brush your hand along the wall, you hear an ominous click and realize with horror that you've triggered a ${getTrap()} trap.`,
  ],
  desc: [
    `A strange painting depicting ${getMiscItem()} hangs on the wall before you.`,
    `You see a treasure chest in the next room.`,
    `You notice a piece of paper on the floor. It seems to be a note.`,
    `You hear an eerie noise in the distance.`,
    `You hear a scream echoing eerily through the shadowy corridors.`,
    `The torchlight flickers eerily on the stone walls.`,
    `You hear footsteps echoing eerily along the ancient corridors. Someone -- or something -- must be nearby.`,
    `Your movements kick up a cloud of ancient dust, and you sneeze.`,
    `The stones of the floor are cracked and worn, as if many feet have passed here.`,
    `You hear water dripping somewhere in the distance.`,
    `Something golden gleams at the edge of the torchlight.`,
    `You notice a strange sigil on the wall in front of you. Could there be a secret door here?`,
    `There's a lever on the wall in front of you. You wonder if it opens a secret door...or triggers a trap.`,
    `You hear a rumbling noise and the wall in front of you slides open. It's a secret door!`,
    `Suddenly the floor ahead of you opens up and you nearly plummet into the shadows below.`,
    `You see a mysterious ${getClothingColor()} button on the wall in front of you.`,
    `A stone in the wall seems to be loose.`,
    `You spot a hole in the wall just big enough to put your hand in.`,
    `You see an alcove with a ladder going up.`,
    `The torchlight flickers, revealing a ladder going down.`,
    `You notice a trapdoor set into the floor.`,
    `You notice a trapdoor set into the ceiling.`,
    `In the corner of the room, you spot some stairs going up.`,
    `Behind a glowing ${getClothingColor()} magical barrier, you catch a glimpse of some stairs going down.`,
    `Behind a glowing ${getClothingColor()} magical barrier, you catch a glimpse of some stairs going up.`,
    `In the distance, you spot some stairs going down. Unfortunately, they seem to be guarded by a ${getMonAdj()} ${getMonType()}.`,
    `In the distance, you spot some stairs going up. Unfortunately, they seem to be guarded by a ${getMonAdj()} ${getMonType()}.`,
    `You spot a wooden door in the wall. It seems to be locked.`,
    `You spot an iron door in the wall. It seems to be locked.`,
    `In an out-of-the-way corner of the room, you spot a gem-encrusted golden door. It must have something really good behind it!`,
    `You notice an old wooden door with rusted chains across it.`,
    `Off in the distance, you notice a wooden door reinforced by metal bands. You wonder what could be in there.`,
    `A tapestry depicting a ${getGender()} ${getRace()} ${getClass()} fighting a ${getMonAdj()} ${getMonType()} hangs on the wall before you.`,
    `Farther ahead, you spot a statue of a ${getGender()} ${getRace()} ${getClass()}.`,
    `In the center of the room, you spot a gigantic glowing ${getGem()}.`,
    `A ${getGem()}-encrusted ${getWood()} treasure chest sits in an out-of-the-way corner of the room.`,
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// Refactored Dungeon Controller
// ──────────────────────────────────────────────────────────────────────────────

// ASCII Map Key Reference
const DUNGEON_ASCII_KEY = {
  // Structural Elements
  "#": { name: "Wall", type: "solid", passable: false },
  ".": { name: "Floor", type: "floor", passable: true },
  "+-+": { name: "Door", type: "door", passable: true },
  "+": { name: "Exit", type: "exit", passable: true },
  0: { name: "Pillar", type: "obstacle", passable: false },

  // Furniture & Objects
  "T°": { name: "Table", type: "furniture", passable: false },
  "C°": { name: "Chair", type: "furniture", passable: false },
  "S°": { name: "Shelf/Storage", type: "storage", passable: false },
  "A°": { name: "Altar", type: "special", passable: false },
  "F°": { name: "Fountain", type: "special", passable: false },
  G: { name: "Guard/Bar", type: "npc", passable: false },
  "X°": { name: "Sarcophagus", type: "special", passable: false },
  B: { name: "Boss Platform", type: "special", passable: true },
  BS: { name: "Boss", type: "enemy", passable: false },
  _m_: { name: "Monster", type: "enemy", passable: false },

  // Environmental
  "~": { name: "Water", type: "hazard", passable: false },
  "=": { name: "Lava", type: "hazard", passable: false },
  "@": { name: "Arena Marker", type: "marker", passable: true },

  // Special Features
  "[]°": { name: "Mirror", type: "special", passable: false },
  "▒": { name: "Secret Door", type: "door", passable: false, hidden: true },
  "D]": { name: "Locked Door", type: "door", passable: false, locked: true },
  "<": { name: "Stairs Down", type: "stairs", passable: true },
  ">": { name: "Stairs Up", type: "stairs", passable: true },
  r: { name: "Statue", type: "obstacle", passable: false },
  "|>": { name: "Lever/Switch", type: "interactive", passable: true },
  h: { name: "Bed/Barracks", type: "furniture", passable: false },
  _: { name: "Pit/Void", type: "hazard", passable: false },
  "|": { name: "N,S Open Space", type: "passage", passable: true },
  "--": { name: "W,E Open Space", type: "passage", passable: true },
  "©": { name: "Treasure/Crystal", type: "loot", passable: true },
  "P°": { name: "Heavy Door", type: "door", passable: false, locked: true },
  "£": { name: "Exit to Next Level", type: "exit", passable: true },

  // Puzzle Elements
  1: { name: "Puzzle Piece 1", type: "puzzle", passable: true },
  2: { name: "Puzzle Piece 2", type: "puzzle", passable: true },
  3: { name: "Puzzle Piece 3", type: "puzzle", passable: true },
  4: { name: "Puzzle Piece 4", type: "puzzle", passable: true },
  5: { name: "Puzzle Piece 5", type: "puzzle", passable: true },
  6: { name: "Puzzle Piece 6", type: "puzzle", passable: true },
  7: { name: "Puzzle Piece 7", type: "puzzle", passable: true },
  8: { name: "Puzzle Piece 8", type: "puzzle", passable: true },
  9: { name: "Puzzle Piece 9", type: "puzzle", passable: true },
};

// Area Type Keys (Omnidirectional)
const AREA_TYPE_KEYS = {
  "*C": { name: "Cave", type: "environment", difficulty: "medium" },
  "*T": { name: "Tunnel", type: "environment", difficulty: "low" },
  "*D": { name: "Dungeon", type: "environment", difficulty: "high" },
  "*U": { name: "Underground", type: "environment", difficulty: "medium" },
  "*F": { name: "Forest", type: "environment", difficulty: "low" },
  "*M": { name: "Mountain", type: "environment", difficulty: "high" },
  "*R": { name: "Ruin", type: "environment", difficulty: "high" },
  "*L": { name: "Lair", type: "environment", difficulty: "very_high" },
};

// Initialize dungeon storage under state.world.dungeon
function initDungeon() {
  ensureWorldState();
  const dg = state.world.dungeon;
  if (!dg.grid) {
    dg.name = "Underground Labyrinth";
    dg.floor = 1;
    dg.rows = 8;
    dg.cols = 5;
    dg.playerPosition = { row: 1, col: "A" };
    dg.grid = {};

    for (let row = 1; row <= dg.rows; row++) {
      for (let colIndex = 0; colIndex < dg.cols; colIndex++) {
        const col = String.fromCharCode(65 + colIndex); // A-E
        const key = `${row}${col}`;
        dg.grid[key] = {
          type: "empty",
          description: "Empty corridor",
          explored: false,
          items: [],
          enemies: [],
          hazards: [],
        };
      }
    }
    dg.generatedAt = Date.now();
  }
}

// Generate dungeon content
function generateDungeon() {
  ensureWorldState();
  const dg = state.world.dungeon;
  if (dg.grid && Object.keys(dg.grid).length > 0 && dg.generatedAt) {
    return dg;
  }

  dg.name = "Underground Labyrinth";

  // Room types with probabilities
  const roomTypes = [
    { type: "combat", weight: 4, description: "Combat chamber" },
    { type: "treasure", weight: 2, description: "Treasure room" },
    { type: "rest", weight: 1, description: "Rest area" },
    { type: "puzzle", weight: 1, description: "Puzzle room" },
    { type: "trap", weight: 1, description: "Trap room" },
    { type: "merchant", weight: 1, description: "Merchant stall" },
    { type: "boss", weight: 1, description: "Boss chamber" },
  ];

  // Calculate total weight for random selection
  const totalWeight = roomTypes.reduce((sum, room) => sum + room.weight, 0);

  // Fill grid with rooms
  Object.keys(dg.grid).forEach((key) => {
    // Skip player starting position
    if (key === "1A") {
      dg.grid[key] = {
        type: "start",
        description: "Starting chamber",
        explored: true,
        items: [],
        enemies: [],
        hazards: [],
      };
      return;
    }

    // Randomly select room type based on weights
    let random = Math.random() * totalWeight;
    let selectedType = roomTypes[0];

    for (const roomType of roomTypes) {
      if (random < roomType.weight) {
        selectedType = roomType;
        break;
      }
      random -= roomType.weight;
    }

    // Create room with specific elements
    const room = createDungeonRoom(selectedType.type, selectedType.description);
    dg.grid[key] = room;
  });

  // Add stairs to next floor (always at the bottom-right)
  // The dungeon exist needs to be random not always at the bottom-right, but for simplicity, we place it at 8E
  dg.grid["8E"] = {
    type: "exit",
    description: "Stairs to next floor",
    explored: false,
    items: [],
    enemies: [],
    hazards: [],
  };

  return dg;
}

// Create a specific dungeon room
function createDungeonRoom(type, description) {
  const room = {
    type,
    description,
    explored: false,
    items: [],
    enemies: [],
    hazards: [],
  };

  // Add specific elements based on room type
  switch (type) {
    case "combat":
      room.enemies = generateRandomEnemies(1 + Math.floor(Math.random() * 2));
      room.description = `A ${description} with enemies`;
      break;
    case "treasure":
      room.items = generateRandomLoot(1 + Math.floor(Math.random() * 3));
      room.description = `A ${description} with valuable items`;
      break;
    case "rest":
      room.items = [
        { name: "Health Potion", type: "consumable", effect: { health: 30 } },
      ];
      room.description = `A ${description} with healing items`;
      break;
    case "puzzle":
      room.hazards = ["rune puzzle"];
      room.description = `A ${description} with ancient runes`;
      break;
    case "trap":
      room.hazards = [
        ["spikes", "poison dart", "falling rocks"][
          Math.floor(Math.random() * 3)
        ],
      ];
      room.description = `A ${description} with dangerous traps`;
      break;
    case "merchant":
      room.items = generateRandomLoot(3 + Math.floor(Math.random() * 2)).map(
        (item) => ({
          ...item,
          price: Math.floor(item.value * 1.5),
        }),
      );
      room.description = `A ${description} with wares for sale`;
      break;
    case "boss":
      room.enemies = generateRandomEnemies(1, true);
      room.items = generateRandomLoot(3 + Math.floor(Math.random() * 2));
      room.description = `A ${description} with a powerful boss`;
      break;
  }

  return room;
}

// Generate random enemies
function generateRandomEnemies(count, isBoss = false) {
  const enemies = [];
  const monsterTypes = isBoss
    ? ["Dragon", "Demon Lord", "Giant Troll", "Dark Knight"]
    : ["Goblin", "Orc", "Skeleton", "Wolf", "Bandit", "Spider"];

  for (let i = 0; i < count; i++) {
    const monster =
      monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
    enemies.push({
      name: monster,
      level: isBoss ? 10 : 1 + Math.floor(Math.random() * 5),
      health: isBoss ? 200 : 20 + Math.floor(Math.random() * 30),
      damage: isBoss ? 20 : 5 + Math.floor(Math.random() * 5),
    });
  }

  return enemies;
}

// Build dungeon string for AI Dungeon story card
function buildDungeonString() {
  ensureWorldState();
  const dg = state.world.dungeon;
  if (!dg.grid) {
    generateDungeon();
  }
  const grid = dg.grid || {};

  let dungeonString = `[Dungeon: ${dg.name} - Floor ${dg.floor}]\n\n`;
  dungeonString += `Grid: ${dg.rows} rows x ${dg.cols} columns (A-E)\n`;
  dungeonString += `Player Position: Row ${dg.playerPosition.row}, Column ${dg.playerPosition.col}\n\n`;

  // Room legend
  dungeonString += `Room Types Legend:\n`;
  dungeonString += `- S: Starting Chamber\n`;
  dungeonString += `- C: Combat Chamber\n`;
  dungeonString += `- T: Treasure Room\n`;
  dungeonString += `- R: Rest Area\n`;
  dungeonString += `- P: Puzzle Room\n`;
  dungeonString += `- X: Trap Room\n`;
  dungeonString += `- M: Merchant Stall\n`;
  dungeonString += `- B: Boss Chamber\n`;
  dungeonString += `- E: Exit/Stairs\n\n`;

  // Grid representation
  dungeonString += `Dungeon Map:\n`;
  dungeonString += `   A  B  C  D  E\n`;
  dungeonString += `  ───────────────\n`;

  for (let row = 1; row <= dg.rows; row++) {
    let rowStr = `${row} |`;
    for (let colIndex = 0; colIndex < dg.cols; colIndex++) {
      const col = String.fromCharCode(65 + colIndex);
      const key = `${row}${col}`;
      const room = grid[key];

      let symbol = " ";
      switch (room.type) {
        case "start":
          symbol = "S";
          break;
        case "combat":
          symbol = "C";
          break;
        case "treasure":
          symbol = "T";
          break;
        case "rest":
          symbol = "R";
          break;
        case "puzzle":
          symbol = "P";
          break;
        case "trap":
          symbol = "X";
          break;
        case "merchant":
          symbol = "M";
          break;
        case "boss":
          symbol = "B";
          break;
        case "exit":
          symbol = "E";
          break;
      }

      rowStr += ` ${symbol} `;
    }
    dungeonString += `${rowStr}|\n`;
  }

  dungeonString += `  ───────────────\n\n`;

  // Detailed room descriptions
  dungeonString += `Room Details:\n`;
  Object.keys(grid).forEach((key) => {
    const room = grid[key];
    if (room.explored || room.type === "start") {
      dungeonString += `\n${key}: ${room.description}`;
      if (room.enemies.length > 0) {
        dungeonString += ` | Enemies: ${room.enemies.map((e) => `${e.name} (Lvl ${e.level})`).join(", ")}`;
      }
      if (room.items.length > 0) {
        dungeonString += ` | Items: ${room.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}`;
      }
      if (room.hazards.length > 0) {
        dungeonString += ` | Hazards: ${room.hazards.join(", ")}`;
      }
    }
  });

  return dungeonString;
}

// Update dungeon story card
function updateDungeonCard() {
  ensureWorldState();
  const dungeonString = buildDungeonString();
  const dg = state.world.dungeon;
  const card = CommunityUtils.StoryCards.find(dg.cardKey || "dungeon_map", true, dungeonString, "Dungeon");
  if (card) {
    CommunityUtils.StoryCards.setSettings(card, "Floor", dg.floor);
    CommunityUtils.StoryCards.setSettings(card, "Position", `${dg.playerPosition.row}${dg.playerPosition.col}`);
  }
}

// Player movement within the dungeon grid
//The player movement should not be tracked but for now its okay to track it in the state.world.dungeon.playerPosition for the sake of the dungeon map and story card updates. In future iterations, we can remove this tracking if needed.
// The player can move north, south, east, or west within the grid. Movement is blocked by walls and boundaries.
function movePlayer(direction) {
  ensureWorldState();
  const dg = state.world.dungeon;
  if (!dg.grid) {
    generateDungeon();
  }
  const { row, col } = dg.playerPosition;
  let newRow = row;
  let newCol = col;

  switch (direction.toLowerCase()) {
    case "north":
      newRow = Math.max(1, row - 1);
      break;
    case "south":
      newRow = Math.min(dg.rows, row + 1);
      break;
    case "east":
      newCol = String.fromCharCode(Math.min(69, col.charCodeAt(0) + 1)); // E is 69
      break;
    case "west":
      newCol = String.fromCharCode(Math.max(65, col.charCodeAt(0) - 1)); // A is 65
      break;
  }

  // Mark new position as explored
  const newKey = `${newRow}${newCol}`;
  if (dg.grid[newKey]) {
    dg.grid[newKey].explored = true;
    dg.playerPosition = { row: newRow, col: newCol };
    updateDungeonCard();
    return true;
  }

  return false;
}

// Get current room
function getCurrentRoom() {
  ensureWorldState();
  const dg = state.world.dungeon;
  if (!dg.grid) return null;
  const key = `${dg.playerPosition.row}${dg.playerPosition.col}`;
  return dg.grid[key];
}

// Initialize and generate dungeon on first use

// Command: show map (grid-based view)
function showDungeonMap() {
  ensureWorldState();
  const dg = state.world.dungeon;
  if (!dg.grid || Object.keys(dg.grid).length === 0) {
    generateDungeon();
  }

  updateDungeonCard();
  return buildDungeonString();
}

function createRoom(type, floor, playerLevel, roomNumber) {
  const base = {
    id: roomNumber,
    type: type,
    cleared: false,
    visited: false,
  };

  switch (type) {
    case "combat":
      return {
        ...base,
        // Placeholder — will be filled by your procedural monster generator
        description: "A dark chamber with signs of recent battle...",
        enemies: [], // ← procedural generation goes here
        difficulty: Math.min(1 + floor * 0.4, 5),
      };

    case "boss":
      return {
        ...base,
        description: "The air grows heavy... something powerful awaits.",
        isBoss: true,
        // ← boss generation placeholder
        boss: null, // e.g. { name, level, abilities }
      };

    case "treasure":
      const numItems = 1 + Math.floor(Math.random() * 3);
      const treasures = [];
      for (let i = 0; i < numItems; i++) {
        treasures.push(generateDynamicLoot(playerLevel));
      }
      return {
        ...base,
        description: "A gleaming chest sits in the corner...",
        gold: Math.floor(40 + Math.random() * 120 * (1 + floor * 0.25)),
        items: treasures,
      };

    case "event":
      return {
        ...base,
        ...getRandomEvent(), // from your event pool
      };

    case "merchant":
      return {
        ...base,
        description: "A hooded figure offers wares in the shadows.",
        itemsForSale: Array.from(
          { length: 3 + Math.floor(Math.random() * 2) },
          () => generateDynamicLoot(playerLevel * 1.1),
        ),
      };

    case "rest":
      return {
        ...base,
        description: "A small safe alcove with a flickering campfire.",
        healPercent: 40 + Math.floor(Math.random() * 30),
      };

    case "trap":
      return {
        ...base,
        description: "The floor feels... wrong.",
        trapType: ["spikes", "poison dart", "falling rocks", "curse cloud"][
          Math.floor(Math.random() * 4)
        ],
        damagePercent: 15 + Math.floor(Math.random() * 25),
      };

    case "puzzle":
      return {
        ...base,
        description: "Strange runes and mechanisms block the way.",
        puzzleType: ["lever", "riddle", "symbol match", "pressure plates"][
          Math.floor(Math.random() * 4)
        ],
        // You can add solution & reward later
      };

    case "exit":
      return {
        ...base,
        description: "A heavy stone door leads upward... freedom?",
        isExit: true,
        leadsTo: floor + 1,
      };

    default:
      return {
        ...base,
        type: "combat",
        description: "Empty suspicious room...",
      };
  }
}

 // ──────────────────────────────────────────────────────────────────────────────
// Storage & Display Helpers
// ──────────────────────────────────────────────────────────────────────────────
function saveDungeonMap(mapData) {
  ensureWorldState();
  // Store the entire map as JSON in state.world.dungeon.activeMap
  const dg = state.world.dungeon;
  dg.activeMap = mapData;
  // Optional: also store shorter version for quick access
  dg.currentFloorSummary = `${mapData.dungeon} - Floor ${mapData.floor} | ${mapData.rooms.length} rooms`;
}

function getDungeonMap() {
  ensureWorldState();
  const dg = state.world.dungeon;
  const raw = dg.activeMap;
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error(
      `getDungeonMap: stored dungeon map is corrupted and could not be parsed: ${e && e.message ? e.message : e}`,
    );
    return null;
  }
}

// Command: /map detailed (room-list view)
function showDungeonMapDetailed() {
  const map = getDungeonMap();
  if (!map) return "No dungeon map has been generated yet.";

  let output = `╭───────────── ${map.dungeon.toUpperCase()} ─ Floor ${map.floor} ─────────────╮\n`;
  output += `Layout: ${map.layoutStyle}   Rooms: ${map.rooms.length}\n`;
  output += `╰───────────────────────────────────────────────────────────────╯\n\n`;

  map.rooms.forEach((room, idx) => {
    const status = room.cleared ? "[✓] " : room.visited ? "[ ] " : "[?] ";
    const prefix = idx === map.currentRoomIndex ? "→ " : "  ";

    output += `${prefix}${status}Room ${room.id}: ${room.description}\n`;

    if (room.type === "combat" || room.type === "boss") {
      output += `   Threat level: ${room.difficulty?.toFixed(1) || "?"}\n`;
    }
    if (room.isExit) {
      output += `   → Leads to Floor ${room.leadsTo}\n`;
    }
    output += "\n";
  });

  return output;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility functions (add your own implementations)
// ──────────────────────────────────────────────────────────────────────────────

function getRandomLayoutStyle() {
  const styles = [
    "Linear tunnel",
    "Sprawling maze",
    "Circular ring",
    "Branching crossroads",
    "Collapsed ruins",
    "Flooded passages",
  ];
  return styles[Math.floor(Math.random() * styles.length)];
}

function getRandomNonExitType() {
  const types = [
    "combat",
    "treasure",
    "event",
    "rest",
    "merchant",
    "trap",
    "puzzle",
  ];
  return types[Math.floor(Math.random() * types.length)];
}

function getRandomEvent() {
  // Your existing event pool - pick one randomly
  const events = [
    /* your event objects here */
  ];
  return events[Math.floor(Math.random() * events.length)];
}

// ──────────────────────────────────────────────────────────────────────────────
// Usage example / initialization
// ──────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
//DUNGEON MAP GENERATOR & STORAGE SYSTEM
// ═══════════════════════════════════════════════════════════════

// Dungeon Room Prefabs
const DUNGEON_PREFABS = {
  // TINY ROOMS
  1: {
    name: "Tiny Room",
    size: "3x3",
    difficulty: "trivial",
    map: ["###", "#..+", "###"],
    exits: 1,
    features: [],
  },

  // SMALL ROOMS
  2: {
    name: "Small Square",
    size: "5x5",
    difficulty: "easy",
    map: ["#####", "#...#", "#...#", "#...+", "#####"],
    exits: 1,
    features: [],
  },

  3: {
    name: "Small Room with Door",
    size: "5x5",
    difficulty: "easy",
    map: ["#####", "#...#", "#...+-+", "#...#", "#####"],
    exits: 1,
    features: ["door"],
  },

  4: {
    name: "Small Alcove Room",
    size: "5x5",
    difficulty: "easy",
    map: ["#####", "#.#.#", "#...+", "#.#.#", "#####"],
    exits: 1,
    features: ["alcove"],
  },

  5: {
    name: "Small Cross",
    size: "5x5",
    difficulty: "easy",
    map: ["#+#+#", "..#..", "+#.++", "..#..", "#+#+#"],
    exits: 4,
    features: ["crossroads"],
  },

  // MEDIUM ROOMS
  6: {
    name: "Crossroads",
    size: "7x7",
    difficulty: "medium",
    map: [
      "###+###",
      "###.###",
      "###.###",
      "+.....+",
      "###.###",
      "###.###",
      "###+###",
    ],
    exits: 4,
    features: ["crossroads"],
  },

  7: {
    name: "Square Chamber",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#.....#",
      "#.....#",
      "#.....#",
      "#.....#",
      "#.....#",
      "#######",
    ],
    exits: 0,
    features: ["spacious"],
  },

  8: {
    name: "Pillared Chamber",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#.0.0.#",
      "#.....#",
      "#.0.0.#",
      "#.....#",
      "#.0.0.#",
      "#######",
    ],
    exits: 0,
    features: ["pillars"],
  },

  9: {
    name: "Throne Room",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#...T.#",
      "#.....#",
      "#..@..#",
      "#.....#",
      "#...C.#",
      "###+###",
    ],
    exits: 1,
    features: ["throne", "arena"],
  },

  10: {
    name: "Storage Room",
    size: "7x7",
    difficulty: "easy",
    map: [
      "#######",
      "#.S.S.#",
      "#.....#",
      "#.S.S.#",
      "#.....#",
      "#.S.S.#",
      "#######",
    ],
    exits: 0,
    features: ["storage"],
  },

  11: {
    name: "Guard Room",
    size: "7x7",
    difficulty: "hard",
    map: [
      "###+###",
      "#.....#",
      "#..G..#",
      "#.G.G.#",
      "#..G..#",
      "#.....#",
      "###+###",
    ],
    exits: 2,
    features: ["guards"],
  },

  12: {
    name: "Trapped Room",
    size: "7x7",
    difficulty: "hard",
    map: [
      "#######",
      "#.^.^.#",
      "#.....#",
      "#.^.^.#",
      "#.....#",
      "#.^.^.#",
      "#######",
    ],
    exits: 0,
    features: ["traps"],
  },

  13: {
    name: "Ritual Circle",
    size: "7x7",
    difficulty: "hard",
    map: [
      "#######",
      "#..A..#",
      "#.OOO.#",
      "#.OAO.+",
      "#.OOO.#",
      "#..A..#",
      "#######",
    ],
    exits: 1,
    features: ["altar", "ritual"],
  },

  14: {
    name: "Jail Cell",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#G...G#",
      "#G...G#",
      "+.....+",
      "#G...G#",
      "#G...G#",
      "#######",
    ],
    exits: 2,
    features: ["guards", "cells"],
  },

  15: {
    name: "Armory",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#./.\\.#",
      "#.|.|.#",
      "#.\\/.+",
      "#.|.|.#",
      "#./.\\.#",
      "#######",
    ],
    exits: 1,
    features: ["weapons", "armor"],
  },

  // LARGE ROOMS
  16: {
    name: "Great Hall",
    size: "9x9",
    difficulty: "medium",
    map: [
      "#########",
      "#.......#",
      "#.0...0.#",
      "#.......#",
      "+.......+",
      "#.0...0.#",
      "#.......#",
      "#.0...0.#",
      "#########",
    ],
    exits: 2,
    features: ["pillars", "spacious"],
  },

  17: {
    name: "Library",
    size: "9x9",
    difficulty: "easy",
    map: [
      "#########",
      "#.S.S.S.#",
      "#.......#",
      "#.S.S.S.#",
      "#.......+",
      "#.S.S.S.#",
      "#.......#",
      "#.S.S.S.#",
      "#########",
    ],
    exits: 1,
    features: ["storage", "knowledge"],
  },

  18: {
    name: "Circular Room",
    size: "9x9",
    difficulty: "medium",
    map: [
      "###+###",
      "###...###",
      "##.......##",
      "#.........#",
      "+.........+",
      "#.........#",
      "##.......##",
      "###...###",
      "###+###",
    ],
    exits: 2,
    features: ["circular"],
  },

  19: {
    name: "Ambush Room",
    size: "9x9",
    difficulty: "hard",
    map: [
      "#########",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#.#.#.#.#",
      "#########",
    ],
    exits: 0,
    features: ["ambush", "maze"],
  },

  20: {
    name: "Arena",
    size: "9x9",
    difficulty: "hard",
    map: [
      "#########",
      "#.......#",
      "#.......#",
      "#...@...#",
      "#.......+-+",
      "#...@...#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    exits: 1,
    features: ["arena", "combat"],
  },

  21: {
    name: "Fountain Court",
    size: "9x9",
    difficulty: "easy",
    map: [
      "#########",
      "#.......#",
      "#..###..#",
      "#.#FFF#.#",
      "#.#FFF+.#",
      "#.#FFF#.#",
      "#..###..#",
      "#.......#",
      "#########",
    ],
    exits: 1,
    features: ["fountain", "water"],
  },

  22: {
    name: "Temple",
    size: "11x11",
    difficulty: "hard",
    map: [
      "###########",
      "#.........#",
      "#...AAA...#",
      "#..AAAAA..#",
      "#.AAAAAAA.#",
      "+.........+",
      "#.AAAAAAA.#",
      "#..AAAAA..#",
      "#...AAA...#",
      "#.........#",
      "###########",
    ],
    exits: 2,
    features: ["altar", "ritual", "holy"],
  },

  23: {
    name: "Boss Chamber",
    size: "13x13",
    difficulty: "very_hard",
    map: [
      "#############",
      "#...........#",
      "#...........#",
      "#....BBB....#",
      "#...BBBBB...#",
      "#..BBBBBBB..#",
      "#Bs...........+-+",
      "#..BBBBBBB..#",
      "#...BBBBB...#",
      "#....BBB....#",
      "#...........#",
      "#...........#",
      "#############",
    ],
    exits: 1,
    features: ["boss", "platform"],
  },

  24: {
    name: "Crypt",
    size: "11x9",
    difficulty: "hard",
    map: [
      "###########",
      "#.X.X.X.X.#",
      "#.........#",
      "#.X.X.X.X.#",
      "#.........#",
      "+.........+",
      "#.X.X.X.X.#",
      "#.........#",
      "#.X.X.X.X.#",
      "###########",
    ],
    exits: 2,
    features: ["sarcophagus", "undead"],
  },

  // CORRIDORS & PASSAGES
  25: {
    name: "Straight Corridor",
    size: "10x3",
    difficulty: "trivial",
    map: ["+........+", "#........#", "+........+"],
    exits: 2,
    features: ["passage"],
  },

  26: {
    name: "L-Shaped Corridor",
    size: "6x6",
    difficulty: "trivial",
    map: ["####++", "####..", "####..", "#.....", "#.....", "######"],
    exits: 2,
    features: ["passage", "turn"],
  },

  27: {
    name: "T-Shaped Junction",
    size: "7x5",
    difficulty: "easy",
    map: ["###+###", "#.#", "#.#", "#.#", "+.+"],
    exits: 3,
    features: ["junction"],
  },

  28: {
    name: "Four-Way Intersection",
    size: "7x7",
    difficulty: "easy",
    map: [
      "#+#",
      "#.#",
      "#.#",
      "###.###",
      "+.....+",
      "###.###",
      "#.#",
      "#.#",
      "#+#",
    ],
    exits: 4,
    features: ["crossroads"],
  },

  29: {
    name: "Narrow Z Bend",
    size: "6x6",
    difficulty: "easy",
    map: ["+++###", "#..###", "#..###", "###..#", "###..#", "###+++"],
    exits: 2,
    features: ["passage", "turn"],
  },

  31: {
    name: "Curved Corridor",
    size: "7x5",
    difficulty: "easy",
    map: ["###+++", "#.....", "#.....", "#.....", "###+++"],
    exits: 2,
    features: ["passage", "curve"],
  },

  32: {
    name: "Narrow Tunnel",
    size: "15x2",
    difficulty: "trivial",
    map: ["+...............+", "#...............#"],
    exits: 2,
    features: ["tunnel"],
  },

  // SPECIAL ROOMS
  33: {
    name: "Teleporter Room",
    size: "7x7",
    difficulty: "hard",
    map: [
      "#######",
      "#......+-+",
      "#.....#",
      "#......#",
      "#.....#",
      "#..T..#",
      "#######",
    ],
    exits: 1,
    features: ["teleporter", "magic"],
  },

  34: {
    name: "Puzzle Room",
    size: "9x9",
    difficulty: "hard",
    map: [
      "#########",
      "#.1.2.3.#",
      "#.......#",
      "#.4.5.6.#",
      "#.......#",
      "#.7.8.9.#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    exits: 0,
    features: ["puzzle"],
  },

  35: {
    name: "Mirror Hall",
    size: "11x5",
    difficulty: "medium",
    map: [
      "###########",
      "#.........#",
      "#..MMMMM..#",
      "#.........#",
      "###########",
    ],
    exits: 0,
    features: ["mirror", "illusion"],
  },

  36: {
    name: "Underwater Grotto",
    size: "9x9",
    difficulty: "hard",
    map: [
      "#########",
      "#~~~...~#",
      "#~....~.#",
      "#~...~~.#",
      "#~~....~#",
      "#~....~~#",
      "#~~...~.#",
      "#~....~.#",
      "#########",
    ],
    exits: 0,
    features: ["water", "hazard"],
  },

  37: {
    name: "Lava Chamber",
    size: "9x9",
    difficulty: "very_hard",
    map: [
      "#########",
      "#.......#",
      "#..===..#",
      "#.=====.#",
      "#.=====.#",
      "#.=====.#",
      "#..===..#",
      "#.......#",
      "#########",
    ],
    exits: 0,
    features: ["lava", "hazard"],
  },

  38: {
    name: "Crystal Cave",
    size: "9x9",
    difficulty: "medium",
    map: [
      "#########",
      "#..*.*..#",
      "#.*...*.#",
      "#*..*..*#",
      "#.*...*.#",
      "#..*.*..#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    exits: 0,
    features: ["crystal", "treasure"],
  },

  39: {
    name: "Vine-Choked Room",
    size: "9x9",
    difficulty: "medium",
    map: [
      "#########",
      "#..\\\/\\..#",
      "#.\\\/..\\/#",
      "#/....../#",
      "#\\/..\\/.#",
      "#..\\\/\\..#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    exits: 0,
    features: ["vines", "nature"],
  },

  40: {
    name: "Secret Passage",
    size: "5x20",
    difficulty: "easy",
    map: [
      "#####",
      "#...############",
      "#...............#",
      "############...#",
      "#####",
    ],
    exits: 2,
    features: ["secret", "hidden"],
  },

  // EXIT VARIATIONS
  41: {
    name: "Room with Multiple Exits",
    size: "7x7",
    difficulty: "easy",
    map: [
      "#+#+#+#",
      "#.....#",
      "#.....#",
      "+.....+",
      "#.....#",
      "#.....#",
      "#+#+#+#",
    ],
    exits: 6,
    features: ["multi_exit"],
  },

  42: {
    name: "Dead End Room",
    size: "5x5",
    difficulty: "trivial",
    map: ["#####", "#...+", "#...#", "#...#", "#####"],
    exits: 1,
    features: ["dead_end"],
  },

  43: {
    name: "One-Way Exit",
    size: "5x5",
    difficulty: "easy",
    map: ["#####", "#...#", "#...#", "#...<", "#####"],
    exits: 1,
    features: ["one_way"],
  },

  44: {
    name: "Locked Door Room",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#.....#",
      "#..D..#",
      "#.....#",
      "#..D..#",
      "#.....#",
      "#######",
    ],
    exits: 0,
    features: ["locked_door"],
  },

  45: {
    name: "Hidden Door Room",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#.....#",
      "#..▒▒..#",
      "#..▒▒..#",
      "#..▒▒..#",
      "#.....#",
      "#######",
    ],
    exits: 0,
    features: ["secret_door"],
  },

  // COMBINATION ROOMS
  46: {
    name: "Room-within-a-Room",
    size: "9x9",
    difficulty: "medium",
    map: [
      "#########",
      "#.......#",
      "#.#####.#",
      "#.#...#.#",
      "#.#.#.#.#",
      "#.#...#.#",
      "#.#####.#",
      "#.......#",
      "#########",
    ],
    exits: 0,
    features: ["nested"],
  },

  47: {
    name: "Split Level Room",
    size: "9x9",
    difficulty: "medium",
    map: [
      "#########",
      "#.......#",
      "#.......#",
      "###.###",
      "#.#",
      "#.#",
      "###.###",
      "#.......#",
      "#########",
    ],
    exits: 0,
    features: ["split_level"],
  },

  48: {
    name: "Overlapping Rooms",
    size: "11x11",
    difficulty: "hard",
    map: [
      "###########",
      "#.........#",
      "#.........#",
      "#..+-+#####..#",
      "#..#.........#",
      "#..#.#.#..+",
      "#..#.........#",
      "#..+-+#####..#",
      "#.........#",
      "#.........#",
      "###########",
    ],
    exits: 2,
    features: ["overlapping"],
  },

  49: {
    name: "Alchemy Lab",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#S.F.S#",
      "#.....#",
      "#.T.T.#",
      "#.....#",
      "#S...S#",
      "#######",
    ],
    exits: 0,
    features: ["alchemy", "potion"],
  },

  50: {
    name: "Barracks",
    size: "9x9",
    difficulty: "hard",
    map: [
      "#########",
      "#h.h.h.h#",
      "#.......#",
      "#h.h.h.h#",
      "#.......#",
      "#..S.S..#",
      "#.......#",
      "#..C.C..#",
      "###+#####",
    ],
    exits: 1,
    features: ["barracks", "guards"],
  },

  51: {
    name: "The Smithy",
    size: "7x7",
    difficulty: "medium",
    map: [
      "#######",
      "#S.=.=#",
      "#..=:=#",
      "#..A..#",
      "#..k..#",
      "#.....#",
      "###+###",
    ],
    exits: 1,
    features: ["smithy", "forge"],
  },

  52: {
    name: "Large Hall",
    size: "9x9",
    difficulty: "easy",
    map: [
      "#########",
      "#S.....S#",
      "#.......#",
      "#CC...CC#",
      "#TT...TT#",
      "#TT...TT#",
      "#CC...CC#",
      "#.......#",
      "###+#####",
    ],
    exits: 1,
    features: ["spacious", "furniture"],
  },

  53: {
    name: "L-Shape Open",
    size: "9x9",
    difficulty: "easy",
    map: [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#########",
    ],
    exits: 0,
    features: ["open"],
  },
};

// Dungeon Map Storage & Generator
const DungeonMapSystem = {
  // Initialize dungeon storage under state.world.dungeon
  _init() {
    ensureWorldState();
    const dg = state.world.dungeon;
  },

  // Create a new dungeon level
  createDungeonLevel(levelName, areaType, roomIds = []) {
    this._init();
    const dg = state.world.dungeon;

    const levelKey = levelName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const rooms = roomIds.map((id) => DUNGEON_PREFABS[id]).filter((r) => r);

    const dungeonLevel = {
      name: levelName,
      key: levelKey,
      areaType: areaType,
      areaInfo: AREA_TYPE_KEYS[areaType] || {
        name: "Unknown",
        type: "environment",
      },
      rooms: rooms,
      totalRooms: rooms.length,
      difficulty: this._calculateDifficulty(rooms),
      createdAt: new Date().toISOString(),
    };

    dg.levels[levelKey] = dungeonLevel;
    dg.currentLevel = dungeonLevel;
    return dungeonLevel;
  },

  // Get a specific dungeon level
  getDungeonLevel(levelName) {
    this._init();
    const dg = state.world.dungeon;
    const key = levelName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    return dg.levels[key] || null;
  },

  // Get a specific room from a dungeon
  getRoom(levelName, roomIndex) {
    const level = this.getDungeonLevel(levelName);
    if (!level || roomIndex < 0 || roomIndex >= level.rooms.length) return null;
    return level.rooms[roomIndex];
  },

  // Get room by prefab ID
  getRoomByPrefabId(prefabId) {
    return DUNGEON_PREFABS[prefabId] || null;
  },

  // Get all available prefabs
  getAllPrefabs() {
    return DUNGEON_PREFABS;
  },

  // Get prefabs by difficulty
  getPrefabsByDifficulty(difficulty) {
    return Object.values(DUNGEON_PREFABS).filter(
      (room) => room.difficulty === difficulty,
    );
  },

  // Get prefabs by feature
  getPrefabsByFeature(feature) {
    return Object.values(DUNGEON_PREFABS).filter((room) =>
      room.features.includes(feature),
    );
  },

  // Calculate overall difficulty
  _calculateDifficulty(rooms) {
    if (rooms.length === 0) return "trivial";

    const difficulties = ["trivial", "easy", "medium", "hard", "very_hard"];
    const avgDifficulty =
      rooms.reduce((sum, room) => {
        return sum + difficulties.indexOf(room.difficulty);
      }, 0) / rooms.length;

    return difficulties[Math.round(avgDifficulty)];
  },

  // Get ASCII map for a room
  getRoomMap(prefabId) {
    const room = DUNGEON_PREFABS[prefabId];
    return room ? room.map : null;
  },

  // Display room map as string
  displayRoomMap(prefabId) {
    const map = this.getRoomMap(prefabId);
    return map ? map.join("\n") : "Room not found";
  },

  // Get all rooms in a dungeon level
  getAllRoomsInLevel(levelName) {
    const level = this.getDungeonLevel(levelName);
    return level ? level.rooms : [];
  },

  // List all dungeon levels
  listAllDungeons() {
    this._init();
    return Object.values(state.world.dungeon.levels);
  },

  // Delete a dungeon level
  deleteDungeonLevel(levelName) {
    this._init();
    const dg = state.world.dungeon;
    const key = levelName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (dg.levels[key]) {
      delete dg.levels[key];
      if (dg.currentLevel && dg.currentLevel.key === key) {
        dg.currentLevel = null;
      }
      return true;
    }
    return false;
  },
};

// When entering new floor / starting dungeon:
function enterDungeonFloor(dungeonName, floor, playerLevel) {
  const newMap = generateDungeonFloor(dungeonName, floor, playerLevel);
  saveDungeonMap(newMap);
  return "You descend into a new floor...";
}

function LabyrinthController() {
  // Read player state
  const player = state.PS.Name;

  const playerLocation = player.location; // e.g. "Top Level"
  const playerFloor = player.dugfloor || 1; // new stat you added
  const playerloc = player.playerloc; // current sub-action/command
  const combatStatus = player.combatStatus || "None";
  let playerInventory = player.inventory || []; // assuming array, but can be object too

  // Labyrinth structure - Floor-based with bosses at bottom
  const labyrinth = {
    "Top Level": {
      floors: 25,
      boss_floor: 25,
      boss_name: "Echo Guardian",
      lootTier: "LL",
      difficulty: 1,
      subLocations: {
        Campfire: { type: "campfire", active: true, effect: "rest" },
        "Cursed Anvil": {
          type: "cursed",
          active: true,
          effect: "curse",
          chance: 0.3,
        },
        "Buff Shrine": { type: "buff", active: true, effect: "strength" },
        "Treasure Chest": { type: "treasure", active: true, difficulty: 1 },
      },
    },
    "Middle Level": {
      floors: 30,
      boss_floor: 30,
      boss_name: "Bridge Keeper",
      lootTier: "LL",
      difficulty: 3,
      subLocations: {
        Campfire: { type: "campfire", active: true, effect: "rest" },
        "Cursed Anvil": {
          type: "cursed",
          active: true,
          effect: "curse",
          chance: 0.5,
        },
        "Buff Shrine": { type: "buff", active: true, effect: "dexterity" },
        "Treasure Vault": { type: "treasure", active: true, difficulty: 3 },
      },
    },
    "Low Level": {
      floors: 50,
      boss_floor: 50,
      boss_name: "Abyss Watchman",
      lootTier: "ML",
      difficulty: 5,
      subLocations: {
        Campfire: { type: "campfire", active: true, effect: "rest" },
        "Cursed Anvil": {
          type: "cursed",
          active: true,
          effect: "curse",
          chance: 0.7,
        },
        "Buff Shrine": { type: "buff", active: true, effect: "intelligence" },
        "Forgotten Cache": { type: "treasure", active: true, difficulty: 5 },
      },
    },
    "Sub Level": {
      floors: 100,
      boss_floor: 100,
      boss_name: "Void Sovereign",
      lootTier: "HL",
      difficulty: 8,
      subLocations: {
        Campfire: { type: "campfire", active: false, effect: "rest" },
        "Cursed Anvil": {
          type: "cursed",
          active: true,
          effect: "curse",
          chance: 0.9,
        },
        "Buff Shrine": { type: "buff", active: true, effect: "all-stats" },
        "Final Hoard": { type: "treasure", active: true, difficulty: 8 },
      },
    },
  };

  let currentLevel = playerLocation;
  let currentSubLoc = playerloc;
  let output = "";

  // Floor progression function
  function handleFloorProgress() {
    const level = labyrinth[currentLevel];
    if (!level) return "Invalid level.";

    // Boss check
    if (playerFloor === level.boss_floor) {
      if (combatStatus !== "Victory") {
        player.combatStatus = `Fighting ${level.boss_name}`;
        return `*** BOSS FLOOR ***\n${level.boss_name} blocks the path to ${getNextLevel(currentLevel)}!\nDefeat to advance.\n`;
      } else {
        // Boss defeated, advance to next level floor 1
        const nextLevel = getNextLevel(currentLevel);
        if (nextLevel) {
          player.location = nextLevel;
          player.dugfloor = 1;
          player.combatStatus = "None";
          return `Boss defeated! You descend to ${nextLevel} - Floor 1.\n`;
        }
        return "Labyrinth conquered!";
      }
    }

    // Regular floor
    const floorProgress = (playerFloor / level.floors) * 100;
    output += `--- ${currentLevel} - Floor ${playerFloor}/${level.floors} (Progress: ${Math.round(floorProgress)}%) (Difficulty: ${level.difficulty}) ---\n`;

    // Random events/sub-locations (20% chance each floor)
    if (Math.random() < 0.2) {
      const subKeys = Object.keys(level.subLocations);
      const randomSub = subKeys[Math.floor(Math.random() * subKeys.length)];
      const sub = level.subLocations[randomSub];
      output += handleSubLocation(randomSub, sub);
    } else {
      output += "Dark corridors... shadows stir.\n";
    }

    // Always show info
    output += `Sub-locations nearby: ${Object.keys(level.subLocations).join(", ")}\n`;
    output += `Next: Floor ${playerFloor + 1} | Boss at Floor ${level.boss_floor}\n`;
    return output;
  }

  // Helper: Get next level
  function getNextLevel(current) {
    const order = ["Top Level", "Middle Level", "Low Level", "Sub Level"];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  }

  // Helper: Get previous level
  function getPreviousLevel(current) {
    const order = ["Top Level", "Middle Level", "Low Level", "Sub Level"];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  }

  // Helper: Handle sub-location
  function handleSubLocation(name, sub) {
    let subOutput = "";
    if (sub.type === "campfire") {
      subOutput += `You find a ${name}. Health restored.\n`;
      // You might want to add actual health restoration here
      player.health = Math.min(player.maxHealth, player.health + 30);
    } else if (sub.type === "cursed") {
      if (Math.random() < sub.chance) {
        subOutput += `The ${name} curses you! Weakened.\n`;
        player.isCursed = true;
      } else {
        subOutput += `The ${name} hums but spares you.\n`;
      }
    } else if (sub.type === "buff") {
      subOutput += `The ${name} blesses you with ${sub.effect}!\n`;
      player.isBlessed = true;
      // You could add actual stat buffs here depending on effect
    } else if (sub.type === "treasure") {
      const lootResult = WorldLootPlayer(`Searching ${name}...`);
      subOutput += lootResult.text + "\n";

      // Mark as looted (simple flag system)
      if (!player.looted) player.looted = {};
      player.looted[`${name}_Floor${playerFloor}`] = true;
    }

    return subOutput;
  }

  // Main logic
  if (labyrinth[currentLevel]) {
    output = handleFloorProgress();

    // === MOVEMENT/COMMANDS ===
    if (playerloc.includes("descend")) {
      if (playerFloor < labyrinth[currentLevel].floors) {
        player.dugfloor = playerFloor + 1;
        output += `\nDescended to Floor ${player.dugfloor}.\n`;
      } else {
        output += `\nBottom floor reached - face the boss!\n`;
      }
    } else if (playerloc.includes("ascend")) {
      if (playerFloor > 1) {
        // Ascend within same level
        player.dugfloor = playerFloor - 1;
        output += `\nAscended to Floor ${player.dugfloor}.\n`;
      } else {
        // Ascend to previous level's boss floor
        const prevLevel = getPreviousLevel(currentLevel);
        if (prevLevel) {
          player.location = prevLevel;
          player.dugfloor = labyrinth[prevLevel].boss_floor;
          output += `\nAscended to ${prevLevel} - Floor ${player.dugfloor}.\n`;
        } else {
          output += `\nAlready at the top of the labyrinth!\n`;
        }
      }
    } else if (playerloc.includes("search")) {
      output += WorldLootPlayer("Searching floor...").text + "\n";
    }
  } else {
    output += `Outside labyrinth: ${playerLocation}\n`;
  }

  // Reset action location (common pattern)
  player.playerloc = "safe area";

  return output;
}

state.logMessages = state.logMessages || {};
state.logMessages["Input"] = state.logMessages["Input"] || [];
state.logMessages["Output"] = state.logMessages["Output"] || [];

// Raw text returns
function makelog(stream, msg) {
  // Example usage:
  // makelog('Output', 'Example message!')
  state.logMessages[stream].push(msg);
}

function dumplog(stream, text) {
  // Display game messages to input or output based upon stream variable
  // Example usage:
  // text = dumplog('Input', text)

  if (state.logMessages[stream] && state.logMessages[stream].length > 0) {
    text += "\n" + state.logMessages[stream].join("\n") + "\n";
    state.logMessages[stream].length = 0;
  }

  return text;
}
History_Logs = false;
function logfunc(f, ...args) {
  let retval = f(...args) || "Debug: No return value";
  if (History_Logs) {
    console.log(f.name, retval);
  }
  return retval;
}

console.log("Library loaded successfully.");
