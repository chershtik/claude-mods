// What the pane lists and the requests its buttons send; no drawing here.
import type { Engine } from 'claude-code'

// Where the workshop and the Claude folder are, found once per load by `findPaths` (pane.tsx and
// register.tsx call it before anything reads them). Request texts read them when they are built.
export const paths = { root: '', home: '', option: '' }
export const sessionMods = () => `${paths.home}/dev-mods`

export const slash = (path: string) => path.replaceAll('\\', '/').replace(/\/+$/, '')

// The workshop folder: the `workshopDir` option, else CLAUDE_WORKSHOP_DIR, else ~/claude-workshop. The
// Claude folder: CLAUDE_CONFIG_DIR, else ~/.claude. A function declaration: the engine follows $ across
// an import only into one.
export async function findPaths($: Engine) {
  if (paths.root !== '') return paths
  const text = (value: unknown) => String(value ?? '')
  const [userHome, profile, configDir, workshopEnv] = (
    await Promise.all([
      $.env.get('HOME').catch(() => ''),
      $.env.get('USERPROFILE').catch(() => ''),
      $.env.get('CLAUDE_CONFIG_DIR').catch(() => ''),
      $.env.get('CLAUDE_WORKSHOP_DIR').catch(() => ''),
    ])
  ).map(text)
  const home = slash(profile || userHome)
  paths.home = slash(configDir) || `${home}/.claude`
  paths.root = slash(paths.option || workshopEnv) || `${home}/claude-workshop`
  // A new workshop gets its folders and a CLAUDE.md that says how to use them.
  if (!(await $.fs.exists(`${paths.root}/CLAUDE.md`).catch(() => true))) {
    await Promise.all([
      $.fs.write(`${paths.root}/CLAUDE.md`, WORKSHOP_NOTES),
      $.fs.write(`${paths.root}/IDEAS.md`, '# Ideas\n\n'),
      ...Object.values(FOLDER).map(folder => $.fs.write(`${paths.root}/${folder}/README.md`, `${README[folder]}\n`)),
    ]).catch(() => undefined)
  }
  return paths
}

const README: Record<string, string> = {
  mods: 'One folder per mod (a Claude Code plugin with a hooks module).',
  skills: 'One folder per skill, each with a SKILL.md.',
  hooks: 'One folder or one .md file per hook.',
  workflows: 'One folder or one .md file per workflow.',
}

const WORKSHOP_NOTES = `# Claude Code Workshop

A place for my Claude Code mods, skills, hooks and workflows. The workshop pane (\`/ws\`) lists your ideas and drafts from here, next to everything installed.

## Layout
- \`mods/\`: one folder per mod (use the plugin-authoring skill).
- \`skills/\`: one folder per skill, each with a SKILL.md.
- \`hooks/\`, \`workflows/\`: a folder or one \`.md\` file each.
- \`IDEAS.md\`: ideas, one per line.

## Refining an idea ("refine X")
1. Restate the idea and ask what problem it solves and what would make it great.
2. Check whether it already exists (installed skills and plugins, built-in Claude Code features).
3. Offer 2-3 sharper variants with effort and payoff, and a recommendation.
4. Write the result back to its line in IDEAS.md.

## IDEAS.md format
One line per idea: \`- [ ] YYYY-MM-DD | type | title | context\`
Status: \`[ ]\` new, \`[~]\` in progress, \`[x]\` shipped, \`[-]\` dropped. Types: mod, skill, hook, workflow.
`

export type Kind = 'mod' | 'skill' | 'hook' | 'workflow'
// Where an item lives: a workshop draft, or installed for every session (~/.claude/skills, user settings hooks).
export type Scope = 'workshop' | 'global'
// dir is the folder, or the file for a hook or workflow kept as one .md; cwd is where an edit session starts.
export type Item = {
  kind: Kind
  scope: Scope
  name: string
  dir: string
  cwd: string
  about: string
  hasNotes: boolean
  // A mod loaded in every session through CLAUDE_CODE_PLUGIN_DIRS.
  isAlwaysOn?: boolean
  // Turned on in this session only (a mod in this session's mods folder, a skill or hook used here).
  isOnHere?: boolean
}
export type Idea = { done: boolean; date: string; type: string; title: string; context: string }

export const FOLDER: Record<Kind, string> = { mod: 'mods', skill: 'skills', hook: 'hooks', workflow: 'workflows' }

export const itemKey = (item: Item) => `${item.kind}:${item.scope}:${item.name}`
export const ideaKey = (idea: Idea) => `idea:${idea.title}`

export const aboutSkill = (text: string): string =>
  /^description:\s*(.+)$/m.exec(text)?.[1].replace(/^["']|["']$/g, '').trim() ?? ''

// The first line of a single-file item that is not blank or a heading.
const aboutFile = (text: string) => text.split(/\r?\n/).find(l => l.trim() !== '' && !l.startsWith('#'))?.trim() ?? ''

// IDEAS.md lines: `- [ ] YYYY-MM-DD | type | title | context`. [ ] new, [~] in progress are open; [x] shipped, [-] dropped are done.
export const parseIdeas = (text: string): Idea[] =>
  text.split(/\r?\n/).flatMap(line => {
    const m = /^- \[([ ~x-])\] (\S+) \| (\w+) \| ([^|]+?) \| (.*)$/.exec(line)
    return m ? [{ done: m[1] === 'x' || m[1] === '-', date: m[2], type: m[3], title: m[4].trim(), context: m[5].trim() }] : []
  })

// IDEAS.md with this idea's line (same date, type and title) marked dropped, `[-]`: hidden from the
// pane but kept in the file, so a mistaken drop is undone by setting it back to `[ ]`.
export const dropIdea = (text: string, idea: Idea): string =>
  text
    .split(/(?<=\n)/)
    .map(part => {
      const [found] = parseIdeas(part)
      return found && found.date === idea.date && found.type === idea.type && found.title === idea.title ? part.replace(/^- \[[ ~x-]\]/, '- [-]') : part
    })
    .join('')

// On here first, then always on, then by name: what the person is using sits on top.
const rank = (item: Item) => (item.isOnHere ? 0 : item.isAlwaysOn ? 1 : 2)
export const sortItems = (items: Item[]) => [...items].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))

// Made in the workshop, or a global copy of one made there; everything else in ~/.claude/skills or the
// settings hooks came from outside (a pack, a plugin's setup, by hand).
export const isYours = (item: Item, all: Item[]) =>
  item.scope === 'workshop' || all.some(other => other.scope === 'workshop' && other.kind === item.kind && other.name === item.name)

// A section's rows in groups: what the person pinned, theirs, then the installed ones; empty groups left out.
export type Group = 'Pinned' | 'Yours' | 'Installed'
export const groupItems = (items: Item[], all: Item[], pins: string[]): [Group, Item[]][] =>
  (
    [
      ['Pinned', items.filter(i => pins.includes(itemKey(i)))],
      ['Yours', items.filter(i => !pins.includes(itemKey(i)) && isYours(i, all))],
      ['Installed', items.filter(i => !pins.includes(itemKey(i)) && !isYours(i, all))],
    ] as [Group, Item[]][]
  ).filter(([, list]) => list.length > 0)

export const matches = (query: string, ...texts: string[]) => {
  const q = query.trim().toLowerCase()
  return q === '' || texts.some(t => t.toLowerCase().includes(q))
}

// Requests the buttons hand the current session. Each asks for a one-line reply so a click does not
// fill the chat.
export const useRequest = (item: Item): string => {
  switch (item.kind) {
    case 'mod':
      return `[workshop] Quietly turn on the mod "${item.name}": load plugin-authoring, copy ${item.dir} into this session's mods folder, then reply only "On: ${item.name}" and follow the rules in its CLAUDE.md from your next reply.`
    case 'skill':
      return item.scope === 'global'
        ? `[workshop] Load the skill "${item.name}" with the Skill tool and follow it from now on. Reply only "Using: ${item.name}".`
        : `[workshop] Use the workshop skill "${item.name}" in this session: read ${item.dir}/SKILL.md and follow it from now on. Reply only "Using: ${item.name}".`
    case 'hook':
      return `[workshop] Use the workshop hook "${item.name}" in this session: read ${item.dir}, install it for this session only (update-config skill), and reply only "On: ${item.name}".`
    case 'workflow':
      return `[workshop] Run the workshop workflow "${item.name}" in this session: read ${item.dir} and follow it.`
  }
}

export const offRequest = (item: Item, sessionId: string): string => {
  switch (item.kind) {
    case 'mod':
      return `[workshop] Quietly turn off the mod "${item.name}" in this session: delete the folder ${sessionMods()}/${sessionId}/${item.name}, stop following its CLAUDE.md rules from your next reply, then reply only "Off: ${item.name}".`
    case 'hook':
      return `[workshop] Remove the workshop hook "${item.name}" you installed for this session (update-config skill), then reply only "Off: ${item.name}".`
    default:
      return `[workshop] Stop following the ${item.kind} "${item.name}" in this session. Reply only "Off: ${item.name}".`
  }
}

export const alwaysOnRequest = (item: Item, isOn: boolean): string =>
  isOn
    ? `[workshop] Make the mod "${item.name}" always on: add ${item.dir} to CLAUDE_CODE_PLUGIN_DIRS (paths joined by ";") in ${paths.home}/settings.json, keep a backup next to it, then reply in one line that it loads in new sessions.`
    : `[workshop] Stop loading the mod "${item.name}" in every session: remove ${item.dir} from CLAUDE_CODE_PLUGIN_DIRS in ${paths.home}/settings.json, keep a backup next to it, then reply in one line that new sessions start without it.`

export const installRequest = (item: Item): string =>
  `[workshop] Install the workshop skill "${item.name}" for every session: copy ${item.dir} to ${paths.home}/skills/${item.name} (ask before overwriting one that exists), then reply in one line.`

export const removeHookRequest = (item: Item): string =>
  `[workshop] Remove this hook from ${paths.home}/settings.json (update-config skill), keep a backup next to it, then reply in one line. Hook: ${item.name}, command: ${item.about}`

// New sessions are asked for in the chat box and sent by the person; the app refuses one started from
// a plugin's call or message.
export type SessionSpec = { title: string; cwd: string; prompt: string }

export const editSession = (item: Item, text: string): SessionSpec => ({ title: `Edit ${item.kind}: ${item.name}`, cwd: item.cwd, prompt: text })

export const ideaSession = (idea: Idea): SessionSpec => ({
  title: `Refine idea: ${idea.title}`,
  cwd: paths.root,
  prompt: `refine idea: ${idea.title}. ${idea.context}`,
})

// A getter: the workshop folder is found after this module loads.
export const newSession: SessionSpec = {
  title: 'New workshop item',
  get cwd() {
    return paths.root
  },
  prompt: 'I want to create something new in the workshop (a mod, skill, hook or workflow). Ask me what it should do.',
}

export const sessionRequest = (spec: SessionSpec) =>
  `Start a new session in ${spec.cwd} titled "${spec.title}" with this as its first prompt, exactly:\n\n${spec.prompt}`

export const addIdeaRequest = (text: string): string =>
  `[workshop] Add this idea to ${paths.root}/IDEAS.md in that file's line format (today's date, pick the type from mod, skill, hook, workflow, short title, one-line context), keep the raw wording in the context, then confirm in one line:\n\n${text}`

export const refineRequest = (idea: Idea): string =>
  `[workshop] Refine this idea with me here, following the refine steps in ${paths.root}/CLAUDE.md: "${idea.title}" (${idea.type}). Context: ${idea.context}`

// User-settings hooks as items: one per event and matcher, its commands as the description.
type HookGroup = { matcher?: string; hooks?: { command?: string; prompt?: string }[] }
export const settingsHooks = (hooks: unknown): Item[] =>
  Object.entries((hooks ?? {}) as Record<string, HookGroup[]>).flatMap(([event, groups]) =>
    (Array.isArray(groups) ? groups : []).map(group => ({
      kind: 'hook' as const,
      scope: 'global' as const,
      name: group.matcher ? `${event} · ${group.matcher}` : event,
      dir: `${paths.home}/settings.json`,
      cwd: paths.home,
      about: (group.hooks ?? []).map(h => h.command ?? h.prompt ?? '').filter(Boolean).join('; '),
      hasNotes: true,
    })),
  )

type Fs = {
  list: (path: string) => Promise<readonly { name: string; kind: string }[]>
  read: (path: string) => Promise<string>
  exists: (path: string) => Promise<boolean>
}

// Every item in one folder, read in parallel: a folder per item, or one .md file for a hook or workflow.
export const listFolder = async (fs: Fs, kind: Kind, scope: Scope, base: string): Promise<Item[]> => {
  const entries = await fs.list(base).catch(() => [])
  const items = await Promise.all(
    entries.map(async (entry): Promise<Item | undefined> => {
      const isDir = entry.kind === 'dir'
      const isFileItem = (kind === 'hook' || kind === 'workflow') && entry.kind === 'file' && entry.name.endsWith('.md') && entry.name !== 'README.md'
      if (!isDir && !isFileItem) return undefined
      const dir = `${base}/${entry.name}`
      const name = isDir ? entry.name : entry.name.replace(/\.md$/, '')
      const [about, hasNotes] = await Promise.all([
        !isDir
          ? fs.read(dir).then(aboutFile).catch(() => '')
          : kind === 'mod'
            ? fs.read(`${dir}/.claude-plugin/plugin.json`).then(t => String(JSON.parse(t).description ?? '')).catch(() => '')
            : kind === 'skill'
              ? fs.read(`${dir}/SKILL.md`).then(aboutSkill).catch(() => '')
              : fs.read(`${dir}/README.md`).then(aboutFile).catch(() => ''),
        isDir && scope === 'workshop' ? fs.exists(`${dir}/CLAUDE.md`).catch(() => false) : Promise.resolve(true),
      ])
      return { kind, scope, name, dir, cwd: isDir ? dir : scope === 'global' ? paths.home : paths.root, about, hasNotes }
    }),
  )
  return items.filter((i): i is Item => i !== undefined)
}

// Lists kept in session values as comma-joined text.
export const csv = (text: string) => text.split(',').filter(Boolean)
export const toggleIn = (text: string, key: string) => (csv(text).includes(key) ? csv(text).filter(k => k !== key) : [...csv(text), key]).join(',')

// Slash commands, skills included, as the engine lists them: built-in, from plugins, your own, MCP.
export type Command = { name: string; description: string; source: string; plugin?: string }
// How often and how lately each command or skill was used, by name; kept in $.store across sessions.
export type Usage = Record<string, { count: number; last: number }>
export const commandKey = (cmd: Command) => `cmd:${cmd.name}`
export const recordUse = (usage: Usage, name: string, now: number): Usage => ({ ...usage, [name]: { count: (usage[name]?.count ?? 0) + 1, last: now } })

// The pane's own groups for commands: pinned, then what was used (most used first), then the rest by
// where it comes from; empty groups left out.
export type CommandGroup = 'Pinned' | 'Used' | 'Yours' | 'Plugins' | 'MCP' | 'Built-in'
export const groupCommands = (cmds: Command[], usage: Usage, pins: string[]): [CommandGroup, Command[]][] => {
  const byName = (a: Command, b: Command) => a.name.localeCompare(b.name)
  const pinned = cmds.filter(c => pins.includes(commandKey(c))).sort(byName)
  const rest = cmds.filter(c => !pins.includes(commandKey(c)))
  const used = rest.filter(c => usage[c.name]).sort((a, b) => usage[b.name].count - usage[a.name].count || usage[b.name].last - usage[a.name].last)
  const unused = rest.filter(c => !usage[c.name])
  const from = (source: string) => unused.filter(c => c.source === source).sort(byName)
  return (
    [
      ['Pinned', pinned],
      ['Used', used],
      ['Yours', from('user')],
      ['Plugins', from('plugin')],
      ['MCP', from('mcp')],
      ['Built-in', from('builtin')],
    ] as [CommandGroup, Command[]][]
  ).filter(([, list]) => list.length > 0)
}
