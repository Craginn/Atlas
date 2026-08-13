# Technology Stack

> Extracted from bundle analysis - High confidence

## Frontend Framework

**Next.js** (React)
- Evidence: `__NEXT_P` global, `_buildManifest.js`, page-based routing
- File-based routing with dynamic segments (`[param]`)
- Server-side rendering capability

## UI Framework

**Tamagui** (likely)
- Evidence: Styled component patterns, theme tokens (`$coreA8`, `$colorHover`)
- Cross-platform component library
- Theme-aware styling

## State Management

**Observable State** (Legend-State or similar)
- Evidence: `.get()`, `.set()`, `.peek()` patterns
- Reactive state updates

## API Layer

**GraphQL with Apollo Client**
- Evidence: `GraphQLError`, query/mutation patterns
- Subscription support for real-time updates
- `subscribeToMore` pattern observed

## Authentication

**Firebase Authentication**
- Evidence: Firebase token references in help documentation
- Third-party OAuth (Discord, Google, Apple)
- Email/password authentication

## Image Delivery

**Cloudflare Images**
- AI Dungeon: `latitude-standard-pull-zone-1.b-cdn.net`
- Voyage: `visuals.share.voyage/cdn-cgi/imagedelivery/...`
- Image variants: `public`, `blur50`

## Animation

**React Native Reanimated** (Worklets)
- Evidence: `useAnimatedStyle`, `useSharedValue`, `useDerivedValue`
- Worklet hash patterns in code
- Used for scroll-based animations

## Build Tools

**Webpack**
- Evidence: `webpackChunk_N_E`, chunk splitting
- Code splitting by route
- CSS extraction

## Mobile Platform Detection

Observable platform checks:
- `isAndroid`, `isIos`, `isWeb`
- `isNativeWebView` - Detects app WebView
- `webview-platform` localStorage key
- Android safe area inset handling

## Analytics

Custom event tracking system:
- `sendUserEvent` - User action tracking
- `sendSystemEvent` - System event tracking
- Event names as string literals

## Error Handling

**Toast Notifications**
- Error display via toast/snackbar pattern
- `Py()` toast provider pattern

## Linear Gradient

**Expo Linear Gradient** or similar
- Gradient overlays for UI effects
- Used in carousels and cards
