# Building Your Own defineShortcuts Composable: A Step-by-Step Guide Inspired by NuxtUI

If you've used [NuxtUI](https://ui.nuxt.com/), you've probably fallen in love with their `defineShortcuts` composable. It makes adding keyboard shortcuts to your Vue components incredibly intuitive:

```vue
<script setup>
defineShortcuts({
  'ctrl_k': () => openCommandPalette(),
  'g-d': () => navigateToDashboard(),
  'escape': () => closeModal()
})
</script>
```

But what if you're not using NuxtUI? What if you want to understand how it works under the hood? In this post, we'll build our own `defineShortcuts` composable from scratch using only VueUse utilities. We'll start simple and progressively add features until we have a robust, production-ready solution.

## Why Build Our Own?

NuxtUI's `defineShortcuts` is fantastic, but it's tightly coupled to their ecosystem. By building our own with VueUse, we get:

- **Framework agnostic**: Works with any Vue 3 project
- **Full control**: Customize behavior to fit your needs
- **Learning opportunity**: Understand the underlying patterns
- **Minimal dependencies**: Only VueUse, which you probably already use

## What We'll Build

Our final solution will support:

- **Simultaneous shortcuts**: `ctrl_s`, `shift_space`, `meta_k`
- **Sequential shortcuts**: `g-d`, `g-i`, `j-k`
- **Input detection**: Automatically disabled when typing in forms
- **Duplicate detection**: Warns when multiple components use the same shortcut
- **Component tracking**: Better error messages with component context
- **Type safety**: Full TypeScript support

Let's dive in!

## Step 1: The Naive Approach

Let's start with the simplest possible implementation using VueUse's `useEventListener`:

```ts
import type { MaybeRef } from 'vue'
// composables/defineShortcuts.ts
import { useEventListener } from '@vueuse/core'

type Handler = (e?: KeyboardEvent) => void
type ShortcutsConfig = Record<string, Handler>

export function defineShortcuts(config: MaybeRef<ShortcutsConfig>) {
  const configValue = toValue(config)

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    const handler = configValue[key]

    if (handler) {
      e.preventDefault()
      handler(e)
    }
  }

  return useEventListener('keydown', onKeyDown)
}
```

This works for basic single-key shortcuts:

```vue
<script setup>
defineShortcuts({
  escape: () => console.log('Escape pressed!'),
  enter: () => console.log('Enter pressed!')
})
</script>
```

**But it has major limitations:**

- No modifier keys (ctrl, shift, meta)
- No way to detect key combinations
- Triggers even when typing in inputs
- No duplicate detection

## Step 2: Upgrading with useMagicKeys

VueUse's `useMagicKeys` is perfect for handling simultaneous key combinations. Let's upgrade our solution:

```ts
import { useEventListener, useMagicKeys } from '@vueuse/core'
import { computed, toValue } from 'vue'

export function defineShortcuts(config: MaybeRef<ShortcutsConfig>) {
  const configValue = toValue(config)
  const macOS = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)

  // Parse shortcuts for simultaneous combinations
  const shortcuts = Object.entries(configValue).map(([key, handler]) => ({
    key: key.toLowerCase(),
    handler,
    isCombined: key.includes('_') // e.g., 'ctrl_s', 'shift_space'
  }))

  // Handle simultaneous combinations with useMagicKeys
  useMagicKeys({
    passive: false,
    onEventFired(e) {
      if (e.type !== 'keydown')
        return

      const combinedShortcut = shortcuts.find((s) => {
        if (!s.isCombined)
          return false

        const parts = s.key.split('_')
        const key = parts.filter(p => !['ctrl', 'meta', 'shift', 'alt'].includes(p)).join('_')
        const hasCtrl = parts.includes('ctrl')
        const hasMeta = parts.includes('meta')
        const hasShift = parts.includes('shift')
        const hasAlt = parts.includes('alt')

        // Handle macOS meta/ctrl normalization
        const expectedCtrl = !macOS && hasMeta ? true : hasCtrl
        const expectedMeta = macOS && hasMeta ? true : hasMeta

        return e.key.toLowerCase() === key
          && e.ctrlKey === expectedCtrl
          && e.metaKey === expectedMeta
          && e.shiftKey === hasShift
          && e.altKey === hasAlt
      })

      if (combinedShortcut) {
        e.preventDefault()
        combinedShortcut.handler(e)
      }
    }
  })

  // Handle simple keys with useEventListener
  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    const simpleShortcut = shortcuts.find(s => !s.isCombined && s.key === key)

    if (simpleShortcut) {
      e.preventDefault()
      simpleShortcut.handler(e)
    }
  }

  return useEventListener('keydown', onKeyDown)
}
```

Now we can handle modifier combinations:

```vue
<script setup>
defineShortcuts({
  ctrl_s: () => saveDocument(),
  meta_k: () => openCommandPalette(),
  shift_space: () => toggleFullscreen(),
  escape: () => closeModal()
})
</script>
```

This is much better! But we still have two major problems:

1. **Sequential shortcuts don't work** - `useMagicKeys` only handles simultaneous combinations
2. **Still triggers when typing** - We need to detect input focus

## Step 3: Adding Sequential Shortcuts

Sequential shortcuts like `g-d` (press 'g', then 'd') require a different approach. We need to:

1. Track a history of recent key presses
2. Match patterns in that history
3. Reset the history after a timeout

Here's where it gets interesting - **we can't use `useMagicKeys` for sequential shortcuts** because it's designed for simultaneous combinations. We need our own state management:

```ts
import { useDebounceFn, useEventListener, useMagicKeys } from '@vueuse/core'

export function defineShortcuts(
  config: MaybeRef<ShortcutsConfig>,
  { chainDelay = 800 } = {}
) {
  const configValue = toValue(config)

  // Parse shortcuts
  const shortcuts = Object.entries(configValue).map(([key, handler]) => ({
    key: key.toLowerCase(),
    handler,
    isChained: key.includes('-'), // e.g., 'g-d', 'g-i'
    isCombined: key.includes('_') && !key.includes('-') // e.g., 'ctrl_s'
  }))

  // State for sequential shortcuts
  const history: string[] = []
  const resetHistory = () => (history.length = 0)
  const debouncedReset = useDebounceFn(resetHistory, chainDelay)

  // Handle chained shortcuts
  const matchChained = (history: readonly string[], key: string): Handler | undefined => {
    if (!history.length)
      return undefined

    const pattern = `${history[history.length - 1]}-${key}`
    return shortcuts.find(s => s.isChained && s.key === pattern)?.handler
  }

  // Handle combined shortcuts with useMagicKeys
  useMagicKeys({
    passive: false,
    onEventFired(e) {
      if (e.type !== 'keydown') {
        return
      }

      // Skip if this might be part of a chained shortcut
      const key = e.key.toLowerCase()
      const hasChainedShortcut = shortcuts.some(s => s.isChained && s.key.includes(key))
      if (hasChainedShortcut)
        return

      // Handle combined shortcuts...
      const matchCombined = (e: KeyboardEvent): Handler | undefined => {
        return shortcuts.find((s) => {
          if (!s.isCombined)
            return false

          const parts = s.key.split('_')
          const targetKey = parts.filter(p => !['ctrl', 'meta', 'shift', 'alt'].includes(p)).join('_')

          return e.key.toLowerCase() === targetKey
            && e.ctrlKey === parts.includes('ctrl')
            && e.metaKey === parts.includes('meta')
            && e.shiftKey === parts.includes('shift')
            && e.altKey === parts.includes('alt')
        })?.handler
      }

      const combinedHandler = matchCombined(e)
      if (combinedHandler) {
        e.preventDefault()
        combinedHandler(e)
        resetHistory()
      }
    }
  })

  // Handle sequential and simple shortcuts
  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.key)
      return

    const key = e.key.toLowerCase()

    // Handle chained shortcuts
    const chainedHandler = matchChained(history, key)
    if (chainedHandler) {
      e.preventDefault()
      chainedHandler(e)
      resetHistory()
      return
    }

    // Build chain history
    const hasChainedShortcut = shortcuts.some(s =>
      s.isChained && (s.key.startsWith(key) || s.key.includes(`-${key}`))
    )
    if (hasChainedShortcut) {
      history.push(key)
      debouncedReset()
    }

    // Handle simple shortcuts
    const simpleHandler = shortcuts.find(s =>
      !s.isChained && !s.isCombined && s.key === key
    )?.handler

    if (simpleHandler) {
      e.preventDefault()
      simpleHandler(e)
      resetHistory()
    }
  }

  return useEventListener('keydown', onKeyDown)
}
```

Now we can use sequential shortcuts:

```vue
<script setup>
defineShortcuts({
  'g-d': () => navigateTo('/dashboard'),
  'g-i': () => navigateTo('/inbox'),
  'g-s': () => navigateTo('/settings'),
  'ctrl_k': () => openCommandPalette()
})
</script>
```

**Why the hybrid approach?** We use both `useMagicKeys` and `useEventListener` because:

- `useMagicKeys` excels at simultaneous combinations but can't handle sequences
- Our custom `useEventListener` handles sequences and simple keys
- The two systems coordinate to avoid conflicts

## Step 4: Preventing Input Conflicts

Currently, our shortcuts trigger even when users are typing in form fields. This is incredibly annoying! Let's fix it with `useActiveElement`:

```ts
import { useActiveElement } from '@vueuse/core'
import { computed } from 'vue'

export function defineShortcuts(
  config: MaybeRef<ShortcutsConfig>,
  { chainDelay = 800, disableOnInputs = true } = {}
) {
  // ... previous code ...

  // Prevent shortcuts when typing in input fields
  const activeElement = useActiveElement()
  const isTyping = computed(() => {
    if (!disableOnInputs)
      return false

    const tag = activeElement.value?.tagName?.toLowerCase()
    return tag === 'input'
      || tag === 'textarea'
      || activeElement.value?.isContentEditable
  })

  // Update useMagicKeys handler
  useMagicKeys({
    passive: false,
    onEventFired(e) {
      if (isTyping.value || e.type !== 'keydown') {
        // Skip processing when typing
      }
      // ... rest of handler
    }
  })

  // Update useEventListener handler
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTyping.value || !e.key) {
      // Skip processing when typing
    }
    // ... rest of handler
  }

  return useEventListener('keydown', onKeyDown)
}
```

Perfect! Now shortcuts are automatically disabled when users are typing in forms, but you can override this behavior by setting `disableOnInputs: false`.

## Step 5: The Duplication Problem

Here's a real-world problem: what happens when multiple components define the same shortcut?

```vue
<!-- ComponentA.vue -->
<script setup>
defineShortcuts({
  ctrl_k: () => openModalA()
})
</script>
```

```vue
<!-- ComponentB.vue -->
<script setup>
defineShortcuts({
  ctrl_k: () => openModalB() // Conflict!
})
</script>
```

Both handlers will execute, causing unexpected behavior. We need duplicate detection with helpful error messages.

Let's create a centralized registry:

```ts
// Centralized shortcut registry
class ShortcutRegistry {
  private static instance: ShortcutRegistry
  private registered = new Map<string, {
    component: string
    handler: Handler
    location: string
  }>()

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
        + `Both handlers will execute when the shortcut is triggered.`
      )
    }
    this.registered.set(shortcut, { component: componentName, handler, location })
  }

  unregister(shortcut: string): void {
    this.registered.delete(shortcut)
  }
}

// Helper functions to get component context
function getComponentName(): string {
  try {
    const instance = getCurrentInstance()
    return instance?.type?.name || instance?.type?.__name || 'Unknown Component'
  }
  catch {
    return 'Unknown Component'
  }
}

function getCallLocation(): string {
  const stack = new Error('Stack trace for shortcut registration').stack
  if (stack) {
    const lines = stack.split('\n')
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i]
      if (line && !line.includes('defineShortcuts.ts')) {
        return line.trim().replace(/^at\s+/, '')
      }
    }
  }
  return 'Unknown location'
}

export function defineShortcuts(config: MaybeRef<ShortcutsConfig>) {
  const configValue = toValue(config)
  const componentName = getComponentName()
  const location = getCallLocation()

  // Register all shortcuts for duplicate detection
  const registry = ShortcutRegistry.getInstance()
  Object.keys(configValue).forEach((shortcut) => {
    registry.register(shortcut, configValue[shortcut], componentName, location)
  })

  // ... rest of implementation
}
```

Now when you accidentally create duplicate shortcuts, you get helpful warnings:

```
⚠️  Shortcut conflict detected!
Shortcut 'ctrl_k' is already registered by SearchModal (SearchModal.vue:15:1)
Attempted to register again by CommandPalette (CommandPalette.vue:23:1)
Both handlers will execute when the shortcut is triggered.
```

This makes debugging so much easier!

## Step 6: The Complete Solution

Let's put it all together. Here's our final, production-ready implementation:

```ts
import type { MaybeRef } from 'vue'
import { useActiveElement, useDebounceFn, useEventListener, useMagicKeys } from '@vueuse/core'
import { computed, getCurrentInstance, toValue } from 'vue'

type Handler = (e?: KeyboardEvent) => void
type ShortcutsConfig = Record<string, Handler>

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
        + `Both handlers will execute when the shortcut is triggered.`
      )
    }
    this.registered.set(shortcut, { component: componentName, handler, location })
  }

  unregister(shortcut: string): void {
    this.registered.delete(shortcut)
  }
}

// Helper functions
function getComponentName(): string {
  try {
    const instance = getCurrentInstance()
    return instance?.type?.name || instance?.type?.__name || 'Unknown Component'
  }
  catch {
    return 'Unknown Component'
  }
}

function getCallLocation(): string {
  const stack = new Error('Stack trace for shortcut registration').stack
  if (stack) {
    const lines = stack.split('\n')
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i]
      if (line && !line.includes('defineShortcuts.ts')) {
        return line.trim().replace(/^at\s+/, '')
      }
    }
  }
  return 'Unknown location'
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

function parseShortcut(key: string, handler: Handler, macOS: boolean): Shortcut | null {
  const k = key.toLowerCase()
  const chained = k.includes('-') && !k.includes('_')
  const combined = k.includes('_')

  const base: Omit<Shortcut, 'handler' | 'chained'> = chained
    ? {
        key: k,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }
    : (() => {
        const parts = k.split('_')
        return {
          key: parts.filter(x => !['meta', 'command', 'ctrl', 'shift', 'alt', 'option'].includes(x)).join('_'),
          metaKey: parts.includes('meta') || parts.includes('command'),
          ctrlKey: parts.includes('ctrl'),
          shiftKey: parts.includes('shift'),
          altKey: parts.includes('alt') || parts.includes('option'),
        }
      })()

  // Handle macOS meta/ctrl normalization
  if (!macOS && base.metaKey && !base.ctrlKey) {
    base.metaKey = false
    base.ctrlKey = true
  }

  return { ...base, handler, chained }
}

export function defineShortcuts(
  config: MaybeRef<ShortcutsConfig>,
  { chainDelay = 800, disableOnInputs = true } = {}
) {
  const configValue = toValue(config)
  const componentName = getComponentName()
  const location = getCallLocation()

  // Register shortcuts for duplicate detection
  const registry = ShortcutRegistry.getInstance()
  Object.keys(configValue).forEach((shortcut) => {
    registry.register(shortcut, configValue[shortcut], componentName, location)
  })

  const macOS = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)

  // Prevent shortcuts when typing in input fields
  const activeElement = useActiveElement()
  const isTyping = computed(() => {
    if (!disableOnInputs)
      return false
    const tag = activeElement.value?.tagName?.toLowerCase()
    return tag === 'input' || tag === 'textarea' || activeElement.value?.isContentEditable
  })

  // Parse all shortcuts
  const shortcuts: readonly Shortcut[] = Object.entries(configValue).reduce<Shortcut[]>((acc, [k, h]) => {
    const s = parseShortcut(k, h, macOS)
    return s ? [...acc, s] : acc
  }, [])

  // State for sequential shortcuts
  const history: string[] = []
  const resetHistory = () => (history.length = 0)
  const debouncedReset = useDebounceFn(resetHistory, chainDelay)

  // Helper functions
  const matchChained = (history: readonly string[], key: string): Handler | undefined =>
    history.length
      ? shortcuts.find(s => s.chained && s.key === `${history[history.length - 1]}-${key}`)?.handler
      : undefined

  const matchCombined = (e: KeyboardEvent): Handler | undefined =>
    shortcuts.find(s =>
      !s.chained
      && s.key === e.key.toLowerCase()
      && s.ctrlKey === e.ctrlKey
      && s.metaKey === e.metaKey
      && s.shiftKey === e.shiftKey
      && s.altKey === e.altKey
    )?.handler

  // Handle simultaneous combinations with useMagicKeys
  useMagicKeys({
    passive: false,
    onEventFired(e) {
      if (isTyping.value || e.type !== 'keydown')
        return

      // Skip if this might be part of a chained shortcut
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
    }
  })

  // Handle sequential shortcuts and simple keys
  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.key || isTyping.value)
      return

    const key = e.key.toLowerCase()

    // Handle chained shortcuts
    const chainedHandler = matchChained(history, key)
    if (chainedHandler) {
      e.preventDefault()
      chainedHandler(e)
      resetHistory()
      return
    }

    // Build chain history
    const hasChainedShortcut = shortcuts.some(s =>
      s.chained && (s.key.startsWith(key) || s.key.includes(`-${key}`))
    )
    if (hasChainedShortcut) {
      history.push(key)
      debouncedReset()
    }
  }

  return useEventListener('keydown', onKeyDown)
}
```

## Usage Examples

Now you can use your custom `defineShortcuts` just like NuxtUI's version:

```vue
<script setup>
// Navigation shortcuts
defineShortcuts({
  'g-d': () => navigateTo('/dashboard'),
  'g-i': () => navigateTo('/inbox'),
  'g-s': () => navigateTo('/settings')
})

// Action shortcuts
defineShortcuts({
  'ctrl_s': () => saveDocument(),
  'ctrl_k': () => openCommandPalette(),
  'escape': () => closeModal(),
  '?': () => showHelp()
})

// Custom options
defineShortcuts({
  ctrl_enter: () => submitForm()
}, {
  chainDelay: 1000, // Wait 1 second before resetting chain
  disableOnInputs: false // Allow shortcuts even when typing
})
</script>
```

## Best Practices

### 1. Group Related Shortcuts

```vue
<script setup>
// Good: Group by feature
defineShortcuts({
  'g-d': () => navigateTo('/dashboard'),
  'g-i': () => navigateTo('/inbox'),
  'g-s': () => navigateTo('/settings')
})

defineShortcuts({
  ctrl_s: () => save(),
  ctrl_z: () => undo(),
  ctrl_y: () => redo()
})
</script>
```

### 2. Use Descriptive Patterns

```vue
<script setup>
// Good: Clear patterns
defineShortcuts({
  'g-d': () => goDashboard(), // g = "go"
  'g-i': () => goInbox(),
  'c-p': () => createPost(), // c = "create"
  'c-u': () => createUser()
})
</script>
```

### 3. Handle Conflicts Gracefully

```vue
<script setup>
// Listen for your own warnings
defineShortcuts({
  ctrl_k: () => {
    // Check if command palette is already open
    if (isCommandPaletteOpen.value)
      return
    openCommandPalette()
  }
})
</script>
```

### 4. Document Your Shortcuts

```vue
<script setup>
// Consider creating a help modal that shows available shortcuts
const shortcuts = {
  Navigation: {
    'g-d': 'Go to Dashboard',
    'g-i': 'Go to Inbox'
  },
  Actions: {
    ctrl_s: 'Save',
    ctrl_k: 'Open command palette'
  }
}

defineShortcuts({
  'g-d': () => navigateTo('/dashboard'),
  'g-i': () => navigateTo('/inbox'),
  'ctrl_s': () => save(),
  'ctrl_k': () => openCommandPalette(),
  '?': () => showShortcutHelp(shortcuts)
})
</script>
```

## Performance Considerations

### 1. Cleanup is Automatic

Thanks to VueUse, all event listeners are automatically cleaned up when components unmount. No manual cleanup needed!

### 2. Debouncing Chain Resets

We use `useDebounceFn` to efficiently debounce chain resets. This prevents excessive function calls when users type quickly.

### 3. Singleton Registry

The registry uses a singleton pattern to minimize memory usage across all components.

### 4. Computed Input Detection

The `isTyping` computed property only recalculates when the active element changes, not on every keystroke.

## Advanced Features

### Custom Key Aliases

You can extend the parsing logic to support custom aliases:

```ts
const aliases = {
  cmd: macOS ? 'meta' : 'ctrl',
  option: 'alt'
}

// Now you can use:
defineShortcuts({
  cmd_k: () => openCommandPalette(),
  option_up: () => moveUp()
})
```

### Context-Aware Shortcuts

Different shortcuts based on current route or state:

```vue
<script setup>
const route = useRoute()

// Different shortcuts for different pages
watchEffect(() => {
  if (route.name === 'editor') {
    defineShortcuts({
      ctrl_s: () => saveDocument(),
      ctrl_b: () => toggleBold()
    })
  }
  else if (route.name === 'dashboard') {
    defineShortcuts({
      n: () => createNew(),
      r: () => refresh()
    })
  }
})
</script>
```

### Priority System

Handle conflicting shortcuts with priority:

```ts
// Higher priority shortcuts override lower ones
defineShortcuts({
  escape: () => closeModal()
}, { priority: 10 })

defineShortcuts({
  escape: () => clearSearch()
}, { priority: 5 })
```

## Comparing with Other Solutions

### vs. Native Event Listeners

```ts
// Native approach - verbose and error-prone
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    save()
  }
  if (e.key === 'g') {
    // Start building sequence... gets complex fast
  }
})

// Our solution - clean and declarative
defineShortcuts({
  'ctrl_s': () => save(),
  'g-d': () => navigateTo('/dashboard')
})
```

### vs. Hotkeys.js

```ts
// Hotkeys.js - external dependency
import hotkeys from 'hotkeys-js'

hotkeys('ctrl+s', (e) => {
  e.preventDefault()
  save()
})

// Our solution - integrated with Vue lifecycle
defineShortcuts({
  ctrl_s: () => save()
})
```

### vs. NuxtUI

```ts
// NuxtUI - framework locked
defineShortcuts({
  meta_k: () => openCommandPalette()
})

// Our solution - framework agnostic
defineShortcuts({
  meta_k: () => openCommandPalette()
})
```

## Edge Cases and Gotchas

### 1. International Keyboards

Some keyboard layouts might have different key codes. Test with various layouts:

```ts
// Consider mapping common international variations
const keyMappings = {
  ä: 'a',
  ö: 'o',
  ü: 'u'
}
```

### 2. Browser Shortcuts

Some combinations are reserved by browsers:

```ts
// These might not work in all browsers
defineShortcuts({
  ctrl_t: () => {}, // Usually opens new tab
  ctrl_w: () => {}, // Usually closes tab
  ctrl_r: () => {} // Usually refreshes page
})
```

### 3. Mobile Keyboards

Virtual keyboards behave differently:

```ts
// Consider disabling on mobile
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

defineShortcuts({
  ctrl_k: () => openCommandPalette()
}, {
  disableOnInputs: true,
  disableOnMobile: isMobile
})
```

### 4. Accessibility

Ensure shortcuts don't interfere with screen readers:

```ts
// Provide alternatives to shortcut-only actions
defineShortcuts({
  ctrl_k: () => {
    // Always provide a visible button alternative
    openCommandPalette()
    announceToScreenReader('Command palette opened')
  }
})
```

## Testing Your Shortcuts

### Unit Tests

```ts
import { fireEvent } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'

describe('defineShortcuts', () => {
  it('should trigger handler on key combination', async () => {
    const handler = vi.fn()

    // Mount component with shortcuts
    const { container } = render({
      setup() {
        defineShortcuts({ ctrl_s: handler })
        return {}
      }
    })

    // Simulate key press
    await fireEvent.keyDown(container, {
      key: 's',
      ctrlKey: true
    })

    expect(handler).toHaveBeenCalled()
  })
})
```

### E2E Tests

```ts
// cypress/e2e/shortcuts.cy.ts
describe('Keyboard Shortcuts', () => {
  it('should open command palette with Ctrl+K', () => {
    cy.visit('/dashboard')
    cy.get('body').type('{ctrl}k')
    cy.get('[data-testid="command-palette"]').should('be.visible')
  })

  it('should navigate with g-d sequence', () => {
    cy.visit('/')
    cy.get('body').type('g').type('d')
    cy.url().should('include', '/dashboard')
  })
})
```

## Future Improvements

### 1. Visual Feedback

Show shortcut hints in the UI:

```vue
<template>
  <button @click="save">
    Save
    <kbd>Ctrl+S</kbd>
  </button>
</template>
```

### 2. Recording Mode

Let users customize shortcuts:

```ts
const { startRecording, stopRecording, recordedShortcut } = useShortcutRecorder()

// User presses keys, we capture the combination
defineShortcuts({
  [recordedShortcut.value]: () => customAction()
})
```

### 3. Analytics

Track shortcut usage:

```ts
defineShortcuts({
  ctrl_k: () => {
    trackEvent('shortcut_used', { shortcut: 'ctrl_k' })
    openCommandPalette()
  }
})
```

### 4. Conflict Resolution UI

Show users when conflicts occur and let them resolve them:

```vue
<template>
  <div v-if="shortcutConflicts.length" class="conflict-warning">
    <p>Shortcut conflicts detected:</p>
    <ul>
      <li v-for="conflict in shortcutConflicts" :key="conflict.shortcut">
        {{ conflict.shortcut }} is used by {{ conflict.components.join(', ') }}
      </li>
    </ul>
  </div>
</template>
```

## Conclusion

We've built a robust, production-ready `defineShortcuts` composable that rivals NuxtUI's implementation. Here's what we accomplished:

✅ **Simultaneous shortcuts** with `useMagicKeys` integration
✅ **Sequential shortcuts** with custom state management
✅ **Input conflict prevention** using `useActiveElement`
✅ **Duplicate detection** with helpful error messages
✅ **Component tracking** for better debugging
✅ **Cross-platform compatibility** (macOS/Windows/Linux)
✅ **TypeScript support** for better DX
✅ **Automatic cleanup** via VueUse lifecycle management

### Key Learnings

1. **Hybrid approaches work**: Combining `useMagicKeys` with `useEventListener` gives us the best of both worlds
2. **State management matters**: Sequential shortcuts need careful state tracking and debouncing
3. **Developer experience is crucial**: Good error messages and component tracking save hours of debugging
4. **Edge cases are everywhere**: Input detection, browser shortcuts, and international keyboards all need consideration
5. **VueUse is powerful**: Leveraging existing composables makes our code more robust and maintainable

### When to Use This vs. Alternatives

**Use our solution when:**

- You want full control over shortcut behavior
- You're not using NuxtUI but want similar functionality
- You need custom features like analytics or recording
- You want to understand how shortcuts work under the hood

**Use NuxtUI's version when:**

- You're already using NuxtUI
- You want battle-tested, maintained code
- You don't need custom features

**Use simpler alternatives when:**

- You only need basic shortcuts
- Bundle size is critical
- You're building a simple app

### Next Steps

Try implementing this in your own project! Start with the basic version and gradually add features as you need them. The modular design makes it easy to extend and customize.

Remember: great developer tools are built incrementally. Start simple, identify pain points, and solve them one by one. That's exactly how we went from a naive 20-line function to a sophisticated shortcut system that handles real-world complexity.

Happy coding! 🚀

---

_Want to see the complete implementation? Check out the [full source code](https://github.com/your-repo/vue-shortcuts) with tests and examples._
