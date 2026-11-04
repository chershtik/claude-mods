import { expect, test } from 'claude-code/testing'

import { toBlocks, toSpans } from './register'

const MSG = (text: string) =>
  ({
    plugin: 'skim-colors',
    component: 'AssistantMessage',
    requestId: 'm1',
    props: { text, isFirstOfReply: true },
    surface: 'desktop',
  }) as const

test('tags and markers are hidden, headline and key phrase are drawn', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount(
    MSG('## Setup is done\n\n[ask] Do you want ==the prototype== now?\nplain line'),
  )

  expect((await ui.find({ type: 'Markdown', text: /Setup is done/ }))?.text).toBe('### Setup is done')
  expect((await ui.find({ type: 'Text', text: /the prototype/ }))?.text).toBe('Do you want the prototype now?')
  expect((await ui.find({ type: 'Text', text: /^the prototype$/ }))?.text).toBe('the prototype')
  expect(await ui.find({ type: 'Text', text: /\[ask\]/ })).toBeFalsy()
  await ui.unmount()
})

test('a flow line colors only its opening clause', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount(MSG('## Built\n[flow] I built the idea board :: a page where you ==drag cards== around'))

  expect((await ui.find({ type: 'Text', text: /^I built the idea board$/ }))?.text).toBe('I built the idea board')
  expect((await ui.find({ type: 'Text', text: /idea board.*drag cards.*around/ }))?.text).toBe(
    'I built the idea board — a page where you drag cards around',
  )
  expect(await ui.find({ type: 'Text', text: /::/ })).toBeFalsy()
  await ui.unmount()
})

test('a code fence, a table and a link line draw without error', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount(
    MSG('## Title\n```\ncode here\n```\n| a | b |\n| 1 | 2 |\n[flow] see [doc](https://a.b)'),
  )

  expect((await ui.find({ type: 'Markdown', text: /Title/ }))?.text).toBe('### Title')
  expect(await ui.find({ type: 'Markdown' })).toBeTruthy()
  await ui.unmount()
})

test('risk and ask lines are drawn inside a bordered box', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount(MSG('## Heads up\n[risk] This deletes files.\n[risk] It cannot be undone.\n[ask] Go ahead?'))

  expect((await ui.find({ type: 'Text', text: /^Risk$/ }))?.text).toBe('Risk')
  expect(await ui.find({ type: 'Text', text: /Your call/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /cannot be undone/ }))?.text).toBe('      It cannot be undone.')
  expect(await ui.find({ type: 'Text', text: /\[risk\]/ })).toBeFalsy()
  await ui.unmount()
})

test('a reply with nothing to color goes to the engine', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount(MSG('Done. One short sentence.'))

  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('fences, tables and link lines are left to markdown', () => {
  const blocks = toBlocks('a\n```\ncode\n```\n| x |\n| y |\n[ask] see [doc](https://a.b) ==now==')
  expect(blocks.map(b => b.kind)).toEqual(['line', 'md', 'md', 'md'])
  expect(blocks[3]).toEqual({ kind: 'md', text: 'see [doc](https://a.b) now' })
})

test('spans split key phrases, bold and code', () => {
  expect(toSpans('a ==b== **c** `d`').map(s => s.style)).toEqual(['plain', 'key', 'plain', 'bold', 'plain', 'code'])
})
