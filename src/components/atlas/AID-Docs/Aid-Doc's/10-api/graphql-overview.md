# GraphQL API Overview

> AI Dungeon uses a GraphQL API for client-server communication, enabling programmatic access to platform features.

## Overview

AI Dungeon's backend exposes a GraphQL API that the web and mobile clients use. This same API can be accessed programmatically for automation, tooling, and integration purposes.

## What is GraphQL

GraphQL is a query language for APIs:
- Request exactly the data you need
- Single endpoint for all operations
- Strongly typed schema
- Queries (read) and Mutations (write)

## API Endpoint

The API is accessed via:
- HTTPS requests to AI Dungeon's GraphQL endpoint
- Authentication required for most operations
- JSON request/response format

## Authentication

Access requires authentication:
- Firebase authentication token
- Obtained from logged-in session
- Token included in request headers

The token can be extracted from browser DevTools (see aidungeon.js documentation for methods).

## Common Operations

### Queries (Reading Data)

- Fetch Adventures
- Get Scenario details
- Read Story Cards
- Access user information
- Load Adventure history

### Mutations (Writing Data)

- Create Adventures
- Update Scenarios
- Modify Story Cards
- Submit actions
- Update settings

## Schema Introspection

The API schema can be introspected:
- Query the schema for available types
- Discover fields and operations
- The introspection.json file (1.6MB) contains full schema

## Key Entities

The API works with these primary entities:
- **Adventures**: Individual playthroughs
- **Scenarios**: Templates for Adventures
- **Story Cards**: Triggered lore entries
- **Actions**: Story turns/inputs
- **Users**: Player accounts

See [API Entities](api-entities.md) for more detail.

## Rate Limiting

API access may be rate limited:
- Excessive requests may be throttled
- Follow reasonable usage patterns
- Automated tools should include delays

## Terms of Service

API usage is subject to AI Dungeon's terms:
- Don't abuse the API
- Respect content policies
- Don't circumvent authentication
- Use responsibly

## Use Cases

### Scenario Management

- Bulk edit Story Cards
- Sync scripts from local development
- Backup/restore scenarios

### Automation

- Automated testing of scenarios (use own model endpoints; ToS forbits on-site automation)
- Data extraction for analysis
- Integration with other tools

### Development Tools

- External editors
- Script development workflows
- CI/CD for scenario content

## Limitations

- No official public API documentation
- Authentication tokens expire
- API may change without notice
- Intended for platform clients, not third-party apps

## Related Documentation

- [API Entities](api-entities.md)
- [Card Import/Export](../04-story-cards/card-import-export.md)

## Source References

- https://help.aidungeon.com/scripting
