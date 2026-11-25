// =====================================================================
// Atlas Context Probe — Library
// =====================================================================
// Paste into a TEST scenario on AI Dungeon (Scenario → Scripts → Library),
// together with the Input, Context and Output files from this folder.
//
// Each turn it records exactly what AI Dungeon hands the scripts:
//   - the `text` each hook receives (Input: player input, Context: the full
//     assembled context, Output: the model's response)
//   - `info` (actionCount, characterNames, maxChars, memoryLength, ...)
//   - the shape of `history` entries and story cards, and `state.memory`
// and saves it into story cards of type "atlas-probe". Export the story cards
// (Story Cards → Export) and import the JSON in Atlas → Context Lab, which
// splits the real context into its sections and compares it line by line
// with what Atlas assembles from the same inputs.
//
// The probe never changes `text` and never throws: a failure shows as a game
// message and in the script log, and the turn carries on.
//
// Written in conservative JavaScript (no ?. / ?? / ??=) so it runs on any
// engine version AID uses.
// =====================================================================

var ATLAS_PROBE = {
  // Turn off to disable capture without removing the scripts.
  enabled: true,
  // Marker mode: overwrite state.memory's Plot Essentials, Author's Note and
  // Front Memory with ⟦ATLAS:…⟧ markers, and add a story card that fires on the
  // word "atlasprobe", so each slot's exact position in the context is
  // unmistakable. Only for a throwaway scenario — it replaces those fields.
  markers: false,
  // How many captured turns to keep as story cards (older ones are removed).
  keepTurns: 5,
  // Max characters per story card. A capture longer than this is split across
  // cards ("1/3", "2/3", ...). Lower it if Atlas reports truncated captures.
  chunkChars: 3000,
  // How many trailing history entries to capture.
  historyEntries: 30,
};

var AtlasProbe = (function () {
  var VERSION = 1;
  var CARD_TYPE = 'atlas-probe';
  var MARKER_TYPE = 'atlas-probe-marker';
  var KEY_RE = /^atlasprobe:t(\d+):(\d+)\/(\d+)$/;

  function store() {
    if (!state.atlasProbe || typeof state.atlasProbe !== 'object') {
      state.atlasProbe = { seq: 0, pendingInput: null, current: null };
    }
    return state.atlasProbe;
  }

  function copy(value) {
    try {
      return value === undefined ? null : JSON.parse(JSON.stringify(value));
    } catch (e) {
      return { unserializable: String(e) };
    }
  }

  function historyTail() {
    var list = Array.isArray(history) ? history : [];
    var tail = list.slice(-ATLAS_PROBE.historyEntries);
    var out = [];
    for (var i = 0; i < tail.length; i++) {
      var h = tail[i] || {};
      out.push({ type: h.type, text: h.text, rawText: h.rawText, fields: Object.keys(h) });
    }
    return out;
  }

  function cardShape() {
    var list = Array.isArray(storyCards) ? storyCards : [];
    var first = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].type !== CARD_TYPE) { first = list[i]; break; }
    }
    return {
      count: list.length,
      fields: first ? Object.keys(first) : [],
      keysType: first ? typeof first.keys : null,
    };
  }

  function report(where, e) {
    var msg = '[Atlas Probe] ' + where + ' failed: ' + (e && e.message ? e.message : String(e));
    log(msg);
    state.message = msg;
  }

  function findCard(keys) {
    for (var i = 0; i < storyCards.length; i++) {
      if (storyCards[i] && String(storyCards[i].keys) === keys) return i;
    }
    return -1;
  }

  function upsertCard(keys, entry, type) {
    var idx = findCard(keys);
    if (idx >= 0) {
      updateStoryCard(idx, keys, entry, type);
    } else {
      addStoryCard(keys, entry, type);
    }
  }

  function applyMarkers() {
    if (!ATLAS_PROBE.markers) return;
    if (!state.memory || typeof state.memory !== 'object') state.memory = {};
    state.memory.context = '⟦ATLAS:PLOT⟧';
    state.memory.authorsNote = '⟦ATLAS:NOTE⟧';
    state.memory.frontMemory = '⟦ATLAS:FRONT⟧';
    if (findCard('atlasprobe') < 0) addStoryCard('atlasprobe', '⟦ATLAS:CARD⟧', MARKER_TYPE);
  }

  /** Remove capture cards older than the last `keepTurns` captures. */
  function prune(latestSeq) {
    var oldest = latestSeq - ATLAS_PROBE.keepTurns + 1;
    for (var i = storyCards.length - 1; i >= 0; i--) {
      var c = storyCards[i];
      if (!c || c.type !== CARD_TYPE) continue;
      var m = KEY_RE.exec(String(c.keys));
      if (m && Number(m[1]) < oldest) removeStoryCard(i);
    }
  }

  function flush(record) {
    var json = JSON.stringify(record);
    var size = Math.max(200, ATLAS_PROBE.chunkChars | 0);
    var parts = [];
    for (var at = 0; at < json.length; at += size) parts.push(json.slice(at, at + size));
    for (var p = 0; p < parts.length; p++) {
      upsertCard('atlasprobe:t' + record.seq + ':' + (p + 1) + '/' + parts.length, parts[p], CARD_TYPE);
    }
    prune(record.seq);
  }

  return {
    input: function (text) {
      if (!ATLAS_PROBE.enabled) return;
      try {
        var s = store();
        s.pendingInput = { text: text, info: copy(info) };
        applyMarkers();
      } catch (e) {
        report('Input', e);
      }
    },

    context: function (text) {
      if (!ATLAS_PROBE.enabled) return;
      try {
        var s = store();
        s.seq = (s.seq | 0) + 1;
        s.current = {
          probe: VERSION,
          seq: s.seq,
          input: s.pendingInput,
          context: {
            text: text,
            length: typeof text === 'string' ? text.length : null,
            info: copy(info),
            memory: copy(state.memory),
            history: historyTail(),
            historyLength: Array.isArray(history) ? history.length : null,
            cards: cardShape(),
          },
        };
        s.pendingInput = null;
      } catch (e) {
        report('Context', e);
      }
    },

    output: function (text) {
      if (!ATLAS_PROBE.enabled) return;
      try {
        var s = store();
        var record = s.current;
        if (!record) {
          // An Output with no Context capture before it this turn.
          s.seq = (s.seq | 0) + 1;
          record = { probe: VERSION, seq: s.seq, input: s.pendingInput, context: null };
        }
        record.output = { text: text, info: copy(info) };
        s.current = null;
        s.pendingInput = null;
        flush(record);
      } catch (e) {
        report('Output', e);
      }
    },
  };
})();
