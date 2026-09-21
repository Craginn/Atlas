// Global constants for if clauses
function showhelp() {
  return `\n✨Help Guide\n
      type '/cast "spell name" For casting any spells from spell list
      type '/use' <itemName> To use cunsumables from your inventory
      type '/equip' To Put on a inventory item.
      type '/equip' all' to Put on all gear items.
      type '/unequip' to take off a equiped item.
      type '/shop' to buy items with gold(Testing! limited gold atm).
      type '/craft' to craft helpful items.
      type '/recruit' <name> to bring an NPC into your party.
      type '/dismiss' <name> to send a party member or summon away.
      type '/party' to show your party members and summons.
      type 'show damage' to show your characters damage stats.
      type 'show level' to show your characters level.
      type 'show stats' to show your modified detailed stats.
      type 'show equipped' to show your items you are wearing.
      type 'show skills ' to show your current skills.
      type 'show backpack' to open the Backpack menu (auto-opens Main Inventory).
      type 'show backpack materials' to view crafting materials.
      type 'show backpack skillstones' to view skill stones.
      type 'show backpack artifacts' to view artifacts.
      type 'show backpack all' to view every container.
      type 'show help' to show this help text.
      `
}
// type  'show map' to show the dungeon map of the current floor.' add to show help when it is done

let showcommands = {
  'level': displayLevel,
  'stats': displayAttributes,
  'equipped': displayEquipped,
  'skills': displaySkills,
  'damage': displayDamage,
  'defenses': displayDefenses,
  'backpack main':        () => displayBackpackContainer("main"),
  'backpack materials':   () => displayBackpackContainer("materials"),
  'backpack skillstones': () => displayBackpackContainer("skillStones"),
  'backpack artifacts':   () => displayBackpackContainer("artifacts"),
  'backpack all':         displayBackpackAll,
  'backpack': handleBackpackCommand,
  'help': showhelp,
  'dungeon map detailed': showDungeonMapDetailed,
  'dungeon map': showDungeonMap,
  'map detailed': showDungeonMapDetailed,
  'map': showDungeonMap,
}


// `command()` is substring-based: longer qualifier keys (e.g. "backpack main")
// would still match the bare "backpack" key (because "show backpack main"
// contains "show backpack"). To prevent double-firing, return [true, text]
// on match so the dispatch loop short-circuits. The dispatch loop itself
// iterates the longer keys first.
function command(text, target) {

  let cmdstr = ("show " + target).toLowerCase()
  if (text.toLowerCase().includes(cmdstr)) {
    text = text.replace(cmdstr, "").trim(); // Remove the command from input
    state.output = showcommands[target]();
    state.overwrite = true
    return [true, text];
  }
  return [false, text]
}

/*if (state.hunger == 35} ...
if (state.tiredness == 30) ...
 
 
You could also declare something on top of the file such as:
 
const HUNGER_STARVATION_DEATH = 40;
const TIREDNESS_PASS_OUT = 35;
 
if (state.hunger == HUNGER_STARVATION_DEATH) ...
if (state.tiredness == TIREDNESS_PASS_OUT ) ...*/



function randomint(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}



const basecode = (text) => {
  //log(history)
  U_playerTrack();
  UpdatePlayers();
  updateCompanionCards();
  //playerAction();

  //console.log(text)
  if (state.Players !== undefined) {

    // CHARACTER CREATION IN PROGRESS
    if (state.tempCharacter) {
      const result_P = processCharacterInput(text);

      if (result_P?.error) {
        state.overwrite = true;
        state.output = result_P.message;
        return text;
      }

      if (result_P?.message) {
        state.overwrite = true;
        state.output = result_P.message;
        return text;
      }

      if (result_P?.complete) {
        state.overwrite = true;
        state.output = result_P.message;
        return text;
      }
    }


    //let recent = splatContext(text).RS
    let lastAction = splatContext(text).LA

    // Detect if a monster was slain in last action
    let monsterPattern = new RegExp(`\\b(?:slain|killed|defeated|destroyed|vanquished)\\b.*\\b(${KnownMonsters})\\b|\\b(${KnownMonsters})\\b.*\\b(?:slain|killed|defeated|destroyed|vanquished)\\b`, "i");
    const slainMatch = (lastAction + text).match(monsterPattern)
    const slainMonster = slainMatch ? (slainMatch[1] || slainMatch[2]) : null;
    if (slainMonster) {
      const normalizedSlainMonster = slainMonster.toLowerCase();
      const actualMonsterName = monsterLookup.get(normalizedSlainMonster);
      if (actualMonsterName) {
        console.log(`🎯 Monster slain detected: ${actualMonsterName}`);
        // Use game message to communicate this to other functions
        state.logMessages['Output'].push(`🎯 ${actualMonsterName} has been defeated!`);
      }
    }

    // Reset processed monster deaths at the start of each turn
    state.processedMonsterDeaths = new Set();

    //detectAction(EXP_G, 'lastXPGainAppliedThisTurn', winHook, lastAction + recent)// Gaining EXP
    //detectAction(Safeareawords, 'Safe Area', safeareaHook, lastAction + recent)


    // Clean out any existing [tags] so they don't confuse parsing


    // Strip existing [tags] for clean parsing
    let cleanText = text.replace(/\[[^\]]*\]/g, " ");

    const normalize = (str) =>
      typeof str === "string"
        ? str.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
        : "";

    const normText = normalize(cleanText);

    // === Your existing data (quantityWords, modifiers, KnownMonsters) ===
    const quantityWords = {
      one: 1, a: 1, an: 1, single: 1, two: 2, three: 3, four: 4, five: 5,
      several: 4, few: 3, some: 3, pack: 4, group: 4, handful: 3, halfdozen: 6, dozen: 12
    };

    const modifiers = {
      leader: { hpMult: 1.3, dmgMult: 1.4, desc: "leader" },
      elite: { hpMult: 1.5, dmgMult: 1.6, desc: "elite" },
      wounded: { hpMult: 0.5, dmgMult: 0.7, desc: "wounded" },
      injured: { hpMult: 0.6, dmgMult: 0.8, desc: "injured" },
      weak: { hpMult: 0.7, dmgMult: 0.9, desc: "weak" },
      starving: { hpMult: 0.6, dmgMult: 0.6, desc: "starving" },
      angry: { hpMult: 1.0, dmgMult: 1.5, desc: "angry" },
      enraged: { hpMult: 1.2, dmgMult: 1.8, desc: "enraged" },
      frenzied: { hpMult: 1.1, dmgMult: 2.0, desc: "frenzied" },
      berserk: { hpMult: 1.4, dmgMult: 2.2, desc: "berserk" },
      huge: { hpMult: 2.0, dmgMult: 1.8, desc: "huge" },
      giant: { hpMult: 3.0, dmgMult: 2.5, desc: "giant" }
    };

    // Build monster lookup (unchanged)
    const monsterLookup = new Map();
    for (const name of KnownMonsters) {
      const base = name.toLowerCase();
      monsterLookup.set(base, name);
      if (!base.endsWith("s")) {
        monsterLookup.set(base + "s", name);
        if (base.endsWith("y")) monsterLookup.set(base.slice(0, -1) + "ies", name);
        if (/[sxz]$|ch$|sh$/.test(base)) monsterLookup.set(base + "es", name);
      }
    }
    const monsterSearch = Array.from(monsterLookup.keys())
      .sort((a, b) => b.length - a.length)
      .join("|");

    // === New: support both numeric quantities (e.g. "2") and word quantities ===
    const quantityPattern = `\\d+|${Object.keys(quantityWords).join("|")}`;
    const modPattern = Object.keys(modifiers).join("|");

    // Unified regex – handles optional quantity (number or word), optional modifiers (up to 2), and monster
    const spawnRegex = new RegExp(
      `(?:\\b(${quantityPattern})\\b\\s+)?` +                  // optional quantity
      `(?:(${modPattern})\\b(?:\\s+(?:and|or|,)\\s+(${modPattern})\\b)?\\s+)?` + // optional modifiers
      `\\b(${monsterSearch})\\b`,// monster (required for a match)
      "gi"
    );

    // === Helper functions (more functional style) ===
    const parseQuantity = (qtyStr) => {
      if (!qtyStr) return 1;
      const num = Number(qtyStr);
      return isNaN(num) ? (quantityWords[qtyStr] || 1) : num;
    };

    const applyModifiers = (modKeys) => {
      const initial = { hpMult: 1, dmgMult: 1, desc: "" };
      return modKeys.reduce((state, key) => {
        const m = modifiers[key];
        if (!m) return state;
        return {
          hpMult: state.hpMult * m.hpMult,
          dmgMult: state.dmgMult * m.dmgMult,
          desc: state.desc ? `${state.desc} and ${m.desc}` : m.desc
        };
      }, initial);
    };

    const getTagForms = (monsterName) => {
      const forms = [monsterName, monsterName + "s"];
      if (monsterName.toLowerCase().endsWith("y")) {
        forms.push(monsterName.slice(0, -1) + "ies");
      }
      if (/[sxz]$|ch$|sh$/i.test(monsterName)) {
        forms.push(monsterName + "es");
      }
      return forms;
    };

    // === 1. SEARCH INTENT DETECTION ===
    const searchIntentRegex = new RegExp(`\\b(search|look|scan|hunt|seek)\\b.*\\b(${KnownMonsters})\\b`, "i");
    const searchMatch = normText.match(searchIntentRegex);
    const isSearchIntent = Boolean(searchMatch);

    // === Main processing (single unified phase – simpler & more efficient) ===
    const spawnedThisTurn = new Set();

    let player = state.PS.Name
    let playerloc = state.PS.playerloc
    let safehaven = state.PS.location === "safe haven" || playerloc === "safe area"
    if (!safehaven) {
      for (const match of normText.matchAll(spawnRegex)) {
        const qtyStr = match[1];
        const mod1 = match[2]?.toLowerCase();
        const mod2 = match[3]?.toLowerCase();
        const rawMonster = match[4];

        const monsterName = monsterLookup.get(rawMonster);
        if (!monsterName || spawnedThisTurn.has(monsterName)) continue;

        // Determine quantity (number/word → count, default 1)
        let count = parseQuantity(qtyStr);
        count = Math.max(1, Math.min(count, 20));

        // Apply modifiers functionally
        const modState = applyModifiers([mod1, mod2].filter(Boolean));
        const modifiersObj = modState.desc ? {
          hpMult: modState.hpMult,
          dmgMult: modState.dmgMult,
          desc: modState.desc.trim()
        } : {};

        // Spawn
        spawn(monsterName, count, modifiersObj);
        console.log(`SPAWNED: ${count}x ${monsterName} ${modState.desc ? `(${modState.desc})` : ""}`);

        spawnedThisTurn.add(monsterName);

        // Tag all forms of this monster in the original text
        const forms = getTagForms(monsterName);
        const tagRegex = new RegExp(`\\b(${forms.join("|")})\\b`, "gi");
        text = text.replace(tagRegex, "[$1]");
      }
    }

    // === 2. DETECT "NO MONSTERS FOUND" SCENARIO ===
    const noMonstersFound = isSearchIntent && spawnedThisTurn.size === 0;

    // Use the tagged version from now on


    // Your despawn logic (unchanged, just fixed one typo: Paw → something real if needed)
    const leaveTriggers = ["search", "flee", "run", "leave", "stairs", "up", "down", "exit", "north", "south", "east", "west", "back"];
    if (leaveTriggers.some(word => normText.includes(word))) {
      if (state.monsters && state.monsters.length > 0) {
        state.message = (state.message || "") + "\n\nThe monsters lose interest and wander off into the shadows...";
        state.monsters = [];
      }
      return text;
    }

    // Idle despawn (3 turns of being ignored)
    if (state.monsters && state.monsters.length > 0) {
      state.monsterIdleTurns ??= 0;

      const playerAttacked = /* your attack detection here, e.g. */ normText.includes("attack") || normText.includes("hit") || normText.includes("slash");

      if (playerAttacked) {
        state.monsterIdleTurns = 0;
      } else {
        state.monsterIdleTurns++;
        if (state.monsterIdleTurns >= 3) {
          state.message = (state.message || "") + "\n\nThe monsters growl in frustration, then slink away into the darkness.";
          state.monsters = [];
          state.monsterIdleTurns = 0;
        } else if (state.monsterIdleTurns === 2) {
          state.message = (state.message || "") + "\n\nThe monsters are getting restless...";
        }
      }
    } else {
      state.monsterIdleTurns = 0;
    }
    // === 2. APPEND "NO MONSTERS FOUND" MESSAGE IF APPLICABLE ===
    if (noMonstersFound) {
      text += '\n[No monsters found in the area]';
    }

    //text = JackHiddenStoryCards(text);
  }

  // Clear previous game messages to avoid duplicates
  //state.logMessages['Output'] = [];

  // Reset display flags
  state.showStatsSummaryRequest = false;
  state.showStatsDetailedRequest = false;

  // --- Handle user commands ---

  if (text.toLowerCase().includes('/new player')) {
    text = text.replace("/new player", "").trim();
    const gate = rpgCreationGate();
    if (!gate.allowed) {
      state.overwrite = true;
      state.output = gate.message;
      return text;
    }
    createCharacter();
    const result_I = processCharacterInput('');
    state.overwrite = true;
    state.output = result_I.message;
    return text;
  }

  if (text.includes('Brand new RPG Engine Guide')) {
    state.overwrite = true;
    state.output = ""
    return text;
  }


  if (!state.engineStart) {
    state.engineStart = false
  }

  const StartMatch = text.toLowerCase().includes('start game engine')// User types start game to play the game
  if (state.Players && StartMatch && state.engineStart !== true) {

    state.engineStart = true
    equipItem("all");
    healTarget(100, state.PS.Name);



    text += `A Noble Legion guide approaches and says, "Here is your identification bracelet. Please ensure you never take it off. Follow me to the labyrinths top level safe haven. As you enter through the safe haven entrance, you can hear the bustling sounds of the havens shops, adventurers, and vendors. The guide leads you up the stairs and into the tavern area, before bowing and leaving you.`

    state.logMessages['Output'].push("[Game Engine Started!]")

     return text
   }

// ── DUNGEON ENTRY ──────────────────────────────────────────────
if (state.PS && state.PS.Name && !state.tempCharacter) {
  const lowerInput = text.toLowerCase();
  const isDungeonEntry =
    lowerInput.includes("enter labyrinth") ||
    lowerInput.includes("enter dungeon") ||
    lowerInput.includes("enter the labyrinth") ||
    lowerInput.includes("descend into") ||
    lowerInput.includes("go to labyrinth");

  if (isDungeonEntry && (state.PS.location === "safe haven" || state.PS.playerloc === "safe area" || state.PS.playerloc === "labyrinth_entrance")) {
    ensureWorldState();
    
    // Generate Floor 1 procedurally instead of using legacy ASCII generator
    const floor1 = procedurallyGenerateLabyrinthFloor(1);
    
    state.PS.location = "labyrinth";
    state.PS.playerloc = floor1.id;
    state.PS.dugfloor = 1;
    state.PS.combatstatus = "Not in Combat";
    
    state.logMessages['Input'].push(`You descend into the labyrinth. ${floor1.description}`);
    return text;
  }
}

// ── DUNGEON FLOOR TRAVERSAL (/descend) ───────────────────
if (lowerText.includes('/descend')) {
  ensureWorldState();
  if (state.PS.location !== "labyrinth" && state.PS.playerloc !== "labyrinth_entrance") {
     state.overwrite = true;
     state.output = "You can only descend while inside the labyrinth.";
     return { text };
  }
  
  const currentFloor = parseInt(state.PS.dugfloor, 10) || 1;
  const newFloor = currentFloor + 1;
  
  // Force generation of the new location entry so it exists in locMap immediately
  // AND updates state.world.dungeon properly with numeric values
  const newLoc = procedurallyGenerateLabyrinthFloor(newFloor);
  if (!newLoc) {
     state.overwrite = true;
     state.output = "You cannot descend any further.";
     return { text };
  }
  
  // Update player state
  state.PS.dugfloor = newFloor;
  state.PS.location = "labyrinth";
  state.PS.playerloc = newLoc.id; // Perfectly matches LocalLocation key
  
  state.overwrite = true;
  state.output = `You descend deeper into the labyrinth... arriving at Floor ${newFloor} (${newLoc.displayName}).`;
  return { text };
}


  // --- END GENERALIZED ITEM PICKUP COMMAND ---

  //// Debugg Commands
  const killplayer = text.toLowerCase().includes('Debugg kill player')
  if (killplayer) {
    state.PS.health = -1
  }

  const damageplayer = text.toLowerCase().includes('debugg damage player')
  if (damageplayer) {
    const damage = Math.floor(Math.random() * 8) + 3; // 3–10 base damage
    applyDamageToPlayer(damage, 'physical');
    state.logMessages['Output'].push(`Debug command used ${damage} taken health now ${state.PS.health}`)

  }

  const fullhealth = text.toLowerCase().includes('debugg full health')
  if (fullhealth) {
    state.PS.health = 100
    state.logMessages['Output'].push(`Debug command used health now ${state.PS.health}.`)
  }


  const fullmana = text.toLowerCase().includes('debugg full mana')
  if (fullmana) {
    state.PS.mana = 100
    state.logMessages['Output'].push(`Debug command used mana now ${state.PS.mana}.`)
  }


  return text
}


///// Start of hunger and tired script \\\\\
const HTscript = (text) => {

  return { text };
}


/*function normalize(str) {
  if (typeof str !== "string") return "";
  return str.toLowerCase().replace(/[^a-z0-9 \/]/g, "");
}*/

const Playercommands = (text) => {
  // Parse the player's intent up-front (multi-action aware) so the Context hook
  // can tune the AI prompt. Runs before any early-return command handling, and
  // no-ops during character creation.
  parsePlayerActions(text);

  // --- Shop choice handling ---
  if (state.awaitingShopChoice && Array.isArray(state.shopOptions) && state.shopOptions.length > 0) {
    const trimmed = text.trim();

    if (/^\d+$/.test(trimmed)) {
      shop(text);
      return { text };
    }

    if (!trimmed.startsWith('/')) {
      shop(text);
      return { text };
    }
  }

  // --- Crafting choice handling (numeric selection from /craft menu) ---
  if (state.awaitingCraftChoice && Array.isArray(state.craftingOptions) && state.craftingOptions.length > 0) {
    const trimmed = text.trim();
    const choiceMatch = trimmed.match(/^(\d+)$/);

    if (choiceMatch) {
      const index = Number(choiceMatch[1]) - 1;

      if (index >= 0 && index < state.craftingOptions.length) {
        // Re-check location in case the player moved
        if (state.PS?.location === "safe haven") {
          const template = state.craftingOptions[index];

          const ingredients = Array.isArray(template.ingredients) ? template.ingredients : [];
          const missing = [];

          // Check for required ingredients across every container. A material
          // (e.g. a monster core) lives in containers.materials, not main, so
          // searching state.PS.inventory alone would silently fail recipes.
          for (const req of ingredients) {
            const requiredQty = req.qty || 1;
            const haveQty = countItemAcrossContainers(
              (i) => i && typeof i === "object" && i.name === req.name,
            );
            if (haveQty < requiredQty) {
              missing.push(`${requiredQty}x ${req.name}`);
            }
          }

          if (missing.length > 0) {
          state.overwrite = true;
          state.output = `You do not have the required ingredients to craft ${template.name}. You need: ${missing.join(", ")}.`;
          return { text };
          }

          // Consume ingredients from whichever container holds them.
          for (const req of ingredients) {
            let toRemove = req.qty || 1;
            while (toRemove > 0) {
              const hit = findItemAcrossContainers(
                (i) => i && typeof i === "object" && i.name === req.name,
              );
              if (!hit) break;
              removeItemFromContainer(hit.key, hit.index);
              toRemove--;
            }
          }

          const craftedItem = JSON.parse(JSON.stringify(template));

          addItem(craftedItem);

          state.awaitingCraftChoice = false;
          state.craftingOptions = [];

          state.overwrite = true;
          state.output = `You crafted a ${craftedItem.name}. It has been added to your backpack.`;
          return { text };
        } else {
          state.awaitingCraftChoice = false;
          state.craftingOptions = [];

          state.overwrite = true;
          state.output = "You are no longer in the Safe Haven, so you can't craft right now.";
          return { text };
        }
      } else {
        state.overwrite = true;
        state.output = "That is not a valid crafting option. Please choose a number from the crafting list.";
        return { text };
      }
    }
  }

  //
  // Command to show inventory. Iterate backpack qualifiers (longer keys)
  // first so "show backpack materials" matches `backpack materials` and not
  // the bare `backpack` key. The bare key comes last.
  const showCommandOrder = [
    'backpack main',
    'backpack materials',
    'backpack skillstones',
    'backpack artifacts',
    'backpack all',
    'backpack',
    'level',
    'stats',
    'equipped',
    'skills',
    'damage',
    'defenses',
    'help',
    'dungeon map detailed',
    'dungeon map',
    'map detailed',
    'map',
  ];
  for (const target of showCommandOrder) {
    let ran;
    ([ran, text] = command(text, target));
    if (ran) return { text };
  }

  const lowerText = text.toLowerCase();

  // --- Safe Haven crafting command ---
  /*const craftMatch = lowerText.match(/\/craft/);
  if (craftMatch) {
    let menu = "Available crafts (Safe Haven only):\n";
    craftable.forEach((item, index) => {
        const type = item.type || "item";
        const subtype = item.subtype ? `, ${item.subtype}` : "";
        const desc = item.description ? ` - ${item.description}` : "";
        const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
        const ingText = ingredients.length
            ? ` [Requires: ${ingredients.map(i => `${i.qty || 1}x ${i.name}`).join(", ")}]`
            : "";
        menu += `${index + 1}) ${item.name} (${type}${subtype})${desc}${ingText}\n`;
    });
    menu += "[Type the number of the item you want to craft.]";

    if (!isInSafeHaven) {
      state.overwrite = true;
      state.output = "You can only craft items while in the Safe Haven.";
      return text;
    }

    const allRecipes = Array.isArray(state.craftableItems) ? state.craftableItems : [];

    if (allRecipes.length === 0) {
      state.overwrite = true;
      state.output = "There is nothing you can craft right now.";
      return text;
    }

    const inventory = Array.isArray(state.PS?.inventory) ? state.PS.inventory : [];

    // Filter to only recipes the player can actually craft with their current materials
    const craftable = allRecipes.filter(template => {
      const ingredients = Array.isArray(template.ingredients) ? template.ingredients : [];
      return ingredients.every(req => {
        const requiredQty = req.qty || 1;
        const haveQty = inventory.filter(i => i?.name === req.name).length;
        return haveQty >= requiredQty;
      });
    });

    if (craftable.length === 0) {
      state.overwrite = true;
      state.logMessages['Output'].push(`[You don't have the required materials to craft anything right now.]`);
      return text;
    }

    state.craftingOptions = craftable;
    state.awaitingCraftChoice = true;*/



  // --- Safe Haven shop command ---
  const shopMatch = lowerText.match(/\/shop/);
  const isInSafeHaven = state.PS?.location === "safe haven";
  if (shopMatch) {
      if (!isInSafeHaven) {
        state.overwrite = true;
        state.logMessages['Output'].push(`[You can only visit the shop while in the Safe Haven.]`);
        return { text };
      }

      shopMenu();
      return { text };
  }

  if (lowerText.includes('/new player')) {
    const gate = rpgCreationGate();
    if (!gate.allowed) {
      state.overwrite = true;
      state.output = gate.message;
      return { text };
    }
    createCharacter();
    const result = processCharacterInput('');
    state.overwrite = true;
    state.output = result.message;
    return { text };
  }



  // ──────────────────────────────────────────────────────────────────
  //  DUNGEON TRAVERSAL — /descend /ascend
  //  Moves the player between floors of the labyrinth. State is kept
  //  in state.world.dungeon (floor, dugfloor) and state.PS (location).
  // ──────────────────────────────────────────────────────────────────
  if (lowerText.includes('/descend')) {
    ensureWorldState();
    const dg = state.world.dungeon;

    if (state.PS.location !== "labyrinth") {
      state.overwrite = true;
      state.output = "You can only descend while inside the labyrinth.";
      return { text };
    }

    const currentFloor = dg.dugfloor || 1;
    const newFloor = currentFloor + 1;

    dg.dugfloor = newFloor;
    dg.floor = newFloor;
    dg.grid = {};
    dg.levels = dg.levels || {};
    generateDungeon();
    dg.playerPosition = { row: 1, col: "A" };
    state.PS.dugfloor = newFloor;
    state.PS.playerloc = "descend";

    state.overwrite = true;
    state.output = `You descend to Floor ${newFloor}.`;
    return { text };
  }

  if (lowerText.includes('/ascend')) {
    ensureWorldState();
    const dg = state.world.dungeon;

    if (state.PS.location !== "labyrinth") {
      state.overwrite = true;
      state.output = "You can only ascend while inside the labyrinth.";
      return { text };
    }

    const currentFloor = dg.dugfloor || 1;
    const newFloor = Math.max(1, currentFloor - 1);

    if (newFloor < currentFloor) {
      if (dg.levels && dg.levels["floor_" + newFloor]) {
        const level = dg.levels["floor_" + newFloor];
        dg.grid = level.grid;
        dg.playerPosition = level.playerPosition;
        dg.activeMap = level.activeMap;
      } else {
        dg.dugfloor = newFloor;
        dg.floor = newFloor;
        dg.grid = {};
        generateDungeon();
        dg.playerPosition = { row: 1, col: "A" };
      }
      state.PS.dugfloor = newFloor;
      if (state.PS.location === "labyrinth") {
        state.PS.location = "safe haven";
        state.PS.playerloc = "safe area";
        state.PS.combatstatus = "Not in Combat";
        state.overwrite = true;
        state.output = `You ascend to Floor ${newFloor} of the labyrinth.`;
      } else {
        state.PS.playerloc = "ascend";
        state.overwrite = true;
        state.output = `You ascend to Floor ${newFloor}.`;
      }
    } else {
      state.overwrite = true;
      state.output = "You are already at the top floor of the labyrinth.";
    }
    return { text };
  }

  // ── DUNGEON GRID MOVEMENT (/move north|south|east|west) ──────────────
  if (lowerText.match(/\/move\s+(north|south|east|west)\b/i)) {
    if (state.PS.location !== "labyrinth") {
      state.overwrite = true;
      state.output = "You can only move this way while inside the labyrinth.";
      return { text };
    }
    const dirMatch = lowerText.match(/\/move\s+(north|south|east|west)/i);
    const direction = dirMatch ? dirMatch[1] : "north";
    if (typeof movePlayer === "function") {
      const moved = movePlayer(direction);
      if (moved) {
        state.overwrite = true;
        state.output = `You move ${direction}.`;
      } else {
        state.overwrite = true;
        state.output = `You cannot move ${direction} from here.`;
      }
    }
    return { text };
  }


  //===================================================================\\
  //                    ALLY SYSTEM — commands                        \\
  //  /recruit <name>  /dismiss <name>  /party                         \\
  //  plus narrative detection ("I ask Kaela to join me"), mirroring    \\
  //  how monster spawns are already scanned out of player text.        \\
  //  All roster rules live in recruitAlly()/dismissCompanion() in      \\
  //  Library.js, so neither entry point can bypass them.               \\
  //===================================================================\\

  // Roster readout. Requires the slash or the "show" prefix so an ordinary
  // sentence that happens to open with "party" is left alone.
  if (/\/party\b/i.test(lowerText) || /\bshow party\b/i.test(lowerText)) {
    state.output = displayParty();
    state.overwrite = true;
    return { text };
  }

  // Matched against `text`, not `lowerText`, so the captured name keeps its
  // casing and the replace below actually finds what it matched.
  const recruitCmd = text.match(/\/recruit\s+(.+)/i);
  if (recruitCmd) {
    const raw = recruitCmd[1].replace(/[.!?]+$/, '').trim();
    recruitAlly(raw, raw);
    text = text.replace(recruitCmd[0], '').trim();
    state.overwrite = true;
    state.output = '';
    return { text };
  }

  const dismissCmd = text.match(/\/dismiss\s+(.+)/i);
  if (dismissCmd) {
    const raw = dismissCmd[1].replace(/[.!?]+$/, '').trim();
    dismissCompanion(raw);
    text = text.replace(dismissCmd[0], '').trim();
    state.overwrite = true;
    state.output = '';
    return { text };
  }

  // Narrative recruiting. Capture group 1 is the name; the whole match is the
  // role hint, so "ask the town guard to join" picks the guard template.
  // Cooldown-gated the same way monster spawning is, so one sentence cannot
  // recruit the same NPC over and over.
  const RECRUIT_MATCHERS = [
    /\bask(?:s|ed)?\s+(?:the\s+)?([a-z][a-z '\-]{1,30}?)\s+to\s+join\b/i,
    /\brecruit(?:s|ed)?\s+(?:the\s+)?([a-z][a-z '\-]{1,30}?)(?:\s+(?:to|into)\b|[.!,]|$)/i,
    /\b([a-z][a-z '\-]{1,30}?)\s+(?:joins|agrees to join|decides to join)\s+(?:you|your party|the party)\b/i,
    /\binvite(?:s|d)?\s+(?:the\s+)?([a-z][a-z '\-]{1,30}?)\s+to\s+(?:join|travel|come)\b/i
  ];

  if (state.recruitCooldown > 0) state.recruitCooldown--;
  if (!state.recruitCooldown && state.PS && state.PS.Name && !state.tempCharacter) {
    for (const matcher of RECRUIT_MATCHERS) {
      const hit = text.match(matcher);
      if (!hit) continue;
      const recruited = recruitAlly(hit[1], hit[0]);
      if (recruited) state.recruitCooldown = 3;
      break;
    }
  }

  // Command to use a skill/spell (e.g. "use fireball", "cast blood rend on the goblin").
  // Match against the abilities the player actually knows (state.PS.skills) instead of a
  // rigid "cast X." template — the old regex required the literal word "cast", a trailing
  // period, and greedily captured the target too, so multi-word skills like "blood rend"
  // (and any "use …" phrasing) were never caught. Now: an invocation verb, then the known
  // ability name anywhere after it, with or without a target or punctuation. Longest known
  // name wins so "twin slash" beats "slash"; names may contain spaces.
  const skillVerb = lowerText.match(/\b(?:cast|use|channel|unleash|invoke|activate)\s+(.+)/i);
  if (skillVerb) {
    const rest = skillVerb[1];
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const knownSkillNames = Object.keys((state.PS && state.PS.skills) || {})
      .sort((a, b) => b.length - a.length);
    const skillHit = knownSkillNames.find(n => new RegExp(`\\b${escapeRe(n)}\\b`, 'i').test(rest)) || null;
    if (skillHit) {
      let used
        ; ([used, text] = useSkill(skillHit, text));
      if (!used) {
        state.overwrite = true
        state.output = ''
      }
      return { text }
    }
    // A cast-family verb naming an ability the player doesn't know still reports failure
    // (so they learn they lack it). A bare "use X" is left to fall through to the item and
    // other command handlers below.
    if (/\b(?:cast|channel|unleash|invoke|activate)\b/i.test(lowerText)) {
      const attempted = rest.trim()
        .replace(/\s+\b(?:on|at|the|a|an|my|myself|it|them)\b.*$/i, '')
        .replace(/[.!?]+$/, '')
        .trim();
    if (attempted) {
      state.logMessages['Output'].push(`You have failed to cast ${attempted}.`)
      state.overwrite = true
      state.output = ''
      return { text }
    }
  }

  // --- SUMMON DIRECTION COMMANDS ---
  // Direct your summons with simple phrases like:
  //   "<summon name> attack <monster>"
  //   "<summon name> follow"
  //   "<summon name> stay"
  const summonDirectMatch = lowerText.match(/\b(\w+)\s+(attack|kill|fight|follow|stay|defend)\b(.*)/i);
  if (summonDirectMatch && !skillVerb) {
    const summonName = summonDirectMatch[1];
    const action = summonDirectMatch[2].toLowerCase();
    const targetPart = summonDirectMatch[3].trim();
    const summon = findCompanion(summonName);
    if (summon && summon.kind === "summon" && !summon.isDead) {
      if (action === "follow" || action === "stay" || action === "defend") {
        summon.directedAction = action;
        state.logMessages['Output'].push(`${summon.name} will ${action}.`);
      } else if (action === "attack" || action === "kill" || action === "fight") {
        const monsters = (state.MS && state.MS.activeMonsters) || [];
        const target = monsters.find((m) => targetPart && targetPart.includes(m.name.toLowerCase()));
        if (target) {
          summon.directedTarget = target.name;
          summon.directedAction = "attack";
          state.logMessages['Output'].push(`${summon.name} will attack ${target.name}.`);
        } else {
          state.logMessages['Output'].push(`${summon.name} doesn't see a target matching "${targetPart}".`);
        }
      }
      state.overwrite = true;
      state.output = '';
      return { text };
    }
  }

  // Command to use a consumable item (e.g., "use health potion", "use magic potion")
  const useItemMatch = lowerText.match(/use (.* potion|.* scroll|.* food|.* salve|.* crystal)/); // Expanded pattern for consumables
  if (useItemMatch) {
    const itemName = useItemMatch[1].trim();
    useItem(itemName); // Call the function to use the item
    return { text }
  }

  // Command to equip an item (e.g., "equip sword", "equip armor")
  const equipMatch = text.toLowerCase().match(/equip ([a-zA-Z ]*)/);
  if (equipMatch) {
    const itemName = equipMatch[1].trim();
    equipItem(itemName);
    return { text }
  }

  // Match exactly "equip all" (case-insensitive)
  const equipAllMatch = lowerText.trim().match(/^equip all$/);
  if (equipAllMatch) {
    state.PS.inventory.forEach(item => {
      if (["mainhand", "offhand", "head", "chest", "legs", "boots", "back", "ring1", "ring2", "necklace"].includes(item.type)) {
        equipItem(item.name);
      }
    });
    return { text: "All valid items equipped." };
  }



  // Command to unequip an item (e.g., "unequip weapon", "unequip armor")
  const unequipMatch = lowerText.match(/unequip (mainhand|offhand|head|chest|legs|boost|ring1|ring2|back|necklace)/);
  if (unequipMatch) {
    const slotName = unequipMatch[1].trim();
    unequipItem(slotName);
    return { text }
  }

  // --- GENERALIZED ITEM PICKUP COMMAND ---
  // Support: "pick sword", "pick up sword", "pick up the sword", "pick all", "pick up all"
  const pickUpMatch = lowerText.match(/^\/?pick( up)?( the)? (.*)$/);

  if (pickUpMatch) {
    const itemQuery = pickUpMatch[3].trim(); // text after "pick (up) (the)"

    // Handle "pick up all"
    if (itemQuery === "all") {
      const pickableItems = getAllPickableItems(); // should return array of all available items
      if (pickableItems.length > 0) {
        pickableItems.forEach(item => addItem(item));
        state.logMessages['Output'].push(`?? You gathered all available items: ${pickableItems.join(", ")}.`);
      } else {
        state.logMessages['Output'].push("?? Theres nothing around to pick up.");
      }
      return { text };
    }

    // Handle single-item pickup
    const foundItem = findPickableItemByName(itemQuery);

    if (foundItem) {
      addItem(foundItem);
      text = text.replace(pickUpMatch[0], "").trim();
      state.logMessages['Output'].push(`${foundItem} has been added to your backpack.`);
    } else {
      state.logMessages['Output'].push(`?? You search for "${itemQuery}" but can't seem to find anything like that.`);
    }
    return { text };
  }







  //PlayerCreation();
  playerAttack();
  Authornote();
  return { text }
}
}


// Removed all individual 'pick up' conditions like 'pick up shiny sword' as they are now handled by the generalized command.

function modifier(text) {
  text = logfunc(basecode, text)
  console.log('AAA')
  text = logfunc(HTscript, text).text;
  console.log('BBB')
  text = logfunc(Playercommands, text).text;
  console.log('CCC')
  text = dumplog('Input', text)
  //console.log(afterPlayerSC)
  //console.log(typeof finalText)
  //console.log('DDD')
  return { text };
}

console.log('Input hook loaded successfully.')

// Don't modify this part
modifier(text)