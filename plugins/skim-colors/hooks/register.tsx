import type { Register } from 'claude-code'

// One place for every color. Claude's own look, one accent and one hierarchy: what matters is bright
// and bold, what can be skipped is quieter, and nothing is a different hue just to be colorful.
// (Earlier palettes: amber headlines, mint openings, a coral and a gray box; the owner found it loud, 2026-11-04.)
const COLOR = {
  headline: '#f3f1ea', // the app's bright text, bold
  flow: '#f3f1ea', // the opening clause: bright and bold
  rest: '#aeaca4', // the rest of a flow line: present, but quieter
  key: '#e2967a', // Claude's terracotta, the single accent: one key phrase
  risk: '#e8786c', // only the word Risk
}

// Ask and risk lines are drawn as quiet callouts: a thin border in a barely lighter gray, a ground
// close to the page's, and color only in the label.
const BOX = {
  // The risk box's border takes its ground's color, so only the tinted ground shows.
  risk: { border: '#262120', ground: '#262120', label: 'Risk', labelColor: '#e8786c', style: 'single' },
  ask: { border: '#5a4136', ground: '#2a2320', label: '', labelColor: '#e2967a', style: 'single' },
} as const

type Role = 'flow' | 'ask' | 'risk' | 'dim'

const SECTION = {
  id: 'skim-colors:format',
  scope: 'session',
  text: [
    'Mandatory reply format, for every reply of three sentences or more (a plain sentence or two is exempt). Before sending, check the reply has a heading or a tagged line; if it has none, add them.',
    'Reply format. The reader skims when tired and reads ONLY colored text and headlines. Uncolored text is skipped, so it must never hold something the reader needs.',
    'For any reply longer than a few lines:',
    '- Open each section with a heading or a bold-only line that states the point.',
    '- Start a line with [flow] for what you did or how something works. Write it as [flow] Opening clause :: rest of the sentence. Only the opening clause (who did what, e.g. "I built the idea board", or a step name like "Capture:") is colored, the rest stays plain, with a ==marked span== only where the rest holds something the reader needs. Use [ask] for anything you need from the user (put those last), [risk] for failures or destructive steps, [dim] for skippable detail (paths, commands, logs). A tag goes after a list marker, if any. A tagged line is colored whole.',
    '- [ask] and [risk] lines are drawn as boxes, so write them as plain sentences with no ==marks==, one sentence per line, and keep them rare: [risk] only for failure or something destructive, [ask] only for a real decision you need.',
    '- In every other sentence that matters, wrap the span that carries its meaning in ==double equals==, at most ONE span per paragraph or line. The marked span must make sense alone and cover the substance (a clause or most of the sentence), never a label or two words. A [flow] line normally needs no span at all. Too much color hides the signal, so a sentence with nothing the reader needs gets no marker.',
    'Every paragraph must have something colored that states its message. Replies of one or two sentences get no markers. Never explain the markers.',
  ].join('\n'),
} as const

const TAG = /^(\s*(?:[-*]|\d+\.)?\s*)\[(flow|ask|risk|dim)\]\s*/
const HEADING = /^\s*#{1,6}\s+(.*)$/
const BOLD_LINE = /^\s*\*\*([^*]+?)\*\*:?\s*$/
const TRIGGER = /^\s*#{1,6}\s|\[(?:flow|ask|risk|dim)\]|==.+?==|^\s*\*\*[^*]+?\*\*:?\s*$/m

type Block =
  | { kind: 'md'; text: string }
  | { kind: 'line'; text: string }
  | { kind: 'gap' }

// Fences, tables and lines with links stay with the surface's own Markdown, so
// nothing in them breaks; only plain lines are redrawn with color.
export function toBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      let j = i + 1
      while (j < lines.length && !/^\s*```/.test(lines[j])) j++
      out.push({ kind: 'md', text: lines.slice(i, j + 1).join('\n') })
      i = j + 1
    } else if (/^\s*\|/.test(line)) {
      let j = i
      while (j < lines.length && /^\s*\|/.test(lines[j])) j++
      out.push({ kind: 'md', text: lines.slice(i, j).join('\n') })
      i = j
    } else if (line.trim() === '') {
      if (out.length > 0 && out[out.length - 1].kind !== 'gap') out.push({ kind: 'gap' })
      i++
    } else if (/\]\(/.test(line)) {
      out.push({ kind: 'md', text: line.replace(TAG, '$1').replace(/==(.+?)==/g, '$1') })
      i++
    } else {
      out.push({ kind: 'line', text: line })
      i++
    }
  }
  return out
}

type Span = { text: string; style: 'plain' | 'key' | 'bold' | 'code' }

export function toSpans(line: string): Span[] {
  const out: Span[] = []
  const re = /==(.+?)==|\*\*(.+?)\*\*|`([^`]+)`/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), style: 'plain' })
    if (m[1] !== undefined) out.push({ text: m[1], style: 'key' })
    else if (m[2] !== undefined) out.push({ text: m[2], style: 'bold' })
    else out.push({ text: m[3], style: 'code' })
    last = m.index + m[0].length
  }
  if (last < line.length) out.push({ text: line.slice(last), style: 'plain' })
  return out
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    return { sections: [...result.sections, SECTION] }
  })

  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const text = e.props.text
    if (e.props.isSummary || !TRIGGER.test(text)) return next(e)

    const { Box, Text, Markdown } = $.ui.resolve(e)

    // key spans are colored in plain lines, bold inside a callout box
    const spans = (line: string, inBox: boolean, quiet?: string) =>
      toSpans(line).map((s, k) => {
        if (s.style === 'key') return <Text key={k} color={inBox ? undefined : COLOR.key} weight={inBox ? 'bold' : undefined}>{s.text}</Text>
        if (s.style === 'bold') return <Text key={k} weight="bold">{s.text}</Text>
        if (s.style === 'code') return <Text key={k} mono>{s.text}</Text>
        return <Text key={k} color={quiet}>{s.text}</Text>
      })

    const rows: unknown[] = []
    let lastGap = true
    const push = (el: unknown, gap = false) => {
      rows.push(el)
      lastGap = gap
    }
    const space = () => {
      if (!lastGap) push(<Text key={`g${rows.length}`}> </Text>, true)
    }

    let box: { role: 'risk' | 'ask'; lines: string[] } | null = null
    const flush = () => {
      if (!box) return
      const look = BOX[box.role]
      const lines = box.lines
      space()
      push(
        <Box flexDirection="column" borderStyle={look.style} borderColor={look.border} backgroundColor={look.ground} paddingX={1}>
          {lines.map((l, k) => (
            <Text key={k}>
              {look.label !== '' && (k === 0 ? <Text color={look.labelColor} weight="bold">{look.label}</Text> : <Text>{' '.repeat(look.label.length)}</Text>)}
              {look.label !== '' && <Text>{'  '}</Text>}
              {spans(l, true)}
            </Text>
          ))}
        </Box>,
      )
      space()
      box = null
    }

    const blocks = toBlocks(text)
    const isListLine = (block: Block | undefined) => block?.kind === 'line' && /^\s*(?:[-*]|\d+\.)?\s*\[(?:flow|dim)\]/.test(block.text)
    blocks.forEach((block, n) => {
      if (block.kind === 'gap') {
        flush()
        if (isListLine(blocks[n - 1]) && isListLine(blocks[n + 1])) return
        if (!lastGap) push(<Text key={`b${n}`}> </Text>, true)
        return
      }
      if (block.kind === 'md') {
        flush()
        push(<Markdown text={block.text} />)
        return
      }

      const heading = HEADING.exec(block.text) ?? BOLD_LINE.exec(block.text)
      if (heading) {
        flush()
        space()
        push(
          <Markdown text={`### ${heading[1]}`} />,
        )
        return
      }

      const tag = TAG.exec(block.text)
      const role = (tag?.[2] ?? null) as Role | null
      const prefix = tag ? tag[1] : ''
      const body = tag ? block.text.slice(tag[0].length) : block.text

      if (role === 'risk' || role === 'ask') {
        if (box && box.role === role) box.lines.push(body)
        else {
          flush()
          box = { role, lines: [body] }
        }
        return
      }
      flush()

      // A flow line colors only its opening clause, the part before ' :: '.
      const cut = role === 'flow' ? body.indexOf(' :: ') : -1
      const lead = cut >= 0 ? body.slice(0, cut) : ''
      const rest = cut >= 0 ? body.slice(cut + 4) : body

      const line = (
        <Text key={n} dimColor={role === 'dim'}>
          {prefix}
          {cut >= 0 ? <Text color={COLOR.flow} weight="bold">{toSpans(lead).map((sp, k) => (sp.style === 'code' ? <Text key={k} mono>{sp.text}</Text> : <Text key={k}>{sp.text}</Text>))}</Text> : null}
          {cut >= 0 ? <Text color={COLOR.rest}>{' — '}</Text> : null}
          {spans(rest, false, cut >= 0 ? COLOR.rest : undefined)}
        </Text>
      )
      // A line that follows another list line gets a little air above it, less than a blank row.
      push(isListLine(block) && isListLine(blocks[n - 1] ?? blocks[n - 2]) ? <Box key={`l${n}`} paddingTop="xs">{line}</Box> : line)
    })
    flush()

    return <Box flexDirection="column">{rows}</Box>
  })
}
