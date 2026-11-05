// The Commands section: every slash command and skill the session can run, from wherever it comes
// (built-in, plugins, your own, MCP), with what was used most at the top. No $ here: pane.tsx hands in
// the elements and the actions, so this file only draws.
import { commandKey, groupCommands, matches, updatePluginRequest } from './catalog'
import type { Command, CommandGroup, Usage } from './catalog'
import { TINT } from './look'

type Entry = unknown
export type CommandsKit = {
  Box: any
  Text: any
  header: (title: string, count: number) => unknown
  isOpen: (title: string) => boolean
  isFiltering: boolean
  filter: string
  commands: Command[]
  usage: Usage
  pinned: string[]
  line: (key: string, mark: unknown, name: string, tail: unknown, menuTree: unknown) => unknown
  menu: (key: string, entries: Entry[]) => unknown
  job: (id: string, label: string, run: () => void) => Entry
  plain: (id: string, label: string, run: () => void) => Entry
  tinted: (scope: string, tint: readonly [string, string], text: string, props?: Record<string, unknown>) => unknown
  group: (key: string) => string
  isPinned: (key: string) => boolean
  togglePin: (key: string) => void
  setOpen: (value: string) => void
  isBusy: (key: string) => boolean
  run: (key: string, name: string) => void
  fill: (name: string) => void
  send: (text: string) => void
}

const LABEL: Record<CommandGroup, string> = {
  Pinned: 'Pinned',
  Used: 'Used before · most used first',
  Yours: 'Yours',
  Plugins: 'From plugins',
  MCP: 'From MCP servers',
  'Built-in': 'Built into Claude Code',
}

export function drawCommands(k: CommandsKit) {
  const { Box, Text } = k
  const shown = k.commands.filter(c => matches(k.filter, c.name, c.description, c.plugin ?? ''))
  if (k.isFiltering && shown.length === 0) return null

  // A plugin command's name repeats its plugin (`plugin:name`); under a plugin label the short part is enough.
  const pluginOf = (cmd: Command) => cmd.plugin ?? (cmd.name.includes(':') ? cmd.name.split(':')[0] : 'plugin')
  const shortName = (cmd: Command) => (cmd.name.startsWith(`${pluginOf(cmd)}:`) ? cmd.name.slice(pluginOf(cmd).length + 1) : cmd.name)

  const row = (cmd: Command, isUnderPlugin = false) => {
    const key = commandKey(cmd)
    const uses = k.usage[cmd.name]?.count ?? 0
    const where = isUnderPlugin ? '' : cmd.source === 'plugin' ? pluginOf(cmd) : cmd.source === 'mcp' ? 'MCP' : ''
    const note = [where, uses > 0 ? `${uses}×` : ''].filter(Boolean).join(' · ')
    const tail = k.isBusy(key) ? k.tinted(k.group(key), TINT.quiet, 'Working…', { size: 'caption' }) : note === '' ? null : k.tinted(k.group(key), TINT.quiet, note, { size: 'caption' })
    const menuTree = k.menu(key, [
      k.job(`run-${key}`, `Run /${cmd.name}`, () => k.run(`run-${key}`, cmd.name)),
      { about: cmd.description || 'No description.' },
      k.plain(`fill-${key}`, 'Put in the chat box', () => {
        k.setOpen('')
        k.fill(cmd.name)
      }),
      k.plain(`pin-${key}`, k.isPinned(key) ? 'Unpin' : 'Pin', () => {
        k.setOpen('')
        k.togglePin(key)
      }),
      // Built-in commands update with Claude Code itself, and MCP ones with their server.
      ...(cmd.source === 'plugin' ? [k.job(`update-${key}`, 'Update', () => k.send(updatePluginRequest(pluginOf(cmd))))] : []),
    ])
    return (
      <Box key={`row-${key}`} flexDirection="column">
        {k.line(key, <Box width={2} justifyContent="center">{k.tinted(k.group(key), TINT.always, '/')}</Box>, cmd.source === 'plugin' ? shortName(cmd) : cmd.name, tail, menuTree)}
      </Box>
    )
  }

  // Plugin commands under one small label per plugin, its name and count, the rows by short name.
  const byPlugin = (list: Command[]) =>
    [...new Set(list.map(pluginOf))].sort().map(plugin => {
      const own = list.filter(c => pluginOf(c) === plugin)
      return (
        <Box key={`plugin-${plugin}`} flexDirection="column" gap="xs">
          <Box paddingX="sm">
            <Text size="caption" color={TINT.quiet[0]} weight="semibold">{`${plugin} · ${own.length}`}</Text>
          </Box>
          {own.map(cmd => row(cmd, true))}
        </Box>
      )
    })

  const groups = groupCommands(shown, k.usage, k.pinned)
  return (
    <Box key="section-Commands" flexDirection="column" gap={k.isOpen('Commands') ? 'xs' : 0}>
      {k.header('Commands', k.commands.length)}
      {k.isOpen('Commands') &&
        groups.map(([label, list]) => (
          <Box key={`group-cmd-${label}`} flexDirection="column" gap="xs">
            <Box paddingX={1}>
              <Text size="caption" color="subtle">{LABEL[label]}</Text>
            </Box>
            {label === 'Plugins' ? byPlugin(list) : list.map(cmd => row(cmd))}
          </Box>
        ))}
    </Box>
  )
}
