declare module 'claude-code' {
  interface PluginState {
    'workshop': {
      editing: Shaped<string>
      opened: Shaped<string>
      isPaneOpen: Shaped<boolean>
      turns: Shaped<number>
      pending: Shaped<string>
      query: Shaped<string>
      used: Shaped<string>
      pins: Shaped<string>
    }
  }
}
export type EditingCard = string
