# Claude mods

Mods for Claude Code, by Carmel. Each one is a small plugin that changes how Claude Code looks or works.

| Mod | What it does |
| --- | --- |
| [Toolbox](plugins/toolbox) | A side pane listing everything you can use in Claude Code (slash commands, skills, mods, hooks, workflows) with what you use most at the top, plus your ideas and drafts. Open it with `/toolbox`. |
| [skim-colors](plugins/skim-colors) | Makes Claude's long replies easy to skim. The points that matter are bright and bold, the rest is quieter, one terracotta key phrase per paragraph, and risks and decisions sit in quiet boxes. Desktop app. |

## Install

At the prompt of a Claude Code terminal session, one line per mod you want:

```
/plugin install toolbox --marketplace chershtik/claude-mods
```

```
/plugin install skim-colors --marketplace chershtik/claude-mods
```

Answer `y` to add the marketplace, then choose the user scope.

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `chershtik/claude-mods`, then add the mods you want.

## Updates

```
claude plugin marketplace update claude-mods
```

Then update each mod by name, for example:

```
claude plugin update toolbox
```

## License

MIT, see [LICENSE](LICENSE).
