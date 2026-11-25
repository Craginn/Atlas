// Atlas Context Probe — Context. Records the assembled context; never changes it.
const modifier = (text) => {
  AtlasProbe.context(text);
  return { text };
};

modifier(text);
