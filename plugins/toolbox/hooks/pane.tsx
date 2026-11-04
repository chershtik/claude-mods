// The workshop pane, drawn like the app's own sidebar: rows that light on hover, a ⋯ that opens a menu.
import { atom, read, update } from 'claude-code'
import type { Engine, RenderInput } from 'claude-code'

import {
  csv,
  toggleIn,
  addIdeaRequest,
  alwaysOnRequest,
  dropIdea,
  editSession,
  findPaths,
  groupItems,
  ideaKey,
  ideaSession,
  installRequest,
  itemKey,
  matches,
  newSession,
  offRequest,
  recordUse,
  refineRequest,
  removeHookRequest,
  sessionMods,
  sessionRequest,
  sortItems,
  useRequest,
} from './catalog'
import type { Idea, Item, SessionSpec, Usage } from './catalog'
import { drawCommands } from './commands'
import { loadCatalog } from './load'
import { drawOnHere } from './onhere'
import type { Catalog } from './load'
import { BADGE, COLOR, FILL, SECTIONS, TINT } from './look'

// Session values; register.tsx declares the ones it uses with the same keys and shapes.
// What is open: "menu:<key>" a row's ⋯ menu ("menu:top" the + menu), "edit:<key>" a row's edit box,
// "new-idea" the idea box; '' for nothing.
const editing = atom({ plugin: 'toolbox', key: 'editing' } as const, '', { shape: 'editing-1' })
// Section titles the person opened, comma-joined; every section starts folded shut.
const opened = atom({ plugin: 'toolbox', key: 'opened' } as const, '', { shape: 'opened-1' })
// Counts finished turns (and reloads) so the pane reads the folders again.
const turns = atom({ plugin: 'toolbox', key: 'turns' } as const, 0, { shape: 'turns-1' })
// Jobs that have not finished, comma-joined; their row says Working… until then.
const pending = atom({ plugin: 'toolbox', key: 'pending' } as const, '', { shape: 'pending-1' })
// The filter box's text.
const query = atom({ plugin: 'toolbox', key: 'query' } as const, '', { shape: 'query-1' })
// Skills and hooks turned on here from the pane, comma-joined item keys (mods are read from the
// session's mods folder).
const used = atom({ plugin: 'toolbox', key: 'used' } as const, '', { shape: 'used-1' })
// Pinned item and idea keys, comma-joined; also kept in $.store so they last across sessions.
const pins = atom({ plugin: 'toolbox', key: 'pins' } as const, '', { shape: 'pins-1' })

// A menu entry: an action, a separator line, or Description, whose text opens in a side menu.
type Entry = { id: string; label: string; run: () => void; isDanger?: boolean } | 'sep' | { about: string }
// The folders are read once per turn (or Reload), all in parallel, and kept here: folding, filtering
// and menus redraw from memory. The promise is kept so redraws during a read share it.
let cache: { stamp: string; data: Promise<Catalog> } | undefined

// A function declaration: the engine follows $ across an import only into one.
export async function drawPane($: Engine, e: RenderInput<'Pane'>) {
  const { Box, Text, Button, Input } = $.ui.resolve(e)
  const { root: ROOT, home: HOME } = await findPaths($)
  const SESSION_MODS = sessionMods()

  const [open, unfolded, waiting, filter, usedKeys, turn, pinned] = await Promise.all([
    read($, editing),
    read($, opened).then(csv),
    read($, pending).then(csv),
    read($, query),
    read($, used).then(csv),
    read($, turns),
    read($, pins).then(csv),
  ])
  const stamp = `${String(await $.session.id())}|${turn}`
  if (cache?.stamp !== stamp) cache = { stamp, data: loadCatalog($, ROOT, HOME, SESSION_MODS) }
  const catalog = await cache.data

  const items = catalog.items.map(item => ({
    ...item,
    isAlwaysOn: item.kind === 'mod' && catalog.alwaysOn.includes(item.name),
    isOnHere: item.kind === 'mod' ? catalog.sessionMods.includes(item.name) : usedKeys.includes(itemKey(item)),
  }))

  const setOpen = (value: string) => void update($, editing, () => value)
  const send = (text: string) => void $.prompt.submit({ text })
  const mark = (key: string) => void update($, pending, cur => [...csv(cur), key].join(','))
  const unmark = (key: string) => void update($, pending, cur => csv(cur).filter(k => k !== key).join(','))
  const isBusy = (key: string) => waiting.includes(key)
  // A row is working while any job of its own is (act-<key>, pin-<key>, edit-<key>, ...).
  const isRowBusy = (key: string) => waiting.some(job => job.endsWith(`-${key}`))
  const fail = (what: string) => (error: unknown) => $.ui.toast(`Could not ${what}: ${String((error as Error)?.message ?? error)}`)
  const isPinned = (key: string) => pinned.includes(key)
  const togglePin = (key: string) =>
    void update($, pins, cur => toggleIn(cur, key))
      .then(() => read($, pins))
      .then(next => $.store.set('pins', next))
      .catch(fail('save the pin'))

  // The app only starts a session when the person asks for it in the chat, so this writes the request
  // into the chat box and the person sends it with Enter.
  const startSession = (key: string, spec: SessionSpec) =>
    void $.prompt
      .fill({ text: sessionRequest(spec), mode: 'replace' })
      .then(filled =>
        $.ui.toast(filled.isFilled ? 'Request is in the chat box: press Enter to start the session.' : 'Could not fill the chat box: close the open dialog and try again.'),
      )
      .catch(fail('fill the chat box'))
      .finally(() => unmark(key))

  const openFolder = (key: string, path: string) =>
    void $.process
      .run(['explorer.exe', path.replaceAll('/', '\\')])
      .catch(fail('open the folder'))
      .finally(() => unmark(key))

  // Turning on or off: mods by the session's mods folder (read again after the turn), skills and
  // hooks by the `used` list, flipped at once so the row shows the new state.
  const switchItem = (item: Item) => {
    if (item.kind !== 'mod' && item.kind !== 'workflow') void update($, used, cur => toggleIn(cur, itemKey(item)))
    send(item.isOnHere ? offRequest(item, catalog.sessionId) : useRequest(item))
  }

  // A job from a menu: closes the menu, marks the row Working until the job is done (a request until
  // its turn ends, turn.complete clearing them all; a direct job until it settles), then runs it.
  const job = (id: string, label: string, run: () => void, isDanger = false): Entry => ({
    id,
    label,
    isDanger,
    run: () => {
      setOpen('')
      mark(id)
      run()
    },
  })
  // A menu entry with no job to wait on (pin, opening a box).
  const plain = (id: string, label: string, run: () => void): Entry => ({ id, label, run })

  // The menu is about as wide as the app's. Spacing uses the surface's own steps ('xs', 'sm'), which
  // the desktop draws finer than whole cells.
  const width = Math.min(26, Math.max(20, e.props.bodyColumns - 2))
  // The side menu opens against the menu's left edge, never over it, and is as wide as a description
  // wants whatever the pane's width (the pane's edge still clips what lies past it).
  const sideWidth = Math.max(14, Math.min(44, e.props.bodyColumns - width - 2))

  // A Box has no corner radius; a round border is the one rounding a surface draws. So a lit fill gets
  // one that rests in the color behind it (invisible) and takes the fill's color under the pointer:
  // what shows is a fill with rounded corners, no line.
  // A rounded pill: the round border takes the fill's own color, so only a filled, rounded shape shows.
  const badge = (scope: string) =>
    ({ borderStyle: 'round', borderColor: BADGE.fill[0], backgroundColor: BADGE.fill[0], hover: { scope, borderColor: BADGE.fill[1], backgroundColor: BADGE.fill[1] } }) as const
  const rounded = (rest: string, fill: string, scope?: string) =>
    ({ borderStyle: 'round', borderColor: rest, hover: { ...(scope ? { scope } : {}), backgroundColor: fill, borderColor: fill } }) as const

  // One clipped row of rule, so the line ends inside the menu whatever the font's width.
  const sep = (key: string) => (
    <Box key={key} height={1} overflow="hidden" marginX="sm">
      <Text color={FILL.menuBorder} mono>{'─'.repeat(80)}</Text>
    </Box>
  )

  // An entry: a plain Button on a Box that lights under the pointer.
  const entryBox = (id: string, onPress: () => void, label: unknown) => (
    <Box key={`mi-${id}`} paddingX="sm" paddingY="xs" alignItems="center" {...rounded(FILL.menu, FILL.hover)}>
      <Button key={id} plain onPress={onPress} hover={{ backgroundColor: FILL.hover }}>
        {label}
      </Button>
    </Box>
  )

  // Description ›: plain text, so only the entry lights (a Button would light its own label too),
  // nudged right by the inset a plain Button has, to start where the other labels do.
  // ponytail: the nudge ('xs') is a guess at the desktop Button's inset; match it if the labels drift.
  // The entry and its side menu share a hover scope, so the side menu can sit in the menu itself,
  // against its left edge, and stays open while the pointer is on either.
  const aboutEntry = (key: string) => (
    <Box key={`mi-about-${key}`} paddingX="sm" paddingY="xs" justifyContent="space-between" alignItems="center" {...rounded(FILL.menu, FILL.hover, scopeOf('about', key))}>
      <Box paddingLeft="xs">
        <Text color="text">Description</Text>
      </Box>
      <Text color="inactive">›</Text>
    </Box>
  )
  const sideMenu = (key: string, about: string, row: number) => (
    <Box key={`side-${key}`} position="absolute" top={row} right={width} width={sideWidth} display="none" hover={{ scope: scopeOf('about', key), display: 'flex' }} backgroundColor={FILL.menu} borderStyle="round" borderColor={FILL.menuBorder} paddingX="sm">
      <Text size="footnote" color="text">{about}</Text>
    </Box>
  )

  // The ⋯ menu, floating under its row over what is below: the app's session menu, same order of
  // things (actions, then pin, then the rest, the destructive one last in red).
  const menu = (key: string, entries: Entry[]) => {
    const aboutAt = entries.findIndex(entry => entry !== 'sep' && 'about' in entry)
    const about = aboutAt >= 0 ? (entries[aboutAt] as { about: string }).about : ''
    return (
      <Box position="absolute" top={2} right={0} width={width} flexDirection="column" backgroundColor={FILL.menu} borderStyle="round" borderColor={FILL.menuBorder} paddingY="xs">
        <Box justifyContent="flex-end" paddingRight="sm">
          <Button key={`close-${key}`} plain dimColor label="✕" onPress={() => setOpen('')} />
        </Box>
        {entries.map((entry, i) =>
          entry === 'sep'
            ? sep(`sep-${i}-${key}`)
            : 'about' in entry
              ? aboutEntry(key)
              : entryBox(entry.id, entry.run, <Text color={entry.isDanger ? 'error' : 'text'}>{entry.label}</Text>),
        )}
        {aboutAt >= 0 && sideMenu(key, about, aboutAt + 1)}
      </Box>
    )
  }

  // The ⋯ is only a sign that the row has a menu: shown while the pointer is on the row or its menu is
  // open, like the app's sidebar. The row itself is the button that opens the menu.
  // The row is a hover group (Tailwind's `group`): every part with the same scope lights while the
  // pointer is anywhere on the row. A part has its own color and a lighter one for the group's hover
  // (`group-hover:text-[...]`), and no fill of its own.
  // A hover scope is 1 to 64 characters, so it is a prefix and a hash of the key, never the key itself
  // (a hook's name can run past 64).
  const scopeOf = (prefix: string, key: string) => {
    let hash = 5381
    for (let i = 0; i < key.length; i++) hash = (Math.imul(hash, 33) + key.charCodeAt(i)) >>> 0
    return `${prefix}-${hash.toString(36)}`
  }
  const group = (key: string) => scopeOf('row', key)
  const tinted = (scope: string, tint: readonly [string, string], text: string, props: Record<string, unknown> = {}) => (
    <Text color={tint[0]} hover={{ scope, color: tint[1] }} {...props}>{text}</Text>
  )
  // ⋯ hides in the pane's color and shows while the group is hovered, or while its menu is open. It is a
  // Button, like the rest of the row, so a click on it opens the menu too.
  const moreMark = (key: string) => (
    <Button key={`more-${key}`} plain onPress={() => setOpen(open === `menu:${key}` ? '' : `menu:${key}`)} hover={{ scope: group(key), backgroundColor: FILL.row }}>
      <Text size="caption" color={TINT.quiet[0]}>⋯</Text>
    </Button>
  )

  const status = (item: Item, key: string): unknown => {
    const [tint, text] = isRowBusy(key)
      ? [TINT.quiet, 'Working…']
      : item.isAlwaysOn
        ? [TINT.always, 'always on']
        : item.kind === 'skill' && item.scope === 'workshop'
            ? [TINT.draft, 'draft']
            : [TINT.quiet, '']
    return text === '' ? null : tinted(group(key), tint, text, { size: 'caption' })
  }

  const itemMenu = (item: Item) => {
    const key = itemKey(item)
    const main: Entry[] =
      item.isAlwaysOn || (item.kind === 'hook' && item.scope === 'global')
        ? []
        : [job(`act-${key}`, item.kind === 'workflow' ? 'Run' : item.isOnHere ? (item.kind === 'skill' ? 'Stop using here' : 'Turn off here') : 'Use here', () => switchItem(item))]
    const extra: Entry[] = [
      ...(item.kind === 'mod' && item.scope === 'workshop'
        ? [job(`always-${key}`, item.isAlwaysOn ? 'Stop loading in every session' : 'Load in every session', () => send(alwaysOnRequest(item, !item.isAlwaysOn)))]
        : []),
      ...(item.kind === 'skill' && item.scope === 'workshop' ? [job(`install-${key}`, 'Install for all sessions', () => send(installRequest(item)))] : []),
      job(`folder-${key}`, 'Open folder', () => openFolder(`folder-${key}`, item.dir)),
      plain(`edit-${key}`, 'Edit…', () => setOpen(`edit:${key}`)),
    ]
    const danger: Entry[] = item.kind === 'hook' && item.scope === 'global' ? ['sep', job(`remove-${key}`, 'Remove everywhere', () => send(removeHookRequest(item)), true)] : []
    const note = item.hasNotes ? '' : ' (no CLAUDE.md: an edit session starts without context)'
    return menu(key, [
      ...main,
      { about: `${item.about || 'No description.'}${note}` },
      plain(`pin-${key}`, isPinned(key) ? 'Unpin' : 'Pin', () => {
        setOpen('')
        togglePin(key)
      }),
      'sep',
      ...extra,
      ...danger,
    ])
  }

  // ● on here, ◆ always on, ◇ installed for every session, ○ yours and off.
  const dot = (item: Item) => {
    const g = group(itemKey(item))
    // One blue for every icon; the shape says which: ● on here, ◆ always on, ◇ installed, ○ yours and off.
    const shape = item.isOnHere ? '●' : item.isAlwaysOn ? '◆' : item.scope === 'global' ? '◇' : '○'
    const icon = tinted(g, TINT.always, shape)
    return <Box width={2} justifyContent="center">{icon}</Box>
  }

  // One row: the status icon, the name and the status as plain coloured text (a Button would flatten
  // their colors), all in the row's hover group so the whole line lights as one, and the ⋯ Button at
  // the right end, which opens the menu. The ⋯ button's own highlight takes the row's fill.
  const line = (key: string, mark: unknown, name: string, tail: unknown, menuTree: unknown) => (
    <Box key={`line-${key}`} gap={1} alignItems="center" paddingX="sm" paddingY="xs" {...rounded(FILL.pane, FILL.row, group(key))}>
      {mark}
      <Box flexGrow={1} flexShrink={1} gap={1} alignItems="center">
        {tinted(group(key), TINT.name, name, { weight: 'semibold', wrap: 'truncate-end' })}
        {tail}
      </Box>
      {moreMark(key)}
      {open === `menu:${key}` && menuTree}
    </Box>
  )

  const row = (item: Item) => {
    const key = itemKey(item)
    return (
      <Box key={`row-${key}`} flexDirection="column">
        {line(key, dot(item), item.name, status(item, key), open === `menu:${key}` && itemMenu(item))}
        {open === `edit:${key}` && (
          <Box flexDirection="column" gap={1} paddingX={1} paddingY={1}>
            <Input
              key={`box-${key}`}
              placeholder="What should change? Starts an edit session"
              rows={3}
              autoFocus
              submitLabel="start edit session"
              onSubmit={text => {
                if (text.trim() === '') return
                mark(`edit-${key}`)
                startSession(`edit-${key}`, editSession(item, text.trim()))
                setOpen('')
              }}
            />
            <Box justifyContent="flex-end">
              <Button key={`cancel-${key}`} plain dimColor label="Cancel" onPress={() => setOpen('')} />
            </Box>
          </Box>
        )}
      </Box>
    )
  }

  const ideaRow = (idea: Idea) => {
    const key = ideaKey(idea)
    const drop = () =>
      void $.fs
        .read(`${ROOT}/IDEAS.md`)
        .then(text => $.fs.write(`${ROOT}/IDEAS.md`, dropIdea(text, idea)))
        .then(() => update($, turns, n => n + 1))
        .then(() => $.ui.toast(`Dropped "${idea.title}". To bring it back, set its line in IDEAS.md to [ ].`))
        .catch(fail('drop the idea'))
        .finally(() => unmark(`drop-${key}`))
    const ideaMenu = menu(key, [
      job(`refine-${key}`, 'Refine here', () => send(refineRequest(idea))),
      { about: `${idea.context || 'No context.'} · ${idea.date}` },
      job(`build-${key}`, 'Start a session for it', () => startSession(`build-${key}`, ideaSession(idea))),
      plain(`pin-${key}`, isPinned(key) ? 'Unpin' : 'Pin', () => {
        setOpen('')
        togglePin(key)
      }),
      'sep',
      job(`drop-${key}`, 'Drop', drop, true),
    ])
    const tail = tinted(group(key), TINT.quiet, isRowBusy(key) ? 'Working…' : idea.type, { size: 'caption' })
    return (
      <Box key={`row-${key}`} flexDirection="column">
        {line(key, <Box width={2} justifyContent="center">{tinted(group(key), TINT.title, '✦')}</Box>, idea.title, tail, ideaMenu)}
      </Box>
    )
  }

  // While the filter holds text every section with a match is open and shows only its matches.
  const isFiltering = filter.trim() !== ''
  const isOpen = (title: string) => isFiltering || unfolded.includes(title)
  // A section title: the triangle and title in orange, then the count, and "· N on" in green.
  const header = (title: string, count: number, onCount = 0) => (
    <Button key={`fold-${title}`} plain onPress={() => void update($, opened, cur => toggleIn(cur, title))}>
      <Text color={COLOR.title} weight="bold">{`${isOpen(title) ? '▾' : '▸'} ${title}`}</Text>
      <Text color="inactive">{` ${count}`}</Text>
      {onCount > 0 && <Text color="success">{` · ${onCount} on`}</Text>}
    </Button>
  )

  // A section's rows under small group labels (Pinned, Yours, Installed), shown when it holds more than
  // your own items; a section of only your own items stays a plain list.
  const groupedRows = (shown: Item[]) => {
    const groups = groupItems(shown, items, pinned)
    if (groups.length === 1 && groups[0][0] === 'Yours') return groups[0][1].map(row)
    return groups.map(([label, list]) => (
      <Box key={`group-${list[0].kind}-${label}`} flexDirection="column" gap="xs">
        <Box paddingX={1}>
          <Text size="caption" color="subtle">{label === 'Pinned' ? 'Pinned' : label === 'Yours' ? 'Yours · made in the workshop' : 'Installed · from outside'}</Text>
        </Box>
        {list.map(row)}
      </Box>
    ))
  }

  const ideas = catalog.ideas
    .filter(i => matches(filter, i.title, i.type, i.context))
    .sort((a, b) => Number(isPinned(ideaKey(b))) - Number(isPinned(ideaKey(a))))
  const sections = SECTIONS.map(([kind, title]) => {
    const all = sortItems(items.filter(i => i.kind === kind))
    return { kind, title, all, shown: all.filter(i => matches(filter, i.name, i.about)) }
  })
  const onHere = items.filter(i => i.isOnHere)
  const isEmpty = isFiltering && ideas.length === 0 && sections.every(s => s.shown.length === 0)
  const isTopMenu = open === 'menu:top'

  return (
    <Box flexDirection="column" gap={1}>
      {/* The top: filter and one + whose menu holds the rest, then what is on in this session. */}
      <Box flexDirection="column" gap={1}>
        <Box key="top" gap={1} alignItems="center">
          <Box flexGrow={1} flexShrink={1}>
            <Input key="filter" value={filter} placeholder="Filter everything…" rows={1} onInput={text => void update($, query, () => text)} onSubmit={() => {}} />
          </Box>
          <Button key="add" label="+" onPress={() => setOpen(isTopMenu ? '' : 'menu:top')} />
          {isTopMenu &&
            menu('top', [
              plain('new-idea', 'New idea…', () => setOpen('new-idea')),
              job('create-new', 'Create a mod, skill, hook…', () => startSession('create-new', newSession)),
              'sep',
              job('refresh', 'Reload the list', () => void update($, turns, n => n + 1).finally(() => unmark('refresh'))),
            ])}
        </Box>

        {open === 'new-idea' && (
          <Box flexDirection="column" gap={1}>
            <Input
              key="add-idea"
              placeholder="Say it the way it comes; it lands in IDEAS.md"
              rows={3}
              autoFocus
              submitLabel="add idea"
              onSubmit={text => {
                if (text.trim() === '') return
                mark('add-idea')
                send(addIdeaRequest(text.trim()))
                setOpen('')
              }}
            />
            <Box justifyContent="flex-end">
              <Button key="cancel-idea" plain dimColor label="Cancel" onPress={() => setOpen('')} />
            </Box>
          </Box>
        )}
        {isBusy('add-idea') && <Text size="footnote" color="inactive">Adding the idea…</Text>}

        {drawOnHere({ Box, Text, Button, items: onHere, tinted, badge, isBusy, scopeOf, turnOff: (item: Item) => (mark(`act-${itemKey(item)}`), switchItem(item)) })}
      </Box>

      {isEmpty && <Text color="inactive">Nothing matches “{filter.trim()}”.</Text>}

      {(!isFiltering || ideas.length > 0) && (
        <Box key="section-Ideas" flexDirection="column" gap={isOpen('Ideas') ? 'xs' : 0}>
          {header('Ideas', ideas.length)}
          {isOpen('Ideas') && !isFiltering && ideas.length === 0 && <Text size="footnote" color="inactive">Nothing waiting.</Text>}
          {isOpen('Ideas') && ideas.map(ideaRow)}
        </Box>
      )}

      {sections.map(({ title, all, shown }) =>
        isFiltering && shown.length === 0 ? null : (
          <Box key={`section-${title}`} flexDirection="column" gap={isOpen(title) ? 'xs' : 0}>
            {header(title, all.length, all.filter(i => i.isOnHere).length)}
            {isOpen(title) && shown.length === 0 && <Text size="footnote" color="inactive">Nothing here yet.</Text>}
            {isOpen(title) && groupedRows(shown)}
          </Box>
        ),
      )}

      {drawCommands({
        Box,
        Text,
        header,
        isOpen,
        isFiltering,
        filter,
        commands: catalog.commands.filter(c => !items.some(i => i.kind === 'skill' && i.name === c.name)),
        usage: catalog.usage,
        pinned,
        line,
        menu,
        job,
        plain,
        tinted,
        group,
        isPinned,
        togglePin,
        setOpen,
        isBusy: isRowBusy,
        // A run from the pane skips this mod's own command.run hook, so the pane counts it here.
        run: (key: string, name: string) =>
          void $.command
            .run({ command: name })
            .then(() => $.store.get('usage').catch(() => undefined))
            .then(usage => $.store.set('usage', recordUse((usage ?? {}) as Usage, name, Date.now())))
            .catch(fail(`run /${name}`))
            .finally(() => unmark(key)),
        fill: (name: string) =>
          void $.prompt
            .fill({ text: `/${name} `, mode: 'replace' })
            .catch(fail('fill the chat box')),
      })}

      <Text size="caption" color="inactive">● on here  ◆ always on  ◇ installed  ○ yours, off · ⋯ on a row for more</Text>

      {/* Room under the last rows so a menu opened there is not cut off by the pane's edge. */}
      {open.startsWith('menu:') && <Box key="menu-room" height={14} />}
    </Box>
  )
}
