# Connecting an agent to LLMinecraft

The mod embeds a **Streamable HTTP** MCP server. There is nothing to host separately: start
Minecraft with the mod, join a world, and point the agent at the URL.

## Endpoint and health

```text
MCP:    http://127.0.0.1:8765/mcp
Health: http://127.0.0.1:8765/health
```

Quick checks:

```bash
curl -s http://127.0.0.1:8765/health
# {"ok":true,"name":"llmcraft","version":"0.1.0","tools":34,...}

curl -s -X POST http://127.0.0.1:8765/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

In game: `/llmcraft status`, `/llmcraft start`, `/llmcraft stop`, `/llmcraft restart`,
`/llmcraft token`, `/llmcraft tools`.

## Default configuration

`config/llmcraft.json` (created on first launch):

```json
{
  "enabled": true,
  "host": "127.0.0.1",
  "port": 8765,
  "authToken": "<random>",
  "requireToken": false,
  "allowRemote": false,
  "actionTimeoutSeconds": 45,
  "maxActionSeconds": 30,
  "allowChat": true,
  "showChatFeedback": true,
  "freezeWhenIdle": true,
  "freezeDelayTicks": 10,
  "screenshots": true,
  "screenshotScale": 2,
  "maxScanRadius": 64
}
```

- `requireToken=false` is convenient for local loopback play. Set it to `true` whenever
  another account or a remote machine can reach the port, then send
  `Authorization: Bearer <authToken>`.
- `allowRemote=false` forces the bind address back to loopback. Only change it together
  with a token and a trusted network (VPN/SSH tunnel recommended).
- `freezeWhenIdle=true` pauses the integrated server when no tool is running, so the world
  does not change while the model thinks. This is singleplayer / LAN-host only; a remote
  multiplayer server cannot be frozen by the client. Toggle with `/llmcraft freeze`.
- Restart the server with `/llmcraft restart` after editing the file.

## Server-pushed events (SSE)

The mod sends automatic events (threats, damage, death, chat, world join, day/night,
control handovers) as MCP `notifications/message` on a long-lived stream:

```text
GET /mcp
Accept: text/event-stream
Authorization: Bearer <token>   (only if requireToken=true)
```

If your client does not open `GET /mcp` itself, it will not receive pushes. The bundled
stdio bridge opens the stream automatically. As a fallback, call `get_events` with the last
seen `id`; the server keeps a bounded history.

## HTTP-native MCP clients

Use a Streamable HTTP / HTTP transport entry named `minecraft`:

```json
{
  "mcpServers": {
    "minecraft": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:8765/mcp"
    }
  }
}
```

If your client uses a different key than `type` (some use `transport: "http"`), keep the
same `url`. Add a header only when the token is required:

```json
{
  "mcpServers": {
    "minecraft": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:8765/mcp",
      "headers": { "Authorization": "Bearer <authToken>" }
    }
  }
}
```

The server answers `initialize`, `tools/list`, `tools/call`, `ping`, and tolerates
`resources/list` / `prompts/list` with empty lists. It does not provide a standalone GET
SSE stream; it uses per-request responses (JSON or a single SSE event when the client only
accepts `text/event-stream`).

## stdio-only clients

Many desktop clients launch a local command and speak JSON-RPC over stdin/stdout. Use the
bundled bridge:

```json
{
  "mcpServers": {
    "minecraft": {
      "command": "node",
      "args": ["D:/Afulai2333/Projects/LLMinecraft/skill_src/dev/scripts/mcp-client.mjs"],
      "env": {
        "LLMCRAFT_MCP_URL": "http://127.0.0.1:8765/mcp"
      }
    }
  }
}
```

Set `LLMCRAFT_MCP_TOKEN` in `env` when needed. Node 18+ is required. Test it directly:

```bash
node skill_src/dev/scripts/mcp-client.mjs call get_state '{}'
node skill_src/dev/scripts/mcp-client.mjs call scan_blocks '{"query":"#minecraft:logs","radius":24}'
```

## Failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ECONNREFUSED` | game not running, world not joined, or server stopped | start the game/world; `/llmcraft start` |
| `404` on `/mcp` | wrong path or another service on the port | check `config/llmcraft.json`, `/llmcraft status` |
| `401 Unauthorized` | `requireToken=true` without header | add `Authorization: Bearer ...` or set `requireToken=false` locally |
| tools list works, calls say `No world is loaded` | still at main menu | join a world |
| `Action timed out` | long walk/mine, or game paused | `get_state`, then continue; do not retry blindly |
| port already in use | another process owns 8765 | change `port` and `/llmcraft restart` |
