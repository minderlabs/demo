# CHANGELOG

TODO(burdon): Tie changelog to version (and display in app). Grunt version bump.

## 11/03/16

- Node server implements socket.io and clients connect on startup.
    - /clients shows the list of connected clients.
- New status bar on bottom (from left-to-right):
    - LHS
        - Clients link
        - GraphiQL link
        - Refresh button (refect all queries)
    - RHS
        - Network indicator
        - Error indicator (click to reset)
- Database mutations (create and update) trigger invalidation websocket message that causes clients to refetch.
