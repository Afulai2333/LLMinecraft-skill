# LLMinecraft MCP tool reference

All tools return text whose first field is usually `"ok": true/false`. A failed tool sets
`isError: true` and explains what to do next. Coordinates are block coordinates; `y` is the
player's feet. Actions run in real game time.

## Read-only inspection

### `get_state`

No arguments. Returns `player`, `world`, `held`, `offhand`, `inventory`, `view`,
`nearby_entities`, `threats`, `creatures`, `effects`, `screen`, `mcp_queued_actions`.

`threats` has `level` (`none`/`far`/`near`/`danger`), `count`, and up to eight hostiles with
`entity_id`, `type`, `name`, `distance`, `health`, `max_health`, `targeting_player`,
`creeper`, `x`, `y`, `z`.

`creatures` has `count`, `creatures` (all non-player living entities up to 16) and
`food_sources` (cow, pig, sheep, chicken, rabbit and fish). Each has `entity_id`, `type`,
`name`, `distance`, `health`, `max_health`, `hostile`, `food`, `x`, `y`, `z`. A
`food_nearby` event is pushed when hunger is ≤14.

```json
{
  "player": {
    "name": "Steve", "dimension": "minecraft:overworld",
    "x": 12.3, "y": 64.0, "z": -8.7,
    "block_x": 12, "block_y": 64, "block_z": -9,
    "yaw": 90.0, "pitch": 12.0,
    "health": 20.0, "food": 18, "saturation": 4.0,
    "on_ground": true, "in_water": false, "sprinting": false,
    "dead": false
  },
  "world": {
    "time_of_day": 6000, "day": 0, "phase": "day",
    "biome": "minecraft:plains", "light": 15,
    "standing_on": "minecraft:grass_block"
  },
  "held": {"slot": 0, "item": "minecraft:stone_pickaxe", "count": 1, "remaining": 131},
  "view": {"type": "block", "block": {"block": "minecraft:oak_log", "x": 13, "y": 65, "z": -9,
           "face": "north", "distance": 3.2}},
  "screen": ""
}
```

`view.block` is the crosshair target. `inventory.items` uses inventory slot indices;
`inventory.hotbar` always has nine entries and `selected_hotbar_slot` is 0-.

### `scan_blocks`

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `radius` | int 1-4 | 16 | Horizontal radius; vertical is capped at 16 |
| `query` | string | -| block id, name fragment, or `#tag` such as `#minecraft:logs` |
| `limit` | int 1-28 | 32 | maximum matches |

Returns `matches` sorted nearest first, each with `block`, `x/y/z`, `distance` and
`properties`; plus `match_count` and `scanned`. With no query, also returns
`common_blocks` with counts and one sample position each.

### `scan_entities`

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `radius` | number 1-4 | 24 | search radius |
| `entity` | string | -| type id or name fragment |
| `limit` | int 1-4 | 24 | maximum results |

Each entity has `entity_id` (use it for `look`/`attack`/`use`), `type`, `name`, `x/y/z`,
`distance`, `hostile`, `player`, `health`, `max_health`.

### `get_block`

Arguments `x`, `y`, `z`. Returns `block`, `properties`, `air`, `solid`, `replaceable`,
`hardness`, `requires_correct_tool`, `light`, `distance`, and `block_entity` if present.
Use it before mining an unfamiliar block or placing into an odd shape.

### `gui_state`

No arguments. Works on the main menu, onboarding, world list, world creation, options and
container screens. Returns the screen (`class`, `title`, `width`, `height`) and every
widget with a stable `index`, `class`, `message`, `x`, `y`, `width`, `height`, `active`,
`visible`; `EditBox` also exposes `value`. If in a world, also returns the container menu:
`container_id`, `menu_type`, `slot_count`, `carried`, and every slot with `index`, `x`, `y`,
`container_slot`, `container`, `active`, item id/name/count.

Use widget `index` with `gui_click` for buttons/sliders/fields; use `slot` for container
slots. At the main menu there is no player/menu, but widgets are still available.

### `gui_click`

| Argument | Type | Meaning |
| --- | --- | --- |
| `widget` | int optional | widget index from `gui_state`; triggers the normal button action |
| `slot` | int optional | menu slot index from `gui_state`; `-999` = outside the GUI |
| `x`, `y` | number optional | GUI coordinates for list rows or free-form targets |
| `button` | 1-2 | 1 = left, 2 = right (Minecraft `MouseButtonInfo` convention) |
| `action` | enum | `left`, `right`, `shift`, `throw`, `throw_all`, `swap`, `pickup_all` |
| `hotbar` | 0-8 | hotbar slot for `swap` |

Provide `widget`, `slot`, or both `x` and `y`. On menus, `widget` is the reliable choice:
it invokes the button's `onPress` callback. For a chest: open with `use`, `gui_state`, then
`gui_click slot=0 action=shift` to move the first stack into the inventory. On the main
menu: `gui_click widget=0` opens Singleplayer. Returns the new GUI state.

### `gui_type`

`text: string` (max 256), `replace: bool` (default false). Types into the focused text field
(world name/seed, anvil, sign, search). Click the field first if it is not focused;
`replace=true` clears the current value before typing.

### `gui_key`

`key: string`: `escape`, `enter`, `tab`, `backspace`, `space`, `up`, `down`, `left`,
`right`. Sends the key to the current screen (confirm dialogs, close menus, move focus).

### `gui_scroll`

`amount: number` (-20 to 20), optional `x`/`y` GUI coordinates (default screen center).
Scrolls the world list, options, resource packs and other lists.

### `inventory`

No arguments. Returns every non-empty slot, the hotbar (9 entries) and armor. Slot indices
are the same ones `get_state.inventory` reports; hotbar slots are 0-.

### `read_chat`

| Argument | Type | Default |
| --- | --- | --- |
| `limit` | int 1-00 | 30 |
| `kind` | string | all: `chat`, `system`, `actionbar` |

Returns `messages` with `at`, `kind`, `text`.

## Movement

### `look`

Provide **one** of:

- `yaw` + optional `pitch` (absolute degrees)
- `x`, `y`, `z` (look at this point)
- `entity_id`

Returns the resulting `yaw`, `pitch` and crosshair `view`. Yaw: 0 south, 90 west, -90 east,
±180 north. Pitch: -90 up, 90 down.

### `move`

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `direction` | enum | required | `forward`, `back`, `left`, `right` |
| `seconds` | number 0.05-5 | 1.0 | how long to hold the key |
| `sprint` | bool | false | hold sprint |
| `sneak` | bool | false | hold sneak |
| `jump` | bool | false | hold jump while moving |

Returns final `x/y/z`, `moved_blocks`, `on_ground`. Short bursts are safer than long walks.
Fails if a GUI is open or the player is riding.

### `jump`

`forward: bool` (default false). Jumps in place, or forward.

### `goto`

| Argument | Type | Meaning |
| --- | --- | --- |
| `x` | int | destination block x |
| `z` | int | destination block z |
| `y` | int optional | destination feet y; omit to find the surface |

A* pathfinding: walks, steps up one block, drops up to three, rejects lava/fire/cactus.
It does **not** mine, swim long distances, open doors or bridge. Up to 128 blocks from the
player. Returns `Reached ...` on success, or an error explaining blockage. It recomputes the
path twice on getting stuck, then fails. For a blocked route, mine a tunnel or use `move`.

### `wait`

`seconds: number` 0.1-0, default 1. Lets game time pass.

## Interaction

### `mine`

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `z` | int | required | block to break |
| `auto_tool` | bool | true | select the best hotbar tool |
| `tool` | string optional | hotbar item id/name to use instead of the best tool |
| `tool_slot` | int 0-8 optional | exact hotbar slot; overrides `tool` and `auto_tool` |

The player must be within reach (~4.5 blocks) and the block loaded. The mod looks at it and
**holds the vanilla attack key**, so survival destroy progress accumulates like a human
long-press; it returns when the block is gone. Unbreakable blocks,
missing line of sight and out-of-reach targets fail with a message. In creative the block
breaks instantly.

### `place`

| Argument | Type | Meaning |
| --- | --- | --- |
| `x`, `y`, `z` | int | position to fill (must be air/replaceable) |
| `block` | string optional | hotbar item id/name; otherwise the held item |
| `face` | enum optional | direction from target to the support block: `up/down/north/south/east/west`; auto by default |

The support block is the neighbour being clicked. Example: filling the air above grass,
support is below →`face="down"`. Returns when the block appears. Fails if the player
occupies the space, there is no support, or the item is not a BlockItem.

### `use`

| Argument | Type | Meaning |
| --- | --- | --- |
| `x`, `y`, `z` | int optional | right-click this block |
| `entity_id` | int optional | interact with this entity |
| `hand` | `main`/`offhand` | default main |
| `seconds` | number | how long to hold right-click for held-item use (default 2.0; food needs ~1.6) |

With a block it opens chests/tables/furnaces/doors and returns the resulting `screen`.
With an entity it interacts (trade, mount, shear, etc.). With no target it holds right-click
on the held item: eat food, drink potion, charge a bow, etc. Close containers with
`close_screen` before moving.

### `attack`

| Argument | Type | Meaning |
| --- | --- | --- |
| `entity_id` | int optional | exact target from `get_state`/`scan_entities` |
| `entity` | string optional | nearest type/name match within 24 blocks |
| `times` | int 1-0 | attacks, default 1 |

Respects the attack cooldown (about 12 ticks between hits). Target must be in reach; use
`goto` first for distant mobs. Returns attacks made and remaining target health.

### `sleep` (time sleep)

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `seconds` | number 0.1–60 | 5 | how long the world should run |

Runs the world for the requested duration with the idle tick freeze **suspended**. Use it for
furnaces, crops, mob movement, effects and daylight. Returns `world_ticks`, `time_of_day`,
`phase` and player status. This is not bed sleep; use `sleep_in_bed` for that.

### `sleep_in_bed`

Sleep in a nearby bed to skip the night. Requires night or a thunderstorm, and the bed must
be within reach (use `goto` first). `search_radius` 2–24, default 8. Monsters nearby can
prevent sleep. Returns the new time of day.

### `close_screen`

No arguments. Closes any open GUI/container without dropping items.

### `respawn`

No arguments. Only works when dead. Waits for the respawn, returns new position/health.

## Inventory and crafting

### `select_item`

`slot: int 0-`. Selects the hotbar slot (0 leftmost). Does not move items.

### `equip`

`item: string`. Finds a matching item in the hotbar or main inventory, moves it into the
selected hotbar slot if needed, and selects it. This is the reliable way to get a pickaxe
or sword into your hand.

### `drop`

`all: bool` default true. Drops the held stack (all) or one item.

### `craft`

| Argument | Type | Meaning |
| --- | --- | --- |
| `item` | string | output item id or name |
| `times` | int 1-4 | how many crafts, default 1 |
| `close` | bool | close the screen when done, default false |

Uses the vanilla recipe book. With no screen open it uses the 2×2 inventory grid. For a
3×3 recipe, first `use` a crafting table, then call `craft` while the crafting screen is
open (and optionally `close=true`). Recipes must be known/unlocked; missing ingredients
produce an error. The tool places ingredients and shift-clicks the result.

## Automatic events

The server pushes `notifications/message` events over `GET /mcp` with
`Accept: text/event-stream`. Event types:

| Type | Meaning |
| --- | --- |
| `world_joined` | player entered a world; dimension, position, health, game mode |
| `damage` | health dropped by ≥1.5; includes remaining health |
| `health_low` | health crossed ≤6 |
| `death` / `respawn` | player died / respawned |
| `time_phase` | day/dusk/night changed |
| `threat` | new hostile within warning distance; includes entity fields |
| `food_nearby` | hunger ≤14 and a food animal is nearby; includes entity id/type/distance |
| `chat` | chat/system message |
| `control` | agent/requested/user control transition |

Each event has `id`, `type`, `level`, `time` and `data`. `get_events` returns the bounded
history for clients that cannot hold SSE open:

### `get_events`

| Argument | Type | Default |
| --- | --- | --- |
| `since_id` | int | 0 |
| `limit` | int 1–100 | 30 |

Returns `latest_id` and `events` where `id > since_id`.

## Control ownership

Human keyboard/mouse input is disabled once the agent makes its first MCP call. The agent
cannot unlock it directly; it must request a handover, and the human must agree.

### `request_user_takeover`

`reason: string` (optional, ≤200). Opens a modal Agree/Refuse dialog on the game screen.
Only **Agree** unlocks physical input and gives the human control; **Refuse** (or Esc/Cancel)
keeps the agent in control. While the dialog is open and after Agree, agent actions are
rejected. The human ends their takeover with **Ctrl+C**, which locks input and returns
control to the agent. Poll `control_status` until `mode` becomes `agent`.

### `control_status`

No arguments. Returns `mode` (`agent`, `requested`, `user`), `prompt_open`, `active`,
`agent_can_act`, `user_has_control`, `input_locked`, `mouse_grabbed`, `takeover_end_key`
(`Ctrl+C`), `reason`, `in_world` and `mcp_running`. While the agent controls the game,
`mouse_grabbed` is false so the cursor remains available to the operating system.

### `resume_control`

No arguments. Agent-side cancel for a pending request; closes the dialog and returns to
`agent`. Refused if the human already controls the player — only Ctrl+C can end that.

## Communication

### `chat`

| Argument | Type | Meaning |
| --- | --- | --- |
| `message` | string ≤256 | text, or command without leading slash |
| `command` | bool | if true, send as a server command |

Chat is public and may be moderated. Respect server rules. Commands depend on permissions.

## Visual

### `screenshot`

No arguments. Captures the current frame, saves `screenshots/llmcraft-<time>.png`, and
returns the image plus position/rotation/held item metadata. Images include the HUD and
chat. Use sparingly; `get_state` is cheaper. Disabled if `screenshots` is false. Images over
3 MiB are only referenced by path.

## Error semantics

- `isError: true` with a sentence: the call did not do what you asked; read it.
- `No world is loaded.` -join a world.
- `A GUI screen is open` -`close_screen` first.
- `out of reach` / `too far` -`goto` closer.
- `Action timed out` -the action may have partly completed; `get_state` before retrying.
- `No route found` -mine a path, use `move`, or pick a closer target.
- `No known recipe` -the recipe is not unlocked or the name is wrong; inspect the item id.
