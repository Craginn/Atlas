const detectdebug = false // Change to false to remove Console.log(found)
function detectAction(terms, happened, hook, searchspace) {
  // Prevent multiple instances of an action
  const found = terms.find((term) => searchspace.toLowerCase().includes(term.toLowerCase()))
  if (found !== undefined) {
    if (detectdebug) {
      if (terms === Paw || terms === PTD) {
        console.log(found)
        console.log(state[happened])
      }
    }
    if (!state[happened]) {
      hook()
      state[happened] = true
    }
  } else {
    state[happened] = false
  }
}


function getPotionHook() {
  addItem({ name: "Health Potion", type: "consumable", effect: { health: 25 } });
}


let safearea = false
/*function safeareaHook() {
  safearea = true
  state.logMessages['Output'].push(`-Safe Area-`)
  CommunityUtils.StoryCards.setSettings(PlayerCard, "Playerloc", "Safe Area")
}*/


const modifier = (text) => {
  if (state.PS.Name !== undefined) {

    let lastAction = splatContext(text).LA


    //console.log(history)



    detectAction([
      "you find a small bottle",
      "a glowing potion",
      'healing potion',
    ], 'lastPotionFoundThisTurn', getPotionHook, lastAction)


    text = censor(text, '💡')
    text = censor(text, '🌀')
    text = censor(text, '❤️')
    text = censor(text, '💚')
    text = censor(text, '🍀')
    text = censor(text, '🧠')
    text = censor(text, '💪')
    text = censor(text, '👥')
    text = censor(text, '👁️‍🗨️')
    text = censor(text, '💥')
    text = censor(text, '🎯')
    text = censor(text, '🤔')
    text = censor(text, '🎲')
    text = censor(text, '🎒')
    text = censor(text, '🔄')
    text = censor(text, '🌟')
    text = censor(text, '⚔️')
    text = censor(text, '✨')
    text = censor(text, '🛡️')
    text = censor(text, '🎮')
    text = censor(text, '-')
    text = censor(text, '☠️')
    text = censor(text, '[')
    text = censor(text, '✅')
    text = censor(text, '|')
    text = censor(text, '💰💰')
    text = censor(text, '🛍️')







    /*let ctx = splatContext(text)
    ctx = inject(
      ctx, '[HP: ' + state.PS.health + ']\n') // Might need to change "HP:" to "Player starting HP:"
  
    text = unsplatContext(ctx)*/




  
    //LAtext();
    playerFood();
    printMonsterStats();
    tickMonsterCooldowns();
    tickLocationRegen();

   
    return text;  // This is what AI Dungeon expects
  }
}

console.log('Context hook loaded successfully.')

// Don't modify this part
modifier(text)