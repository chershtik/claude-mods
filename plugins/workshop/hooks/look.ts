// The pane's colors and section order, shared by pane.tsx and commands.tsx.
import type { Kind } from './catalog'

// Text colors are the app's theme keys, so they follow its look; the menu's fills are the dark theme's.
// ponytail: fills fixed for the dark theme, pick them by theme if the light one is ever used.
// The On here badges: a dark green fill and a round border in the same green, so they read as small
// filled pills; both lighten while the badge is hovered.
export const BADGE = { fill: ['#1d2b25', '#25382f'], line: ['#2f6f55', '#3f8f70'] } as const
export const FILL = { menu: '#2b2b29', menuBorder: '#3b3b38', hover: '#353532', row: '#262624', pane: '#1b1b1b' }
// The workshop's own accents, which the owner prefers over plain sidebar text: green names, orange
// section titles, blue for what is installed.
export const COLOR = { name: '#5fb99d', title: '#e0a560', always: '#58a6ff' }
// A row is one Button, and the desktop draws a button's text in its own color unless each Text sets
// one in hex. So each part of a row has a hex color and a lighter one for when the row is hovered.
export const TINT = {
  name: ['#5fb99d', '#80d0b6'],
  title: ['#e0a560', '#f0bd80'],
  always: ['#58a6ff', '#82bcff'],
  on: ['success', 'success'],
  quiet: ['#8a8a85', '#a8a8a3'],
  draft: ['#d4a24c', '#e6b968'],
} as const

export const SECTIONS: [Kind, string][] = [
  ['mod', 'Mods'],
  ['skill', 'Skills'],
  ['hook', 'Hooks'],
  ['workflow', 'Workflows'],
]
