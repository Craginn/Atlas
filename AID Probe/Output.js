// Atlas Context Probe — Output. Records the model's response and saves the
// turn's capture into story cards; never changes the text.
const modifier = (text) => {
  AtlasProbe.output(text);
  return { text };
};

modifier(text);
