// The On here strip: a title with a count, then one small badge per item turned on in this session,
// whose ✕ turns it off. No $ here: pane.tsx hands in the elements and the action.
import { itemKey } from './catalog'
import type { Item } from './catalog'
import { TINT } from './look'

export type OnHereKit = {
  Box: any
  Text: any
  Button: any
  items: Item[]
  tinted: (scope: string, tint: readonly [string, string], text: string, props?: Record<string, unknown>) => unknown
  badge: (scope: string) => Record<string, unknown>
  isBusy: (key: string) => boolean
  scopeOf: (prefix: string, key: string) => string
  turnOff: (item: Item) => void
}

export function drawOnHere(k: OnHereKit) {
  const { Box, Text, Button } = k
  if (k.items.length === 0) return null
  return (
    <Box key="on-here" flexDirection="column" gap="xs">
      <Box gap={1}>
        <Text color={TINT.on[0]} weight="bold">On here</Text>
        <Text color="inactive">{String(k.items.length)}</Text>
      </Box>
      {/* Small badges: a green name and a ✕ in one button, so a click anywhere on it turns it off. */}
      <Box gap="xs" flexWrap="wrap" alignItems="center">
        {k.items.map(item => {
          const key = itemKey(item)
          const g = k.scopeOf('on', key)
          return (
            <Box key={`on-${key}`} gap="sm" alignItems="center" paddingX="sm" paddingY="xs" {...k.badge(g)}>
              {k.tinted(g, TINT.name, item.name, { weight: 'semibold' })}
              {k.isBusy(`act-${key}`) ? (
                <Text size="caption" color="inactive">…</Text>
              ) : (
                <Button key={`off-${key}`} plain dimColor onPress={() => k.turnOff(item)}>
                  <Text size="footnote">✕</Text>
                </Button>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
