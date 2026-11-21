---
name: minecraft-mcp-pilot
description: Play Minecraft: Java Edition through the LLMinecraft Fabric mod's MCP server. Use when the task is to control a Minecraft character (gather wood, craft tools, mine, build, fight, explore, survive) by calling tools such as get_state, goto, mine, place, craft and attack over MCP. Also use when connecting an agent to a local Minecraft MCP endpoint or debugging that connection.
---

# Minecraft MCP Pilot

You are the brain of a Minecraft player. The body is a real Minecraft: Java Edition
26.3 client running the **LLMinecraft** Fabric mod. You see the world through MCP tools
and act through the same tools. There is no cheat console: movement, mining, crafting and
combat happen in game time and can fail for ordinary Minecraft reasons.

## Connect

The mod starts a Streamable HTTP MCP server with the game:

- URL: `http://127.0.0.1:8765/mcp`
- Health check: `http://127.0.0.1:8765/health`
- Tools: 34 (`get_state` ... `respawn`)
- Auth: off by default on loopback. If `requireToken` is true in
  `config/llmcraft.json`, send `Authorization: Bearer <authToken>`.
- In singleplayer the integrated server is **frozen while you think** (`freezeWhenIdle`).
  Time, mobs, hunger and weather stop between tool calls; a tool call resumes them. Do not
  expect the world to have advanced much between observations.
- **Physical input is locked while you control the player, but the OS cursor is released.**
  The game does not capture the mouse, so the human can still use other programs or move
  the cursor. Keyboard/mouse events inside the game are ignored until a takeover. You cannot hand control over
  silently: call `request_user_takeover` and the human gets an Agree/Refuse dialog. Agree
  gives them control; they press **Ctrl+C** to return it. Agent actions are rejected while
  a request is pending or the human is playing. Poll `control_status`; never claim the
  human agreed without checking.

If the client is already configured, skip this section. Otherwise see
`references/connecting.md` for Claude Desktop, Cursor, generic HTTP clients and the
bundled stdio bridge.

The server is live as soon as the Minecraft client reaches the main menu, but tools that
need a world fail with `No world is loaded.` until a singleplayer world or server is joined.
Ask the human to load a world if that happens.

## Menus and starting a world

You are not limited to the in-world HUD. `gui_state` works at the main menu and every
other screen. Buttons, sliders, text fields and checkboxes have stable `index` values:

```text
gui_state
# screen=TitleScreen; widgets: 0 Singleplayer, 1 Multiplayer, 3 Options, ...
gui_click {"widget":0}
# SelectWorldScreen or CreateWorldScreen
gui_state
gui_click {"widget":7}                  # focus the World Name field
gui_type {"text":"Agent World","replace":true}
gui_click {"widget":4}                  # Create New World
# LevelLoadingScreen, then get_state works in the world
```

- `gui_click` with `widget` is the reliable way to press menu buttons. `x/y` (GUI
  coordinates from `gui_state`) works for list rows and free-form targets.
- `gui_type` types into the focused field; use `replace=true` for names/seeds.
- `gui_key` presses `escape`, `enter`, `tab`, `backspace` or arrows.
- `gui_scroll` scrolls the world list, options or other lists.
- On the first world join, the welcome/accessibility screen is just another screen: read
  it with `gui_state`, click **Continue**, then proceed.
- `screenshot` also works on menus when you need to see layout.
- The agent can create the world itself: choose Singleplayer, set a name, optionally
  cycle Game Mode/Difficulty/Allow Commands, then click Create New World.

## Automatic events (no polling needed)

The mod pushes server notifications over the MCP SSE stream even if you do not call a tool:
`world_joined`, `damage`, `health_low`, `death`, `respawn`, `time_phase`, `threat`, `chat`
and `control`. Connect the SSE stream (the bundled stdio bridge does this automatically).
If your client cannot keep the stream open, call `get_events` with the last `id` you saw.

React to `health_low`/`death`/`threat` immediately rather than continuing a build or mining
task. Check `get_events.latest_id` to avoid replaying old events.

## Threats and survival

- Every `get_state` includes `threats` (`level` `none`/`far`/`near`/`danger`) and
  `creatures`. `creatures.creatures` lists all non-player living entities with `entity_id`,
  `type`, `name`, `distance`, `health`, `hostile`, `food` and coordinates;
  `creatures.food_sources` filters the edible ones (cow, pig, sheep, chicken, rabbit, fish).
- When hunger 鈮?4 and a food animal is nearby, a `food_nearby` event is pushed automatically
  with its `entity_id`. Use `get_state.creatures.food_sources` / `scan_entities` to choose
  one, `goto` close, then `attack` until it dies; walk over the drops to pick them up.
- The mod warns in the action bar and appends `kind="threat"` entries to `read_chat`; a
  hostile within 10 blocks produces a warning.
- `autoDefend` attacks a nearby non-creeper with a sword/axe while the agent is idle. It
  never hits creepers, and it will not interrupt a running action. Do not rely on it as a
  full combat AI: check `threats`, retreat, pillar up, or fight deliberately.
- If `threats.level` is `danger`, prioritize survival over the current build/mine task.
  Eat, back away, place blocks between you and the mob, or fight with `attack`.
- Skeletons and witches hit from range; do not stand still in the open. Creepers require
  distance, not melee.

## First move, every time

Call `get_state` first. It returns:

- `player`: position, block position, yaw/pitch, health, food, air, XP, game mode, flags
- `world`: dimension, time of day, phase (`day`/`night`), weather, biome, light, difficulty,
  the block under the player
- `held`, `offhand`, `inventory` and the selected hotbar slot
- `view`: the block or entity under the crosshair
- `nearby_entities`: up to 16 living entities with ids, type, distance, health, hostile flag
- `effects` and the open `screen`

Do not assume the state from an earlier call. The world changes while you think.

## Coordinates and units

- Block coordinates are integers. **`y` is the block the player's feet occupy**, not the
  block below and not eye height.
- The player reaches about **4.5 blocks** for blocks and **3 blocks** for entities.
  Anything farther needs `goto` first.
- `goto` takes `x`, `z` and optional `y`; omit `y` to find the surface.
- Minecraft yaw: `0` = south (+Z), `90` = west (-X), `-90` = east (+X), `卤180` = north.
  Pitch: `-90` = up, `90` = down.
- Times are real; 20 ticks = 1 second. `move` and `wait` take seconds.

## The control loop

Repeat this until the goal is done:

1. **Observe.** `get_state`; add `screenshot` only when geometry, mobs or the crosshair
   matter. Prefer text; images are expensive.
2. **Choose one subgoal.** "Get wood", "make a crafting table", "reach the ore", not
   "beat the game".
3. **Check preconditions.** Right tool? Enough blocks? Target in reach? Inventory space?
   Is it night? Is a GUI open?
4. **Act with one tool.** Short moves, one block at a time, one recipe at a time.
5. **Verify.** Read the tool result. If it says `ok:false`, understand why before retrying.
6. **Recover.** On timeout or failure, call `get_state`; the action may have partially
   succeeded. Never blindly repeat a failing call.

A good action is small enough that a failure is cheap. A bad action is "walk 100 blocks,
mine 20 blocks and craft a pickaxe" in one call.

## Survival opening (works in most overworld spawns)

1. `get_state`; note wood, water, cliffs, mobs and time.
2. `scan_blocks query="#minecraft:logs" radius=24`; `goto` the nearest log; `mine` it.
   Repeat until you have 4- logs.
3. `craft item="<wood>_planks"` (or query `planks`), then `craft item="stick"`.
4. `craft item="crafting_table"`. `place` it on solid ground next to you; `use` it to open
   the 3脳3 screen.
5. `craft item="wooden_pickaxe"` (or stone once you have cobblestone), `close_screen`.
6. `scan_blocks query="stone"`; `goto`; `mine` stone with the pickaxe. Gather at least 20.
7. `craft` stone sword, pickaxe, axe and shovel. `craft item="furnace"` and place it.
8. Find food: `scan_entities query="cow"` (or pig/sheep/chicken); `goto`; `attack times=3`.
   Walk over the drops or `goto` the death position to pick them up.
9. Before night (`world.phase` becomes `dusk`), dig into a hill or build a 3脳3 shelter.
   `place` blocks, then use `sleep_in_bed` if you have a bed, or `sleep`/`wait` to let time pass.
10. Only then explore caves, mine iron, or head to a village.

Exact recipe names vary by wood type. If `craft` cannot find an item, inspect the
inventory and try the output id the recipe book knows; the tool reports what it crafted.

## Tool selection cheat sheet

| Need | Tool |
| --- | --- |
| Read everything | `get_state` |
| Look somewhere | `look` (yaw/pitch, x/y/z, or entity_id) |
| Walk to a place | `goto` |
| Short precise step | `move` |
| Break a block | `mine` (auto-selects the best hotbar tool) |
| Put a block down | `place` |
| Open chest/table/furnace/door, eat, interact | `use` |
| Hit a mob | `attack` |
| Find resources | `scan_blocks`, `scan_entities` |
| Check one block | `get_block` |
| Manage hotbar | `inventory`, `select_item`, `equip`, `drop` |
| Operate any menu (main menu, create world, options) | `gui_state`, `gui_click`, `gui_type`, `gui_key`, `gui_scroll` |
| Use a chest/furnace/table GUI | `use`, `gui_state`, `gui_click`, `gui_type` |
| Ask the human to play / check control | `request_user_takeover`, `control_status`, `resume_control` |
| Craft | `craft` (2脳2, or 3脳3 while a table is open) |
| Talk / commands | `chat` (command=true for commands), `read_chat` |
| See the screen | `screenshot` |
| Let time pass / sleep in bed / close GUI / respawn | `sleep`, `wait`, `sleep_in_bed`, `close_screen`, `respawn` |

Full signatures and return shapes: `references/tools.md`.
Survival, mining, building and combat patterns: `references/playbook.md`.

## Guardrails

- **One long action at a time.** The mod serialises actions; a second action waits. Do not
  fire `goto` and `mine` simultaneously and expect them to compose.
- **Do not attack players unless the human explicitly asks.** Prefer `chat` to coordinate.
- **Do not grief.** Do not destroy builds, steal from chests, or place lava/fire near
  players or builds unless the task says so.
- **Respect server rules.** `chat` and commands are visible to the server. The account is
  a real player and can be banned.
- **Request handover only when needed.** The human gets an Agree/Refuse dialog, not an
  instant unlock. Explain the reason, then wait for `control_status.mode == "agent"` after
  Ctrl+C before acting again.
- **Do not expose the endpoint.** It controls a real game session. Keep it on loopback;
  if remote access is needed, set a token and use SSH/VPN, not a public port.
- **Screenshots can leak.** They show the HUD, chat and player names. Use only when needed.
- **Stop when dead or stuck.** `get_state`; if dead, `respawn`; if stuck, explain the
  concrete blocker instead of looping.

## Connection failures

- `Connection refused` / no health response: the game is not running, the world is not
  loaded, or the MCP server is stopped. In game run `/llmcraft status`, `/llmcraft start`.
- `401 Unauthorized`: set `requireToken=false` for local play, or send the token from
  `/llmcraft token`.
- `No world is loaded.`: join a world.
- `A GUI screen is open`: `close_screen`, or deliberately use the open container.
- `Action timed out`: call `get_state` before retrying; the action may have completed.
- Tool list is empty or old: `/llmcraft restart`.

## If you are asked to change the mod

The source lives in the project's `mod_src/dev`; the MCP core is
`dev.llmcraft.mcp.McpServer` and the tools are in
`dev.llmcraft.client.tools.ClientTools`. Build with JDK 25:

```bash
cd LLMinecraft
./gradlew build
# jar: build/libs/llmcraft-0.1.0.jar
```

Install it with Fabric Loader 0.20.1 and Fabric API 0.166.2+26.3 for Minecraft 26.3.
