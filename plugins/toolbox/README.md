# Toolbox

A side pane for Claude Code that lists everything you can use, so you click instead of remembering a name.

- **Every slash command and skill**, from Claude Code itself, your plugins, your own and your MCP servers, with what you use most at the top.
- **Your mods, skills, hooks and workflows**, with what is on in this session marked, and one click to turn each on or off.
- **Your ideas and drafts**, kept in a workshop folder of your own.

Open it with `/toolbox:open` from the suggestions, or type `/toolbox`.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install toolbox --marketplace chershtik/claude-mods
```

Answer `y` to add the marketplace, then choose the user scope.

From a shell:

```
claude plugin install toolbox --marketplace chershtik/claude-mods
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `chershtik/claude-mods`, then add Toolbox.

## Using it

Click a row's ⋯ for its menu. A command can be run, put in the chat box with its arguments still to type, or pinned to the top. A mod or skill can be turned on in this session, opened in its folder, or edited in a new session.

The filter at the top searches names and descriptions across every section.

## Settings

In the plugin's settings (the config menu):

| Setting | Default | What it does |
| --- | --- | --- |
| Launcher icon | off | `on` puts a ⚒ above the prompt that opens the Toolbox. |
| Open at start | off | `on` opens the Toolbox when a session starts. |
| Workshop folder | `~/claude-workshop` | Where your ideas (`IDEAS.md`) and drafts live. Created with its folders the first time the Toolbox opens. `CLAUDE_WORKSHOP_DIR` works too. |

## Updates

```
claude plugin marketplace update claude-mods
```

```
claude plugin update toolbox
```
