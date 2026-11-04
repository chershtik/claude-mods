# Workshop pane for Claude Code

One side pane for everything you build for Claude Code: ideas, mods, skills, hooks and workflows. Open it with `/ws`.

- **Lists** your workshop's `mods/`, `skills/`, `hooks/` and `workflows/`, the skills in `~/.claude/skills`, the hooks in `~/.claude/settings.json`, and the ideas in `IDEAS.md`.
- **Click a row** for its menu: use it in this session, turn it off, read its description, pin it, open its folder, or start a session to edit it.
- **Lists every slash command and skill** you can run, from Claude Code itself, your plugins, your own and MCP servers, with what you use most at the top, so you never have to remember a name.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install workshop --marketplace chershtik/claude-mods
```

Answer `y` to add the marketplace, then choose the user scope.

From a shell:

```
claude plugin install workshop --marketplace chershtik/claude-mods
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `chershtik/claude-mods`, then Add plugin.

## Settings

In the plugin's settings (the config menu):

- **Launcher icon**: `on` puts a ⚒ above the prompt that opens the pane. Off by default.
- **Open at start**: `on` opens the pane when a session starts. Off by default.
- **Workshop folder**: where your ideas and drafts live (below).

## Your workshop folder

By default the workshop is `~/claude-workshop`. The first time the pane opens it creates that folder with `mods/`, `skills/`, `hooks/`, `workflows/`, an `IDEAS.md` and a `CLAUDE.md`. To use another folder, set the plugin's **Workshop folder** option, or the `CLAUDE_WORKSHOP_DIR` environment variable.

## Updates

From a shell:

```
claude plugin marketplace update claude-mods
```

```
claude plugin update workshop
```
