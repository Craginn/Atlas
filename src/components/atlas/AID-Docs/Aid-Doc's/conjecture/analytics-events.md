# Analytics Events

> Extracted from `eventName:` patterns - Medium confidence

## Event Tracking Functions

Two tracking functions observed:
- `sendUserEvent` - Tracks user-initiated actions
- `sendSystemEvent` - Tracks system/technical events

## Observed Event Names

### Navigation Events
- `navigation_bar_search_pressed`
- `navigation_bar_profile_pressed`
- `navigation_bar_login_pressed`
- `banner_pressed` (with `eventVariation` for banner name)

### Content Events
- `search_content_type_filter_pressed`

### Authentication Events
- `anon_conversion_cta_clicked` - Anonymous user conversion
- `native_third_party_auth_initiated` - OAuth start in native app

## Event Properties

Events include metadata like:
- `eventVariation` - Variant/type of event
- `metadata` - Additional context object

Example structure (reconstructed):
```javascript
sendUserEvent({
    eventName: "banner_pressed",
    eventVariation: bannerName
})

sendUserEvent({
    eventName: "anon_conversion_cta_clicked",
    metadata: {
        cta: source,
        anonReworkVariant: variant,
        isTemporarySession: true,
        provider: "google",
        method: "third_party"
    }
})
```

## Feature Flags

Events appear connected to feature flag system:
- `getFlagVariation` function for A/B testing
- `flagVariations` query for feature flags
- `new_bottom_nav` flag observed

## Session Tracking

Observable session properties:
- `isTemporarySession` - Anonymous/temporary user
- `anonReworkVariant` - Anonymous user experience variant

## Experiment Events

- `sendExperimentEvent` - A/B test tracking (from GraphQL schema)
