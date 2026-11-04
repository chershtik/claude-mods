# Claude mods

Mods for Claude Code: small plugins that change how Claude Code looks and works.

| Mod | What it does |
| --- | --- |
| `skim-colors` | Makes Claude's long replies easy to skim. The points that matter are bright and bold, the rest is quieter, one terracotta key phrase per paragraph, and risks and decisions sit in quiet boxes. Desktop app. |
| `workshop-launcher` | One side pane for your Claude Code workshop: ideas, mods, skills, hooks and workflows to use in this session or edit in a new one. Its code lives in [chershtik/workshop-launcher](https://github.com/chershtik/workshop-launcher). |

## Install

At the prompt of a Claude Code terminal session, pick the mods you want:

```
/plugin install skim-colors --marketplace chershtik/claude-mods
```

```
/plugin install workshop-launcher --marketplace chershtik/claude-mods
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
