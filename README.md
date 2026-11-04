# Claude mods

Mods for Claude Code: small plugins that change how Claude Code looks and works.

| Mod | What it does |
| --- | --- |
| `skim-colors` | Makes Claude's long replies easy to skim. The points that matter are bright and bold, the rest is quieter, one terracotta key phrase per paragraph, and risks and decisions sit in quiet boxes. Desktop app. |
| `workshop` | One side pane listing everything you can use in Claude Code (slash commands, skills, mods, hooks) with what you use most at the top, plus your ideas. Open it with `/ws`. |

## Install

At the prompt of a Claude Code terminal session, pick the mods you want:

```
/plugin install skim-colors --marketplace chershtik/claude-mods
```

```
/plugin install workshop --marketplace chershtik/claude-mods
```

Answer `y` to add the marketplace, then choose the user scope.

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `chershtik/claude-mods`, then add the mods you want.

## Updates

```
claude plugin marketplace update claude-mods
```

```
claude plugin update skim-colors
```
