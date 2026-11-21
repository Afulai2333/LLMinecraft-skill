# Minecraft MCP Pilot skill

A skill bundle for an LLM agent that plays Minecraft: Java Edition 26.3 through the
**LLMinecraft** Fabric mod. The mod runs an MCP server inside the game; this skill teaches
the agent what the tools do, how to connect, and how to survive.

## Contents

```text
SKILL.md                     main instructions (frontmatter + control loop + guardrails)
references/connecting.md     MCP endpoint, client configs, auth, troubleshooting
references/tools.md          all 34 tool signatures and return shapes
references/playbook.md       survival, mining, building, combat, exploration patterns
scripts/mcp-client.mjs       stdio <-> Streamable HTTP bridge + CLI
examples/mcp.json            example client configuration
```

## Install the mod

1. Install Fabric Loader 0.20.1 for Minecraft 26.3.
2. Put `llmcraft-0.1.0.jar` and **Fabric API 0.166.2+26.3** in `.minecraft/mods/`.
3. Launch the game, join a world. The mod logs `MCP server listening on
   http://127.0.0.1:8765/mcp`.
4. In game: `/llmcraft status`.

Build it yourself from the [mod repository](https://github.com/Afulai2333/LLMinecraft):

```bash
cd LLMinecraft
JAVA_HOME=/path/to/jdk-25 ./gradlew build
# build/libs/llmcraft-0.1.0.jar
```

## Connect the skill to an agent

The skill is a prompt bundle, not an MCP client by itself. Add the endpoint to whichever
agent runtime you use:

- **HTTP-native**: `http://127.0.0.1:8765/mcp` (Streamable HTTP).
- **stdio-only**: launch `node scripts/mcp-client.mjs` with
  `LLMCRAFT_MCP_URL=http://127.0.0.1:8765/mcp`.

See `references/connecting.md` for exact JSON.

## Smoke test

```bash
node scripts/mcp-client.mjs call get_state '{}'
node scripts/mcp-client.mjs call scan_blocks '{"query":"#minecraft:logs","radius":24}'
node scripts/mcp-client.mjs call screenshot '{}'
```

`get_state` should return a JSON object with a `player` position. If it says
`No world is loaded.`, join a world first.

## Safety

The MCP endpoint controls a real game account. Keep it on loopback. If you must expose it,
set `requireToken=true`, use a strong token, and reach it through SSH/VPN only. The agent
can chat, move, mine, build and fight; review its actions and server rules before letting it
play unattended.
