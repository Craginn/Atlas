// Atlas Context Probe — Input. Records the player's input; never changes it.
const modifier = (text) => {
  AtlasProbe.input(text);
  return { text };
};

modifier(text);
