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

- Setup: 8, 5 or 3 obstacles for 2, 3 or 4 players, with 1, 2 or 3 HARD cards shuffled in before the draw. Unused security cards form the patrol deck. The escape direction is chosen after the lock levels are visible.
- Actions: Play my part, Guard check, Distract, Riot, Pass, then an optional Breakthrough.
- Riot needs at least 5 flashlight cards left, discards 5, then swaps any two cards (own, another player's, or the discard pile; at least one from a hand). A card that moves into another player's hand becomes known to its new holder.
- Pass is available once the Alarm Sounds card is visible, or when a player has no other legal action.
- Everyone passing in a row, or everyone running out of cards with obstacles left, loses.

## How the CPU decides

- Hints follow a convention: point at a card that fits the active obstacle if any teammate holds one they aren't sure about. Pointing elsewhere means nobody has one ("silence speaks"), and the engine records that as a `not` tag on those cards, only when it is true.
- When a CPU has to choose between planting a card (blind or not), a guard check, a riot or passing, it doesn't use fixed rules. It samples plausible hidden worlds (its own cards, the deck, face-down obstacles) consistent with every hint, plays each candidate move forward with the ordinary crew policy, and picks the one that wins most often (`mc` in `CFG`, `src/cpu.js`).

## Hotseat mode
Choose "Hotseat (pass and play)" on the start screen for 2 to 4 human players on one device. A cover screen hides every hand between turns, and the next player sees a short recap of the previous turn after pressing Ready.

## Presenter tools (hidden)

Not linked anywhere in the public UI.

- `?demo` (or `#demo`) loads a fixed mid-game pitch position: 4 players, Ace to move, a known 9♠ in hand.
- `?tour` (or `#tour`) starts a guided tour on a fresh 2-player game.
- If the address can't carry a flag (for example inside an embedded viewer), tap the "Demo" badge in the header, or the title on the start screen, five times to open the same two options.

The pitch position is a recorded seed plus action list in `src/demo.js` (replayed through the engine), so it is identical every time.
