# Conjecture: Frontend Source Analysis

> **Warning**: This folder contains documentation derived from analyzing minified production JavaScript bundles. Information here is **speculative** and may be inaccurate, incomplete, or outdated.

## Source Material

The `src/` folder contains minified webpack bundles from AI Dungeon's web frontend. These are production artifacts with:
- Obfuscated variable names
- Bundled dependencies mixed with application code
- No source maps

## Methodology

Information was extracted by:
1. Identifying string literals that survived minification (routes, event names, error messages)
2. Analyzing the `_buildManifest.js` file for route structure
3. Pattern matching for recognizable code structures (GraphQL operations, React patterns)
4. Identifying feature flags and content type enumerations

## Confidence Levels

- **High**: Route paths (from build manifest)
- **Medium**: Content types, event names (string literals in code)
- **Low**: Component purposes, data flow (inferred from patterns)

## Documents

- [route-structure.md](route-structure.md) - Application routes and page structure
- [content-types.md](content-types.md) - Observed content type enumerations
- [voyage-platform.md](voyage-platform.md) - Voyage as a separate product
- [technology-stack.md](technology-stack.md) - Observable frameworks and libraries
- [analytics-events.md](analytics-events.md) - Tracked user events

## Not Covered

These files cannot reliably document:
- Internal component architecture
- State management patterns
- Business logic details
- API request/response schemas (see GraphQL introspection instead)
