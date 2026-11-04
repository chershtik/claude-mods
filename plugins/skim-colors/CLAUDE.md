# skim-colors (mod)

This folder is one workshop mod. If you were started to edit it, the owner's request is your first prompt: apply it, skip the workshop's session-start triage, and keep going where the last edit stopped.

## What it does
Redraws Claude's long replies in the desktop app so a tired reader can skim: only colored text and headlines carry the message, white text is skippable. The model writes markers, the mod draws them. Replies of one or two sentences are left alone.

## Markers (written by the model, hidden when drawn)
- `##` heading or a bold-only line: drawn by the app's own Markdown heading.
- `[flow] Opening clause :: rest`: the opening clause bright and bold, a quiet dash, the rest in a quieter gray. Consecutive flow and dim lines read as one list: no blank row, a little air between lines.
- `[risk]`: a dark red ground with no visible border and a coral "Risk" label.
- `[ask]`: a warm callout (faint warm border, dark warm ground), no label.
- Consecutive risk or ask lines share one box; written as plain sentences.
- `[dim]`: dimmed line.
- `==span==`: key phrase in Claude's terracotta, the single accent, at most one per paragraph; must make sense alone.
- Fences, tables and lines with links fall back to plain Markdown.

## Files
- `hooks/register.tsx`: all colors at the top (`COLOR`, `BOX`), the format rules the model sees (`SECTION`), `toBlocks`, `toSpans` and the `ui.render` hook.
- `hooks/skim.test.tsx`: tests, run with `claude plugin test <this folder>` (in the desktop app the CLI is bundled and may not be on PATH).

## Decisions and why
- Desktop app only; the owner skips the terminal for now.
- One hierarchy, one accent (2026-11-04): bright bold for what matters, quieter gray for the rest, terracotta only for key phrases. The owner found the earlier amber, mint and coral palette loud; this one reads like part of Claude. Earlier picks, kept in a comment in `register.tsx`: pink #f650bd, teal #3c9ea4, orange #fc8355, red #ff6247, lavender #ceb1e8.
- Risk and ask are boxes, not colored text: the owner found red and orange text noisy.
- `<Markdown>` must not get a `key` prop (the engine rejects it).

## Open ideas
Light mode, a role for numbers and names, whether ask and risk should color only an opening clause.

## Changelog
Add one line per edit session: date, what changed, why.
- 2026-11-02: v0.1.0 built and tuned with the owner (palette, boxes, spacing).
- 2026-11-02: "Your call" box now gray and white (border and label #d4d4d4, ground #2a2a2a) instead of blue, at the owner's request.
- 2026-11-02: both boxes use the `single` border style (ask was `round`); thinnest line the character grid draws.
- 2026-11-02: the ask box has no "Your call" label any more, at the owner's request.
- 2026-11-04: v0.2.0 Claude-native look: app headings, bright bold openings with a quiet rest, terracotta key phrases, borderless risk box, warm ask box with no label, lists without blank rows, inline code in openings.
