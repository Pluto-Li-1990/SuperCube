# SuperCube Online Launch Checklist

This checklist defines the minimum bar for shipping online PvP in v1.0.

## v1.0 Scope

- Online PvP is guest quick match only.
- No account system, ranking, friend list, chat, purchases, ads, or analytics.
- No reconnect/resume after a player leaves or loses connection.
- App Store copy should describe online play as quick matching, not ranked competition.

## Client Checks

- Cold launch loads the bundled local game on simulator and a physical iPhone.
- Online Battle starts matchmaking without asking for a server URL.
- Matchmaking failure text asks the player to check network/retry, not to edit a server address.
- Back/return from matchmaking cancels waiting cleanly.
- Opponent leaving a match shows a clear win/return state.
- Two devices on different networks can enter one online match and play at least 20 turns.
- Privacy Policy URL in App Store Connect points to:
  `https://pluto-li-1990.github.io/SuperCube/privacy.html`

## Server Checks

- Health check returns JSON:
  `https://match.supercubegame.com/healthz`
- The same health check must pass from a normal external network, not only from inside the ECS machine.
- If the server runs on a Mainland China ECS, the public domain must complete ICP filing before release. A `Non-compliance ICP Filing` page means online PvP is not launch-ready.
- WebSocket upgrade succeeds:
  `wss://match.supercubegame.com/`
- `supercube-netcode.service` is enabled and active on ECS.
- `nginx.service` is enabled and active on ECS.
- Let’s Encrypt certificate auto-renew task exists.
- Alibaba Cloud security group exposes only the required public ports:
  - `80` for HTTP certificate renewal/redirect
  - `443` for HTTPS/WSS
  - `22` restricted to the developer’s current trusted IP
- Port `8090` is not public; it should only be reached by Nginx on `127.0.0.1`.

## Server Acceptance

- `cd server && npm test` passes.
- Server rejects invalid JSON and binary messages without crashing.
- Server caps WebSocket payload size.
- Server sanitizes player names and custom piece bags before matching.
- Waiting, cancel queue, match found, ordered turns, opponent disconnect, and stress relay tests pass.

## Release Gate

Do not submit a new App Store build as online-ready until all items above pass on the build uploaded to TestFlight.

## Future Work

- Optional account system and persistent names.
- Ranked/season play and leaderboards.
- Better reconnect/resume support.
- Server observability dashboard and alerting.
