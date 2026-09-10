# Smart Puzzles

Logic puzzle apps for iOS and Android, each with an AI coach that explains the move
instead of just making it.

**Studio site:** https://smartpuzzlesapps.online
**Contact:** general@smartpuzzlesapps.online

---

## What this repository is

This repo serves the public legal and support pages for every Smart Puzzles app, at
https://smartpuzzles.github.io — the privacy policy and terms of use that all six apps
link to from their settings screens and store listings.

- Privacy policy — https://smartpuzzles.github.io/
- Terms of use — https://smartpuzzles.github.io/terms/

The apps themselves are closed-source and live in private repositories. This is a GitHub
Pages site, not the app source.

---

## The series

Six logic puzzle apps. Different rules, different generators, different solvers, one
shared coaching layer.

| App | Puzzle type | Boards | Status |
|---|---|---|---|
| Smart Sudoku | Classic Sudoku | 6×6, 9×9 | Store listing in preparation |
| Smart Crownfall | Star Battle | 5×5 – 12×12, plus multi-star boards | Store listing in preparation |
| Smart Zigline | Number path | 5×5 – 15×15 | Store listing in preparation |
| Smart Wordvine | Word path | 5×5 – 8×8 | Store listing in preparation |
| Smart Binairo | Binary logic / Takuzu | 6×6 – 14×14 | Store listing in preparation |
| Smart Shikaku | Rectangle division | 4×4 – 12×12 | Store listing in preparation |

None of the six are live on the App Store or Google Play yet. This table updates when
that changes.

---

## The AI Coach

Every app ships the same contract, implemented against its own technique library:

- **It names the technique.** Naked single, hidden pair, X-Wing, Y-Wing, Swordfish,
  BUG+1 in Sudoku; region containment, tiling exclusion, set differentials in Star
  Battle; and so on per game. The vocabulary becomes yours, not the app's.
- **Simplest move first.** The coach walks its technique ladder in order and stops at the
  first technique that makes progress. You are never shown a Swordfish when a hidden
  single was available.
- **Every hint is checked before you see it.** Hints are validated against the puzzle's
  own solution before display. A move that would contradict the solution never reaches
  the screen.
- **It explains in your language.** Smart Sudoku's coaching — all 87 technique write-ups,
  not just the UI strings — ships in English, Traditional Chinese, Simplified Chinese,
  Japanese and Korean.

---

## How the puzzles are built

The generators are gated, not just seeded.

1. **Replay before release.** Each app's puzzle bank is run end-to-end through its own
   coach as an automated harness — start position to solved. A bank ships only on a clean
   pass.
2. **One solution, no guessing.** If a grid admits a second solution, or if finishing it
   would need a coin flip rather than a technique, it does not make the bank.
3. **Honest difficulty.** Tiers are assigned from the techniques a puzzle actually
   requires, measured by the solver — not from clue count.
4. **One brain.** The app and the generator import the same detection code rather than
   keeping two copies, so a puzzle certified solvable at build time is solvable in your
   hand.
5. **Real phones.** Layouts verified down to narrow 375-point screens.
6. **No account.** Nothing to sign up for. Stats, streaks and saved games live on the
   device.

---

## Tech

React Native, shipped as native iOS and Android builds. One shared design language, six
separate games — each with its own generator, solver and coach.

---

## Notes

Sudoku, Star Battle, Shikaku, Binairo and Takuzu are generic puzzle types and are not
trademarks of Smart Puzzles. Shikaku has been published by Nikoli since 1989.

© 2026 Smart Puzzles.
