// Reads everything the pane lists, once per turn: the workshop folders, your skills, the settings
// hooks, the mods running here, every slash command, and what was used. No drawing here.
import type { Engine } from 'claude-code'

import { FOLDER, listFolder, parseIdeas, settingsHooks, slash } from './catalog'
import type { Command, Idea, Item, Usage } from './catalog'
import { SECTIONS } from './look'

export type Catalog = { items: Item[]; ideas: Idea[]; sessionId: string; sessionMods: string[]; alwaysOn: string[]; commands: Command[]; usage: Usage }

// A function declaration: the engine follows $ across an import only into one.
export async function loadCatalog($: Engine, ROOT: string, HOME: string, SESSION_MODS: string): Promise<Catalog> {
  // The engine wants $ spelled at each call, so the folder reader gets these instead of $.fs.
  const fs = {
    list: (path: string) => $.fs.list(path),
    read: (path: string) => $.fs.read(path),
    exists: (path: string) => $.fs.exists(path),
  }
  const sessionId = String(await $.session.id())
  const [ideasText, sessionEntries, plugDirs, userSettings, commands, usage, ...lists] = await Promise.all([
    $.fs.read(`${ROOT}/IDEAS.md`).catch(() => ''),
    $.fs.list(`${SESSION_MODS}/${sessionId}`).catch(() => []),
    $.env.get('CLAUDE_CODE_PLUGIN_DIRS').catch(() => ''),
    $.settings.read({ source: 'user' }).catch(() => ({})),
    $.command.list().catch(() => []),
    $.store.get('usage').catch(() => undefined),
    ...SECTIONS.map(([kind]) => listFolder(fs, kind, 'workshop', `${ROOT}/${FOLDER[kind]}`)),
    listFolder(fs, 'skill', 'global', `${HOME}/skills`),
  ])
  const dirs = String(plugDirs ?? '').split(';').filter(Boolean).map(slash)
  const sessionModNames = sessionEntries.filter(entry => entry.kind === 'dir').map(entry => entry.name)
  const found = lists.flat()
  // Mods that run here but live outside the workshop: this session's mods folder and the always-on folders.
  const outside = [...sessionModNames.map(name => `${SESSION_MODS}/${sessionId}/${name}`), ...dirs].filter(
    dir => !found.some(i => i.kind === 'mod' && i.name === dir.split('/').pop()),
  )
  const outsideMods = await Promise.all(
    outside.map(async (dir): Promise<Item> => ({
      kind: 'mod',
      scope: 'global',
      name: dir.split('/').pop() ?? dir,
      dir,
      cwd: dir,
      about: await $.fs.read(`${dir}/.claude-plugin/plugin.json`).then(t => String(JSON.parse(t).description ?? '')).catch(() => ''),
      hasNotes: true,
    })),
  )
  return {
    ideas: parseIdeas(ideasText).filter(i => !i.done),
    sessionId,
    sessionMods: sessionModNames,
    alwaysOn: dirs.map(d => d.split('/').pop() ?? ''),
    items: [...found, ...outsideMods.filter((m, i, all) => all.findIndex(o => o.name === m.name) === i), ...settingsHooks((userSettings as { hooks?: unknown }).hooks)],
    commands: (commands as readonly Command[]).map(c => ({ name: c.name, description: c.description, source: c.source, plugin: c.plugin })),
    usage: (usage && typeof usage === 'object' ? usage : {}) as Usage,
  }
}
