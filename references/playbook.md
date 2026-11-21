# Minecraft playbook for an MCP-controlled player

This is practical strategy for a real survival world. It assumes default survival mechanics
and no cheats. Adapt to what `get_state` actually shows.

## Decision priorities

When unsure what to do next, use this order:

1. **Do not die.** Health, fall risk, lava, drowning, hostile mobs, night.
2. **Do not get lost.** Record the base coordinates; know the current dimension.
3. **Secure food.** Hunger stops sprinting and regeneration; at 0 it kills.
4. **Secure tools.** A pickaxe unlocks stone; a sword makes combat efficient.
5. **Secure shelter.** A lit, enclosed space for the night.
6. **Then progress.** Iron, diamonds, villages, Nether, building projects.

## Reading the state

- `player.health` ≤ 6: stop fighting, eat, retreat, shelter.
- `player.food` ≤ 6: eat before sprinting or fighting.
- `world.phase` = `dusk` or `night`: get indoors or light up the area.
- `player.in_water` and low `air`: swim up immediately (`move forward jump=true` while
  looking up, or `jump`), then to shore.
- `player.dead`: `respawn`, then re-read state; the inventory may be at the death spot.
- `view.block` is the crosshair target, not a magnetic "interact" target. Use coordinates
  for anything deliberate.

## Opening: wood to stone

1. `scan_blocks query="#minecraft:logs" radius=24`. If no logs, `move` to a new area or
   `scan_blocks radius=32`.
2. `goto` the nearest log's x/z. It may be 2–4 blocks above; `mine` needs reach. If the
   trunk base is close, mine the base; the log above falls as an item later.
3. `mine` 3–6 logs. Verify with `inventory`.
4. `craft item="oak_planks"` (use the actual wood type if known; query `planks` works).
5. `craft item="stick"`; `craft item="crafting_table"`.
6. `place` the table on solid ground; `use` its coordinates to open 3×3; `craft` wooden
   pickaxe and axe; `close_screen`.
7. `scan_blocks query="stone" radius=16`; `goto`; `mine` 20+ cobblestone. If the pickaxe
   breaks, craft another.
8. `craft` stone pickaxe, sword, axe, shovel; `craft` a furnace if you have stone.

Do not mine straight down. Do not stand in water while mining. Do not dig into lava.

## Food

- Passive mobs: `scan_entities query="cow"` (or `pig`, `sheep`, `chicken`), `goto`, then
  `attack entity_id=... times=3`. After the kill, walk over the drops (`goto` the death
  position) so they are picked up.
- Crops/villages: `scan_blocks query="wheat"` and `use` mature crops; villages have beds,
  chests and food. Do not steal from players.
- Cook meat in a furnace: `use` furnace, put fuel and raw food in via the container GUI.
  Container automation is limited; if the GUI is open, `close_screen` and try again.
- Never eat raw chicken unless desperate (hunger effect). Cook it.
- `use` with food in hand and `seconds=2.0` to eat.

## Shelter and night

- Simplest: dig into a hillside three blocks deep, `place` a block behind you, and wait.
  Make sure the hole is lit or enclosed; mobs can spawn in dark spaces.
- Better: a 3×3×3 room with a door, a torch, a bed and a crafting table. Build it before
  dusk.
- `wait` through the night only if the area is sealed and lit. Do not AFK in the open.
- A bed lets you sleep; `use` it at night. Sleeping sets the respawn point.

## Mining

- Always carry: pickaxe, sword, torches, food, blocks to pillar/plug.
- Branch mine at y ≈ -58 to -53 for diamonds (26.3 world height). Dig a 1×2 tunnel,
  placing torches every 8 blocks, and branch every 3 blocks.
- `scan_blocks query="diamond_ore" radius=8` while underground; `goto` is often blocked by
  stone, so mine a tunnel toward the target.
- Water and lava: a water bucket is invaluable. If lava is adjacent, do not mine the block
  holding it; place a block to seal it first.
- Gravel/sand can fall. Do not stand under it.
- `mine` chooses the best hotbar tool. Keep the pickaxe in the hotbar; `equip` can fetch it.

## Building and placing

- `place` fills one cell against a support block. Build from the bottom up, and keep
  yourself out of the target cell.
- For bridges, place while sneaking (`move` with `sneak=true`, or place then step) to avoid
  walking off edges. A safer bridge: place a block, step onto it, repeat.
- `face` is the direction from the target cell to the support. For a floor, support is
  below → `down`. For a wall, support is the adjacent block.
- Use `get_block` if a placement fails; the target may be tall grass or a slab.

## Combat

- Attack cooldown is ~12 ticks. `attack times=N` handles it; one call per target is fine.
- Keep the crosshair on the target and stay within 3 blocks. Back up while the cooldown
  ticks if the mob hits hard.
- Skeletons: close distance, strafe (`move left`/`right`), attack. Do not trade arrows.
- Creepers: hit once and back off; do not let them explode near your base.
- Endermen: do not look at them unless you intend to fight.
- If health is low, disengage, eat, and shelter. A lost fight is worse than a lost target.
- Do not attack players or their pets unless explicitly asked.

## Exploration

- Record the base coordinates in chat or in your notes. `get_state` gives x/y/z.
- Follow terrain rather than swimming long distances. `goto` handles up to 128 blocks.
- Villages: useful for beds, food, trades and iron. Do not break their buildings.
- Ruined portals and shipwrecks: check chests, then leave the structure intact.
- The Nether: bring blocks, food, a bow, and fire resistance if possible. Do not mine
  netherrack above lava. Build a portal back before exploring.
- The End: only with strong gear and eyes of ender. Not a first-session goal.

## Multiplayer etiquette

- `chat` is visible to everyone. Say what you are doing if you might interfere.
- Do not take from chests that are not yours; do not break builds; do not place lava/fire
  near spawn or builds.
- Server commands may be restricted. Use `chat command=true` only when appropriate.
- If a human asks you to stop, stop.

## Recovering from common failures

| Failure | What to do |
| --- | --- |
| Fell in a cave / lost | `get_state`; note y; mine up in a staircase if you have a pickaxe; place blocks to climb |
| Surrounded by mobs | pillar up 3 blocks with `place` (jump + place), then wait/attack from above |
| Out of food | `scan_entities` animals; `scan_blocks` crops; fish with a rod if available |
| Tool broke | `inventory`; `craft` a replacement; use stone before iron |
| Lost base | use coordinates; if none, follow the sun or a compass; build a new base |
| Stuck in a GUI | `close_screen` |
| Dead | `respawn`; return to death coordinates if safe; do not rush into the same mob |
| Action timed out | `get_state`; the action may have succeeded; continue from the real state |

## Session shape for an LLM

Keep a short plan in your head:

```text
Goal: iron pickaxe
1. get_state, check food/health/time           [done]
2. scan stone, mine 20 cobble                  [in progress]
3. craft stone pickaxe, sword                  [next]
4. find cave/ore, mine iron, furnace, smelt    [later]
```

Report progress to the human when a milestone is reached. Do not spend 50 tool calls
silently; summarize what changed and what is next.
