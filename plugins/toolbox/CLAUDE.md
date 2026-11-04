# toolbox (mod)

If you were started to edit this mod, the owner's request is your first prompt: apply it, skip the workshop's session-start triage, and keep going where the last edit stopped.

## Files
- `hooks/load.ts`: reads everything the pane lists (`loadCatalog`).
- `hooks/commands.tsx`: the Commands section; `hooks/onhere.tsx`: the On here badges; `hooks/look.ts`: colors and section order.
- `hooks/catalog.ts`: what the pane lists (folders, IDEAS.md, user-settings hooks), grouping, sorting, filtering and every request text. No drawing.
- `hooks/register.tsx`: the hooks (session start, turn end, command, pane open/close, the ⚒ launcher).
- `hooks/pane.tsx`: the pane's drawing (`drawPane`).

## What it does
`/toolbox` opens one side pane, titled Toolbox. Two settings, both off by default: **Launcher icon** (a ⚒ above the prompt, hidden while the pane is open) and **Open at start**.

The pane copies the app's own sidebar so it reads as part of the app:
- **Top**: filter box (searches names and descriptions as you type, opens every section with a match, hides the rest) and one **+** whose menu holds New idea… (idea box), Create a mod, skill, hook… (new-session request into the chat box) and Reload the list.
- **On here**: every mod, skill or hook turned on in this session, as a green outlined pill with a ✕ that turns it off.
- **Sections** Ideas, Mods, Skills, Hooks, Workflows: `▸ Mods 2` in orange bold, folded at first, "· N on" in green, a row of space between rows.
- **Groups inside a section**: Pinned, Yours · made in the workshop (a workshop item, or a global skill with the same name, its installed copy), Installed · from outside (everything else in `~/.claude/skills` and the settings hooks). Labels show only when a section holds more than your own items. Built-in and plugin skills are not listed.
- **Rows**: a status dot (● on here, ◆ always on, ◇ installed, ○ yours and off), the name in green semibold, a quiet status (always on, on here, draft, Working…). The row lights under the pointer and shows **⋯**, as the sidebar does. A legend line closes the list.
- **⋯ menu**: floats under the row like the app's session menu. Main action (Use here / Turn off here / Stop using here / Run), then **Description ›**, whose text (with a warning when CLAUDE.md is missing) opens in a side menu to the left while the pointer is on it, like the app's Open in › (on a pane too narrow for it, over the menu), then Pin or Unpin, a line, then Load in every session (mods), Install for all sessions (workshop skills), Open folder, Edit… (edit box under the row), and Remove everywhere in red for settings hooks. Ideas: Refine here, Description ›, Start a session for it, Pin, then Drop in red.
- **Pins** last across sessions. They're kept in `$.store` (`pins`) and copied into the `pins` atom at `session.start`, which is what the pane draws from.
- **Drop** marks the idea's line `[-]` in IDEAS.md. That hides it here but keeps it in the file, and setting it back to `[ ]` undoes it, so Drop needs no confirm.
- Sources: workshop `mods/`, `skills/`, `hooks/`, `workflows/` (a hook or workflow may be one `.md`), plus `~/.claude/skills` and the hooks in `~/.claude/settings.json`.

## Decisions and why
- **No floating hints.** They covered what the pointer was heading for, and a mod's `hover` has no delay (no prop, and no hook runs on hover). The description sits behind Description › in the ⋯ menu, so it only shows when asked for. At the top of the menu it was in the way (owner, 2026-11-03).
- **The owner's look**: green names, orange section titles, blue ◇/◆ (`COLOR`). The owner tried plain sidebar text in v2.0.0 and preferred these. The menus follow the app. A `Client` surface module could time a hover, but whether the desktop sends it pointer events is unknown, so it isn't used.
- **Colors use the app's theme keys** (`text`, `inactive`, `subtle`, `success`, `error`, `warning`, `suggestion`), so they follow its look. The menu's fills are fixed dark-theme values (`FILL` in pane.tsx).
- **A menu can't close on an outside click**: no element covers the pane for that. ⋯ again, choosing an entry, or opening another menu closes it.
- **Spare room under the list**: while a menu is open a 14-row spacer sits under the list, so a menu opened on the last row is not cut by the pane's edge.
- **Requests go to the current session.** Use, Turn off, Refine, add idea, Load in every session and the like hand it a request that asks for a one-line reply. New sessions put the request in the chat box with `$.prompt.fill` and the person presses Enter. The app refuses a session started from a plugin's message or call (auto mode refused `$.mcp.call('ccd_session', 'start_session')`, 2026-11-02).
- **"On here" and "always on".** A mod is "on here" when its folder is in this session's mods folder (`~/.claude/dev-mods/<session id>/`), and "always on" when it is in `CLAUDE_CODE_PLUGIN_DIRS`. Skills and hooks leave no such trace, so the pane remembers the ones turned on from it (`used`).
- **Working… until done.** A job's row says Working… until it is done: a request until the turn ends (turn.complete clears all), a direct job until it settles. Failures show a toast.
- **Speed**: the folders are read once per turn (or Reload), all files in parallel, and kept in a module-level cache keyed by session id and turn.
- **Engine rules that shaped the code:**
  - `$` must be spelled at each call, so `listFolder` gets a small wrapper.
  - `$` crosses an import only into a function declaration, so `drawPane` is one.
  - An atom is read from the file that uses it, so register.tsx and pane.tsx each declare theirs with the same keys and shapes.
  - A hover box must not carry its own key: hover is scoped to the nearest keyed ancestor.
  - A Box has no corner radius, and a `round` border is the only rounding. The owner wants rounded hover fills but no visible borders (2026-11-03). So `rounded()` gives rows and menu entries a round border that rests in the color behind it and takes the fill's color on hover. Menu entries rest in `FILL.menu`, which is exact. Rows rest in `transparent`: if a faint outline shows on idle rows, the desktop does not honor it, so use the pane's background hex instead.
  - A plain Button inverts its own label under the pointer, so Description is plain text, nudged by `xs` to line up with Button labels.
  - The Description side menu is a child of the menu, not the entry, so it can sit against the menu's left edge. It shares a hover `scope` with the entry, which reveals it and keeps it open while the pointer is on either. It is 44 columns wide whatever the pane; the pane's edge clips anything past it.
  - `xs`/`sm` spacing is sized by each surface: finer than a cell on the desktop.
- **Paths and setup**: `findPaths` in `catalog.ts` finds the workshop (the `workshopDir` option, else `CLAUDE_WORKSHOP_DIR`, else `~/claude-workshop`, created with its folders and a CLAUDE.md on first use) and the Claude folder (`CLAUDE_CONFIG_DIR`, else `~/.claude`). The owner sets `CLAUDE_WORKSHOP_DIR` in ~/.claude/settings.json. Always on works through CLAUDE_CODE_PLUGIN_DIRS. Edits need a new session to load. `/workshop` is a reserved name; the command is `/toolbox` (`/workshop-pane` before v5.0.0, `/ws` in v5.0.0, which drowned among fuzzy matches in the desktop's suggestions).
- **The pane is a catalog, not a store** (owner, 2026-11-04): it lists everything you can use from wherever it lives, so you click instead of remembering a `/name`. Nothing is copied into the workshop; the workshop folder holds only ideas and drafts.
- **Commands** come from `$.command.list()` (built-in, plugin, your own, MCP; skills are commands too), grouped Pinned, Used before (most used first), Yours, From plugins, From MCP servers, Built into Claude Code. Use is counted in `$.store` (`usage`) by a `command.run` hook, a `tool.call` hook on Skill, and by the pane itself for runs it starts (a mod's own `$.command.run` skips its own hooks).
- **Mods running from elsewhere** (this session's mods folder, `CLAUDE_CODE_PLUGIN_DIRS`) are listed under Mods as installed.

## Verified in the app (2026-11-03, by the owner)
- The floating hover reveal works (used now for the row's ⋯).
- Turn off on a mod unloads it in the same session.

## Not verified yet
- Seen and liked by the owner: v2.0.0's menus and the ⋯ on row hover.
- Seen and liked by the owner: v2.1.0's green rows and menus.
- Seen and liked by the owner (v2.1.2): the Description side menu against the menu, the separator inside it.
- v2.1.3 in the app:
  - rounded hover fills on rows and menu entries with no line showing at rest
  - the entries' extra `xs` spacing
  - the side menu's top still level with Description now that entries are taller
  - a menu on the last row not being cut off
  - pins lasting into a new session

## Changelog
- 2026-11-02: v0.1.0 to v1.0.1, see git history; last: new sessions through the chat box.
- 2026-11-03: v1.1.0 compact redesign (one line per item, details, filter, On here, always-on and global items, cached parallel reads).
- 2026-11-03: v1.2.0 wrapping top row, renamed buttons, hover hints on every button, Drop instead of Delete.
- 2026-11-03: v1.3.0 top card; On here as green pills.
- 2026-11-03: v1.4.0 Pinned / Yours / Installed groups; pins that last across sessions.
- 2026-11-03: v2.0.0 looks like the app's sidebar:
  - rows with a hover highlight and a hover-revealed ⋯
  - every action (Pin included) in an app-style ⋯ menu headed by the description
  - one + menu at the top
  - floating hints removed
  - theme-key colors
  - split into register.tsx and pane.tsx
- 2026-11-03: v2.1.0 back to green names, row spacing, status dots and orange section titles; the description moved into a Description › side menu; the menu is narrower, like the app's.
- 2026-11-03: v2.1.1 polish from the owner's screenshot:
  - rows and menu entries light as rounded pills with the desktop's own spacing steps (`xs`/`sm`)
  - every entry, Description included, is the same pill around a plain Button, so labels line up
  - tighter menu padding
  - the side menu always opens to the left of the menu
  - the separator is clipped inside the menu
- 2026-11-03: v2.1.2:
  - removed the round borders v2.1.1 used for rounded fills (the owner did not want borders; corners are square)
  - entries lose the border's extra height
  - Description is plain text, so only the entry lights
  - its side menu sits against the menu, 44 columns wide
- 2026-11-03: v2.1.3 rounded hover fills on rows and menu entries (an invisible round border that takes the fill's color); a little more space (`xs` top and bottom) around each menu entry.
- 2026-11-03: v3.0.0 portable for sharing: workshop folder from an option or CLAUDE_WORKSHOP_DIR, Claude folder found, a new workshop set up on first use, the copy-into-workshop rule in every session's system prompt; whole rows open the menu, ⋯ is only a sign; menu entries share Description's hover; ✕ closes a menu.
- 2026-11-04: v3.1.0 rows are plain coloured text in a hover group (each part its own colour and a lighter group-hover one), all icons blue, a ⋯ button opens the menu below its row, rounded hover fills, On here as small badges, hover scopes are a prefix and a hash (a long hook name crashed the pane).
- 2026-11-04: v4.0.0 the pane is a catalog: a Commands section with every slash command and skill (used first, counted across sessions), mods running from elsewhere listed, the copy-into-workshop rule removed; drawing split into load.ts, commands.tsx, onhere.tsx, look.ts.
- 2026-11-04: v4.1.0 plugin commands grouped under one label per plugin (name and count), rows by short name.
- 2026-11-04: v4.2.0 the ⚒ shares the band above the prompt: what other mods draw there stays, with the icon in front of it.
- 2026-11-04: v5.0.0 moved into chershtik/claude-mods (plugins/workshop); the command is `/ws`; the ⚒ and opening at start are settings, both off by default (a slash command is the usual way in, and the band is shared).
- 2026-11-04: v6.0.0 renamed Toolbox: plugin `toolbox`, command `/toolbox`, pane title Toolbox. The workshop folder (ideas and drafts) keeps its name.
- 2026-11-04: v6.1.0 a command file, commands/toolbox.md, so the desktop's suggestion list shows it (it leaves registered commands out); both names open the pane in the mod's own hook, so the file's text never reaches the model.
- 2026-11-04: the command file is `commands/open.md`, listed as `/toolbox:open`: a plugin's files are always `plugin:file`, and `toolbox:toolbox` read badly (owner).
