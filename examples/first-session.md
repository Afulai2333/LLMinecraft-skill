# Example: first 10 minutes

A realistic call sequence for a fresh survival world. Times are approximate; always read the
result before the next call.

```text
get_state

scan_blocks {"query":"#minecraft:logs","radius":24}
goto {"x":-34,"z":18}
mine {"x":-34,"y":67,"z":18}
mine {"x":-34,"y":68,"z":18}
mine {"x":-34,"y":69,"z":18}
inventory

craft {"item":"oak_planks"}
craft {"item":"stick"}
craft {"item":"crafting_table"}
place {"x":-31,"y":65,"z":20,"block":"crafting_table","face":"down"}
use {"x":-31,"y":65,"z":20}
craft {"item":"wooden_pickaxe"}
close_screen

scan_blocks {"query":"stone","radius":12}
goto {"x":-27,"z":24}
mine {"x":-27,"y":64,"z":24}
...
craft {"item":"stone_pickaxe"}
craft {"item":"stone_sword"}
```

Notes:

- The `y` values above are examples. `get_state.world.standing_on` and `scan_blocks`
  positions tell you the real surface.
- After `use` on the crafting table, the GUI is open; `craft` uses it, then `close_screen`
  so `goto`/`move` work again.
- If a block is out of reach, `goto` within ~3 blocks first. The error message tells you the
  current distance.
- `mine` auto-selects the best hotbar tool, but it cannot craft the tool for you.
