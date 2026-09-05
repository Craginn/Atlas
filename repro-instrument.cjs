// Throwaway repro: bisect Input.js to find the line range that breaks under
// the per-line _ln instrumentation.
const fs = require('fs');
const hook = fs.readFileSync('RPG ENGINE/Input.js', 'utf8');
const lines = hook.split('\n');

const fails = (n) => {
  const part = lines.slice(0, n).join('\n');
  const instrumented = part
    .split('\n')
    .map((line, i) => '  _ln = ' + (i + 1) + ';\n' + line)
    .join('\n');
  const wrapped =
    '(function(worldState, input, text, state, console, history, info, storyCards, memory, stop, log) {\n' +
    instrumented + '\n})\n';
  try {
    new Function('a', wrapped);
    return false;
  } catch {
    return true;
  }
};

// Find the smallest prefix that fails (prefixes may fail due to unclosed
// brackets, so instead look for the smallest prefix that fails while the
// previous prefix PARSED fine as plain uninstrumented code).
const plainParses = (n) => {
  const part = lines.slice(0, n).join('\n');
  try {
    new Function('a', '(function(){\n' + part + '\n})');
    return true;
  } catch {
    return false;
  }
};

let lo = 1, hi = lines.length, found = -1;
for (let n = 1; n <= lines.length; n++) {
  if (plainParses(n) && fails(n)) { found = n; break; }
}

if (found === -1) {
  console.log('No instrumented-prefix break found');
} else {
  console.log('First failing instrumented prefix ends at line', found);
  console.log('--- lines', Math.max(1, found - 4), 'to', found, '---');
  for (let i = Math.max(0, found - 5); i < found; i++) {
    console.log(String(i + 1).padStart(5), '|', lines[i]);
  }
}
