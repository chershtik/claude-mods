import { atom, read, update } from 'claude-code'
import type { Engine, Register } from 'claude-code'

import { paths, recordUse } from './catalog'
import type { Usage } from './catalog'
import { drawPane } from './pane'

const PANE = 'toolbox'
// The command that opens the pane: short, since people type it.
export const COMMAND = 'toolbox'

// Session values this file uses; pane.tsx declares the ones it draws from with the same keys and shapes.
// Whether the pane is open; the launcher button hides while it is.
const isPaneOpen = atom({ plugin: 'toolbox', key: 'isPaneOpen' } as const, false, { shape: 'pane-open-1' })
// Counts finished turns so the pane reads the folders again.
const turns = atom({ plugin: 'toolbox', key: 'turns' } as const, 0, { shape: 'turns-1' })
// Jobs not finished yet; a turn's end clears them.
// ponytail: cleared at the end of any turn, so a declined mods question shows the button again; track per request if it misfires.
const pending = atom({ plugin: 'toolbox', key: 'pending' } as const, '', { shape: 'pending-1' })
// Pinned keys, seeded from the store when the session starts.
const pins = atom({ plugin: 'toolbox', key: 'pins' } as const, '', { shape: 'pins-1' })

// A function declaration, so the engine follows $ into it.
async function bump($: Engine, name: string) {
  const usage = ((await $.store.get('usage').catch(() => undefined)) ?? {}) as Usage
  await $.store.set('usage', recordUse(usage, name, Date.now()))
}

export const register: Register = (on, options) => {
  // The workshop folder the person set, if any; findPaths falls back from it.
  paths.option = typeof options.workshopDir === 'string' ? options.workshopDir.trim() : ''
  paths.root = ''
  // Both off unless the person turns them on in the plugin's settings.
  const showLauncher = options.launcher === 'on'
  const openAtStart = options.openAtStart === 'on'

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: COMMAND, description: 'Open the toolbox: every command, skill, mod and hook you can use, and your ideas' })
    // Pins live in the store across sessions; the pane draws from the session copy.
    const saved = await $.store.get('pins').catch(() => undefined)
    if (typeof saved === 'string') await update($, pins, () => saved)
    const result = await next(e)
    if (openAtStart) await $.ui.open({ id: PANE, title: 'Toolbox' }).catch(() => undefined)
    return result
  })

  // What was used, for the pane's Used group: every slash command run (typed, or from the pane) and
  // every skill the model loads, counted in the store so it lasts across sessions.
  on('command.run', async ($, e, next) => {
    await bump($, e.command).catch(() => undefined)
    return next(e)
  })
  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    await bump($, String(e.skill)).catch(() => undefined)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await update($, turns, n => n + 1)
    await update($, pending, () => '')
    return next(e)
  })

  // Two names, one pane: `/toolbox`, registered here, and `/toolbox:toolbox`, the command file in
  // commands/, which is what the desktop's suggestion list shows (it leaves registered commands out).
  // Either way this answers it, so the file's text never reaches the model.
  for (const command of [COMMAND, `${COMMAND}:${COMMAND}`]) {
    on('command.run', { command }, async $ => {
      await $.ui.open({ id: PANE, title: 'Toolbox' })
      return { text: 'Toolbox opened.' }
    })
  }

  on('ui.open', { id: PANE }, async ($, e, next) => {
    const result = await next(e)
    if (result.isPlaced) await update($, isPaneOpen, () => true)
    return result
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    await next(e)
    await update($, isPaneOpen, () => false)
  })

  // The Launcher icon setting puts a ⚒ above the prompt, hidden while the pane is open; off by default,
  // since a slash command is the usual way in and the band is shared. The band holds one drawing, so
  // the icon shares it: whatever the mods beneath draw stays, with the icon in front of it.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!showLauncher || e.props.hasSurvey || (await read($, isPaneOpen))) return next(e)
    // Nothing beneath, or a drawing that fails: the icon stands alone.
    const below = await next(e).catch(() => null)
    const { Box, Button, Text } = $.ui.resolve(e)
    const icon = (
      <Box key="workshop-launch" gap={1}>
        <Button key="open-toolbox" label="⚒" onPress={() => void $.ui.open({ id: PANE, title: 'Toolbox' })} />
        <Box display="none" hover={{ display: 'flex' }}>
          <Text dimColor>Open the toolbox</Text>
        </Box>
      </Box>
    )
    if (below === null || below === undefined) return icon
    return (
      <Box key="workshop-band" gap={1} alignItems="center">
        {icon}
        <Box flexGrow={1} flexShrink={1}>
          {below}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => drawPane($, e))
}
