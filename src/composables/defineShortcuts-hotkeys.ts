import type { KeyHandler } from 'hotkeys-js'
import type { MaybeRef } from 'vue'
import hotkeys from 'hotkeys-js'
import { onBeforeUnmount, onMounted, reactive, readonly, toValue, watch } from 'vue'

export interface HotkeysConfig {
  [key: string]: KeyHandler
}

export interface HotkeysOptions {
  /** Scope to bind shortcuts to (default: 'all') */
  scope?: string
  /** Whether to disable shortcuts when inputs are focused (default: true) */
  disableOnInputs?: boolean
  /** Whether to capture keydown events (default: true) */
  keydown?: boolean
  /** Whether to capture keyup events (default: false) */
  keyup?: boolean
  /** Whether to split key combinations (default: false) */
  splitKey?: boolean
  /** Filter function to conditionally prevent shortcuts */
  filter?: (event: KeyboardEvent) => boolean
}

export function defineShortcuts(
  shortcuts: MaybeRef<HotkeysConfig>,
  options: HotkeysOptions = {},
) {
  const {
    scope = 'all',
    disableOnInputs = true,
    filter,
  } = options

  let currentScope = scope
  const boundKeys = new Set<string>()

  // Configure hotkeys global options
  const setupHotkeys = () => {
    // Set the scope
    hotkeys.setScope(currentScope)

    // Configure input field behavior
    if (disableOnInputs) {
      hotkeys.filter = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement
        const tagName = target && target.tagName
        const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable

        // Allow custom filter to override
        if (filter) {
          return !isInput && filter(event)
        }

        return !isInput
      }
    }
    else if (filter) {
      hotkeys.filter = filter
    }

    // Note: hotkeys-js doesn't expose these properties directly in the way expected
    // These would typically be handled in the binding options
  }

  const unbindAll = () => {
    boundKeys.forEach((key) => {
      hotkeys.unbind(key, currentScope)
    })
    boundKeys.clear()
  }

  const bindShortcuts = (config: HotkeysConfig) => {
    // Unbind existing shortcuts
    unbindAll()

    // Bind new shortcuts
    Object.entries(config).forEach(([key, handler]) => {
      hotkeys(key, { scope: currentScope }, handler)
      boundKeys.add(key)
    })
  }

  const changeScope = (newScope: string) => {
    currentScope = newScope
    hotkeys.setScope(newScope)
    // Re-bind shortcuts to new scope
    bindShortcuts(toValue(shortcuts))
  }

  const isPressed = (key: string): boolean => {
    return hotkeys.isPressed(key)
  }

  const getPressedKeys = (): string[] => {
    return hotkeys.getPressedKeyString()
  }

  const getScope = (): string => {
    return hotkeys.getScope()
  }

  const getAllKeyCodes = () => {
    return hotkeys.getAllKeyCodes()
  }

  const deleteScope = (scopeToDelete: string) => {
    hotkeys.deleteScope(scopeToDelete)
  }

  // Setup on mount
  onMounted(() => {
    setupHotkeys()
    bindShortcuts(toValue(shortcuts))
  })

  // Watch for changes in shortcuts
  watch(
    () => toValue(shortcuts),
    (newShortcuts) => {
      bindShortcuts(newShortcuts)
    },
    { deep: true },
  )

  // Cleanup on unmount
  onBeforeUnmount(() => {
    unbindAll()
  })

  return {
    // Scope management
    changeScope,
    getScope,
    getAllKeyCodes,
    deleteScope,

    // Key state queries
    isPressed,
    getPressedKeys,

    // Manual control
    unbindAll,

    // Access to hotkeys instance for advanced usage
    hotkeys,
  }
}

// Additional utility functions showcasing hotkeys-js features

/**
 * Create a hotkey with advanced options
 */
export function createHotkey(
  key: string,
  handler: KeyHandler,
  options: {
    scope?: string
    keydown?: boolean
    keyup?: boolean
    splitKey?: string
  } = {},
) {
  const { scope = 'all', keydown = true, keyup = false, splitKey } = options

  return hotkeys(key, { scope, keydown, keyup, splitKey }, handler)
}

/**
 * Create a scoped hotkey manager
 */
export function createScopedHotkeys(scopeName: string) {
  const shortcuts = new Map<string, KeyHandler>()

  const bind = (key: string, handler: KeyHandler) => {
    hotkeys(key, { scope: scopeName }, handler)
    shortcuts.set(key, handler)
  }

  const unbind = (key: string) => {
    hotkeys.unbind(key, scopeName)
    shortcuts.delete(key)
  }

  const activate = () => {
    hotkeys.setScope(scopeName)
  }

  const deactivate = () => {
    hotkeys.setScope('all')
  }

  const destroy = () => {
    shortcuts.forEach((_, key) => {
      hotkeys.unbind(key, scopeName)
    })
    shortcuts.clear()
    hotkeys.deleteScope(scopeName)
  }

  return {
    bind,
    unbind,
    activate,
    deactivate,
    destroy,
    isActive: () => hotkeys.getScope() === scopeName,
    getShortcuts: () => Array.from(shortcuts.keys()),
  }
}

/**
 * Key sequence detector (for showing help or tutorials)
 */
export function createKeySequenceDetector(
  sequence: string[],
  callback: () => void,
  options: { timeout?: number, reset?: boolean } = {},
) {
  const { timeout = 2000, reset = true } = options
  let currentIndex = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const resetSequence = () => {
    currentIndex = 0
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const handler = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()

    if (key === sequence[currentIndex]) {
      currentIndex++

      if (currentIndex === sequence.length) {
        callback()
        if (reset)
          resetSequence()
        return
      }

      // Set timeout for next key
      if (timer)
        clearTimeout(timer)
      timer = setTimeout(resetSequence, timeout)
    }
    else {
      resetSequence()
    }
  }

  // Bind to global keydown
  document.addEventListener('keydown', handler)

  return {
    destroy: () => {
      document.removeEventListener('keydown', handler)
      resetSequence()
    },
    reset: resetSequence,
  }
}

/**
 * Modifier key state tracker
 */
export function useModifierKeys() {
  const state = reactive({
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  })

  const updateState = () => {
    state.ctrl = hotkeys.isPressed('ctrl')
    state.alt = hotkeys.isPressed('alt')
    state.shift = hotkeys.isPressed('shift')
    state.meta = hotkeys.isPressed('cmd')
  }

  // Update on any key event
  const handler = () => updateState()
  document.addEventListener('keydown', handler)
  document.addEventListener('keyup', handler)

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handler)
    document.removeEventListener('keyup', handler)
  })

  return readonly(state)
}

/**
 * Hotkey conflict detector
 */
export function createHotkeyConflictDetector() {
  const registeredKeys = new Map<string, { scope: string, component: string }>()

  const register = (key: string, scope: string, component: string) => {
    const existing = registeredKeys.get(key)
    if (existing && existing.scope === scope) {
      console.warn(`⚠️ Hotkey conflict: '${key}' is already registered in scope '${scope}' by ${existing.component}. Now also registered by ${component}`)
    }
    registeredKeys.set(key, { scope, component })
  }

  const unregister = (key: string) => {
    registeredKeys.delete(key)
  }

  const getConflicts = () => {
    const conflicts: Record<string, Array<{ scope: string, component: string }>> = {}
    const keyGroups = new Map<string, Array<{ scope: string, component: string }>>()

    registeredKeys.forEach(({ scope, component }, key) => {
      if (!keyGroups.has(key)) {
        keyGroups.set(key, [])
      }
      keyGroups.get(key)!.push({ scope, component })
    })

    keyGroups.forEach((components, key) => {
      if (components.length > 1) {
        conflicts[key] = components
      }
    })

    return conflicts
  }

  return {
    register,
    unregister,
    getConflicts,
    getAllRegistered: () => Array.from(registeredKeys.entries()),
  }
}
