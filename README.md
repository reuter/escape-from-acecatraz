# Escape from Ace-catraz (browser version)

A playable single-page version of the cooperative card game *Escape from Ace-catraz*: a standard 52-card deck plus 18 extra cards (17 security cards and the Alarm Sounds card), for 2 to 4 players. You play seat one against CPU inmates. Everyone can see every hand except their own.

## Play

Open `index.html` in a browser. It is one self-contained file apart from the Google Fonts stylesheet.

## Layout

| Path | What it is |
| --- | --- |
| `src/engine.js` | Rules, setup, turn phases, knowledge tracking. Works in the browser (`window.Ace`) and in Node. |
| `src/cpu.js` | CPU crew: hint selection, planting, Distract, Riot swaps, breakthrough decisions. |
| `src/ui.js`, `src/style.css` | The page. |
| `src/sim.js` | Plays thousands of CPU-only games to catch illegal moves and measure win rates: `node src/sim.js 1000` |
| `build.sh` | Bundles everything into `index.html`. |

Rebuild after editing anything in `src/`:

```sh
./build.sh
```

## Rules as implemented

- Setup: 7, 5 or 3 obstacles for 2, 3 or 4 players, with 1, 2 or 3 HARD cards shuffled in before the draw. Unused security cards form the patrol deck. The escape direction is chosen after the lock levels are visible.
- Actions: Play my part, Guard check, Distract, Riot, Pass, then an optional Breakthrough.
- Riot needs at least 5 flashlight cards left, discards 5, then swaps any two cards (own, another player's, or the discard pile; at least one from a hand). A card that moves into another player's hand becomes known to its new holder.
- Pass is available once the Alarm Sounds card is visible, or when a player has no other legal action.
- Everyone passing in a row, or everyone running out of cards with obstacles left, loses.
