# Route Structure

> Extracted from `_buildManifest.js` - High confidence

## Application Routes

The AI Dungeon web frontend uses Next.js with file-based routing.

### Core Pages

| Route | Purpose (Inferred) |
|-------|-------------------|
| `/` | Home page |
| `/adventures` | User's adventure library |
| `/discover` | Content discovery/browse |
| `/search` | Search functionality |
| `/create` | Content creation hub |
| `/profile` | Current user's profile |

### Authentication

| Route | Purpose |
|-------|---------|
| `/signin` | Sign in page |
| `/create-account` | Registration |
| `/forgot-password` | Password recovery |
| `/auth/discord/callback` | Discord OAuth callback |

### Content Routes (Dynamic)

| Route Pattern | Purpose |
|---------------|---------|
| `/[contentType]/[shortId]/[title]` | View content (scenario/adventure) |
| `/[contentType]/[shortId]/[title]/play` | Play content |
| `/[contentType]/[shortId]/[title]/read` | Read-only view |
| `/[contentType]/[shortId]/[title]/edit` | Edit content |
| `/[contentType]/[shortId]/[title]/edit/child` | Edit child scenario |
| `/[contentType]/[shortId]/[title]/edit/story-card/[storyCardId]` | Edit specific story card |
| `/[contentType]/[shortId]/[title]/edit/select-image` | Image selection for content |
| `/[contentType]/template` | Content template |

### World Routes (Voyage-related)

| Route Pattern | Purpose |
|---------------|---------|
| `/world/[shortId]/[title]` | View world |
| `/world/[shortId]/[title]/play` | Play world |
| `/world/[shortId]/[title]/create-character` | Character creation for world |
| `/create/world/[shortId]/edit` | Edit world |

### Mod Routes

| Route Pattern | Purpose |
|---------------|---------|
| `/mod/[shortId]/[title]` | View mod |

### User Profile

| Route | Purpose |
|-------|---------|
| `/profile` | Current user profile |
| `/profile/edit` | Edit profile |
| `/profile/edit/select-image` | Select profile image |
| `/profile/creator-dashboard` | Creator analytics |
| `/profile/[username]` | View other user's profile |
| `/profile/[username]/social` | User's social connections |

### Settings

| Route | Purpose |
|-------|---------|
| `/settings` | Settings hub |
| `/settings/auth` | Authentication settings |
| `/settings/change-email` | Change email |
| `/settings/change-password` | Change password |
| `/settings/change-username` | Change username |
| `/settings/dev-tools` | Developer tools |
| `/settings/gameplay-settings` | Gameplay preferences |
| `/settings/linked-accounts` | Connected accounts |
| `/settings/notification-preferences` | Notification settings |
| `/settings/release-channel` | Release channel selection |
| `/settings/safety-settings` | Safety/content filter settings |
| `/settings/tribute` | Tribute/donation settings |

### Commerce

| Route | Purpose |
|-------|---------|
| `/members` | Membership/subscription page |
| `/pricing` | Pricing information |
| `/credit-store` | Credit purchase |
| `/premium-prompt` | Premium upsell |
| `/rewards` | Rewards system |

### Miscellaneous

| Route | Purpose |
|-------|---------|
| `/notifications` | User notifications |
| `/see/[id]` | View generated image |
| `/voyage` | Voyage product page |
| `/wrapped` | Year-in-review feature |
| `/nda` | NDA agreement page |
| `/shadow-members` | Unknown (possibly beta testers) |
| `/be-right-back` | Maintenance/downtime page |
| `/unsubscribe` | Email unsubscribe |

### Development/Internal

| Route | Purpose |
|-------|---------|
| `/dev/server-snapshot` | Server state debugging |
| `/sinister-test` | Shadow subscriptions gateway |
| `/main/[screen]` | Generic screen router |

## URL Parameters

Content routes use these dynamic segments:
- `[contentType]` - Type of content (scenario, adventure, etc.)
- `[shortId]` - Short unique identifier for content
- `[title]` - URL-slugified title
- `[storyCardId]` - Story card identifier
- `[username]` - User's username
- `[id]` - Generic ID (used for images)
