/* eslint-disable regexp/no-super-linear-backtracking */
import type { MaybeRef } from 'vue'
import { useActiveElement, useDebounceFn, useEventListener, useMagicKeys } from '@vueuse/core'
import { computed, getCurrentInstance, toValue } from 'vue'

type Handler = (e?: KeyboardEvent) => void

// Centralized shortcut registry
class ShortcutRegistry {
  private static instance: ShortcutRegistry
  private registered = new Map<string, { component: string, handler: Handler, location: string }>()

  static getInstance(): ShortcutRegistry {
    if (!ShortcutRegistry.instance) {
      ShortcutRegistry.instance = new ShortcutRegistry()
    }
    return ShortcutRegistry.instance
  }

  register(shortcut: string, handler: Handler, componentName: string, location: string): void {
    if (this.registered.has(shortcut)) {
      const existing = this.registered.get(shortcut)!
      console.warn(
        `⚠️  Shortcut conflict detected!\n`
        + `Shortcut '${shortcut}' is already registered by ${existing.component} (${existing.location})\n`
        + `Attempted to register again by ${componentName} (${location})\n`
        + `Both handlers will execute when the shortcut is triggered.`,
      )
    }
    this.registered.set(shortcut, { component: componentName, handler, location })
  }

  unregister(shortcut: string): void {
    this.registered.delete(shortcut)
  }

  getRegisteredShortcuts(): string[] {
    return Array.from(this.registered.keys())
  }

  isRegistered(shortcut: string): boolean {
    return this.registered.has(shortcut)
  }

  getRegistration(shortcut: string) {
    return this.registered.get(shortcut)
  }
}

// Helper function to get component name from Vue component context
function getComponentName(): string {
  try {
    // Try to get component name from Vue's current instance
    const instance = getCurrentInstance()
    return instance?.type?.name || instance?.type?.__name || 'Unknown Component'
  }
  catch {
    return 'Unknown Component'
  }
}

// Helper function to get call location for better error messages
function getCallLocation(): string {
  const stack = new Error('Getting call stack').stack
  if (stack) {
    const lines = stack.split('\n')
    // Find the line that's not in this file
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i]
      if (line && !line.includes('defineShortcuts.ts')) {
        return line.trim().replace(/^at\s+/, '')
      }
    }
  }
  return 'Unknown location'
}

// Type-safe shortcuts configuration with branded types for better error messages
export type ShortcutsConfig = Record<string, Handler>

// Enhanced function to check for duplicates at runtime
function checkForDuplicates(config: ShortcutsConfig, componentName: string, location: string): void {
  const registry = ShortcutRegistry.getInstance()
  Object.keys(config).forEach((shortcut) => {
    registry.register(shortcut, config[shortcut], componentName, location)
  })
}

interface Shortcut {
  handler: Handler
  chained: boolean
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

const chainedShortcutRegex = /^[^-]+.*-.*[^-]+$/
const combinedShortcutRegex = /^[^_]+.*_.*[^_]+$/

function parseShortcut(key: string, handler: Handler, macOS: boolean): Shortcut | null {
  const k = key.toLowerCase()
  const chained = k.includes('-') && !k.includes('_')
  const combined = k.includes('_')

  if (chained && !chainedShortcutRegex.test(k))
    return null
  if (combined && !combinedShortcutRegex.test(k))
    return null

  const base: Omit<Shortcut, 'handler' | 'chained'> = chained
    ? {
        key: k,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }
    : (() => {
        const p = k.split('_')
        return {
          key: p.filter(x => !['meta', 'command', 'ctrl', 'shift', 'alt', 'option'].includes(x)).join('_'),
          metaKey: p.includes('meta') || p.includes('command'),
          ctrlKey: p.includes('ctrl'),
          shiftKey: p.includes('shift'),
          altKey: p.includes('alt') || p.includes('option'),
        }
      })()

  if (!macOS && base.metaKey && !base.ctrlKey) {
    base.metaKey = false
    base.ctrlKey = true
  }

  return { ...base, handler, chained }
}

export function defineShortcuts(
  config: MaybeRef<ShortcutsConfig>,
  { chainDelay = 800, disableOnInputs = true } = {},
) {
  // Check for duplicate shortcuts and register them
  const configValue = toValue(config)
  const componentName = getComponentName()
  const location = getCallLocation()
  checkForDuplicates(configValue, componentName, location)

  const macOS = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)

  // Prevent shortcuts when typing in input fields
  const activeElement = useActiveElement()
  const isTyping = computed(() => {
    if (!disableOnInputs)
      return false
    const tag = activeElement.value?.tagName?.toLowerCase()
    return tag === 'input' || tag === 'textarea' || activeElement.value?.isContentEditable
  })

  const shortcuts: readonly Shortcut[] = Object.entries(configValue).reduce<Shortcut[]>((acc, [k, h]) => {
    const s = parseShortcut(k, h, macOS)
    return s ? [...acc, s] : acc
  }, [])

  const history: string[] = []
  const resetHistory = () => (history.length = 0)

  // Use VueUse's useDebounceFn for more robust debouncing
  const debouncedReset = useDebounceFn(resetHistory, chainDelay)

  const matchChained = (history: readonly string[], key: string): Handler | undefined =>
    history.length
      ? shortcuts.find(s => s.chained && s.key === `${history[history.length - 1]}-${key}`)?.handler
      : undefined

  const matchCombined = (e: KeyboardEvent): Handler | undefined =>
    shortcuts.find(
      s =>
        !s.chained
        && s.key === e.key.toLowerCase()
        && s.ctrlKey === e.ctrlKey
        && s.metaKey === e.metaKey
        && s.shiftKey === e.shiftKey
        && s.altKey === e.altKey,
    )?.handler

  // Use useMagicKeys for better simultaneous key combination handling
  useMagicKeys({
    passive: false,
    onEventFired(e) {
      // Only handle if not typing and it's a keydown event
      if (isTyping.value || e.type !== 'keydown')
        return

      // Let the main handler deal with chained shortcuts
      const key = e.key.toLowerCase()
      const hasChainedShortcut = shortcuts.some(s => s.chained && s.key.includes(key))
      if (hasChainedShortcut)
        return

      // Handle simultaneous combinations
      const combinedHandler = matchCombined(e)
      if (combinedHandler) {
        e.preventDefault()
        combinedHandler(e)
        resetHistory()
      }
    },
  })

  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.key)
      return

    // Skip if user is typing in an input field
    if (isTyping.value)
      return

    const key = e.key.toLowerCase()

    // Handle chained shortcuts (sequential key presses)
    const chainedHandler = matchChained(history, key)
    if (chainedHandler) {
      e.preventDefault()
      chainedHandler(e)
      resetHistory()
      return
    }

    // For chained shortcuts, continue building the sequence
    const hasChainedShortcut = shortcuts.some(s => s.chained && (s.key.startsWith(key) || s.key.includes(`-${key}`)))
    if (hasChainedShortcut) {
      history.push(key)
      debouncedReset()
    }

    // Combined (simultaneous) shortcuts are now handled by useMagicKeys
  }

  return useEventListener('keydown', onKeyDown)
}
