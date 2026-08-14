//text = text.replace(/\s*\n+\s*/g, " ")


const BaseOut = (text) => {
  UpdatePlayers();
  updateCompanionCards();   // ---- ALLY SYSTEM ---- keep party/summon cards live
  getPlayerDamage();
  Gametrack();

  //console.log(history,"This is AID history")
  //console.log(text, "This is AID text string")
  //console.log(state)
  

  //console.log(state.memory.authorsNote)
  //console.log("This is the state object" ,state)
  //console.log(state.memory.context)
  //console.log(text + '\n\n')
  //console.log(JSON.stringify(history))
  //console.log(storyCards)
  //log(removeStoryCard.toString());
  //log(addStoryCard.toString())


  // Display stats if requested (prioritize detailed if both somehow requested)
  if (state.showStatsDetailedRequest) {
    text += "\n\n" + displayStatsDetailed();
    state.showStatsDetailedRequest = false; // Reset the flag
  } else if (state.showStatsSummaryRequest) {
    text += "\n\n" + displayStatsSummarized();
    state.showStatsSummaryRequest = false; // Reset the flag
  }

  if (state.overwrite) {
    state.overwrite = false
    if (typeof state.output == 'string') {
      return { text: state.output || empty }
    } else if (state.output == undefined) {
      return { text: + "State.Overwrite is 'undefined'" }
    } else {
      return { text: JSON.stringify(state.output) }
    }
  }//else if state.overwrite == false
  if (state.PS.health <= 0) {
    text = ''
  } else {
    naturalRegen();// Natural regeneration every turn
    //effectivedamage();

  }

  //PlayerStatus();

  StoryCards();


  return { text: text + FireEvents() }
}


// The "Quick Check at the End of Each Turn" has been removed as requested.
const PlayerEvents = (text) => {
  /*//The percentage of turns an event will fire.
  let percentChance = 10
 
  //Chooses a random event from state.option
 
  function pickEventText() {
    let min = 1;
    let max = 101; // thru 100 inclusive, actually
    let random = Math.floor(Math.random() * (max - min)) + min;
    //Weights for different event types.
 
    let key
 
    if (random < 20) {
      key = 'npc'
    } else if (random < 45) {
      key = 'monster'
    } else if (random < 65) {
      key = 'loot'
    } else {
      key = 'desc'
    }
    return state.playerevents[key][Math.floor(Math.random() * state.playerevents[key].length)]
  }
 
  let modifiedText = text;
  //Pick a number between 0 - 99
  let num = Math.floor(Math.random() * 100);
  //DEBUG. Uncomment to display the number that was chosen each turn.
  //state.message = num
 
  //If the number is below the percentage (but not equal to, to account for 0), fire the event.
  if (num < percentChance) {
    let tText = pickEventText();
    modifiedText = text + '\n\n' + tText + '\n\n';
  }{ text: modifiedText }*/
  /*if (state.PS !== undefined) {
    updatePlayerCards();
  }*/
  
  return { text }



}

function modifier(text) {
  text = logfunc(PlayerEvents, text).text;
  text = logfunc(BaseOut, text).text;
  text = dumplog('Output', text)
  return { text };
}

console.log('Output hook loaded successfully.')

// Don't modify this part
modifier(text)