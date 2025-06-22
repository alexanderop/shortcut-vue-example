<script setup lang="ts">
import { ref } from 'vue'
import { createHotkeyConflictDetector, createKeySequenceDetector, createScopedHotkeys, defineShortcuts, useModifierKeys } from '~/composables/defineShortcuts-hotkeys'

// Demo state
const message = ref('Press any hotkey to see it in action!')
const logs = ref<string[]>([])
const currentScope = ref('all')

// Modifier keys state
const modifiers = useModifierKeys()

// Conflict detector
const conflictDetector = createHotkeyConflictDetector()

// Log helper
function log(text: string) {
  logs.value.unshift(`${new Date().toLocaleTimeString()}: ${text}`)
  message.value = text
  if (logs.value.length > 10)
    logs.value.pop()
}

// Basic shortcuts with various key combinations
const shortcuts = defineShortcuts({
  // Single keys
  'f1': () => log('F1 pressed - Help triggered!'),
  'esc': () => log('Escape pressed - Cancel action'),

  // Modifier combinations
  'ctrl+s': (event) => {
    event.preventDefault()
    log('Ctrl+S pressed - Save action!')
  },
  'ctrl+shift+s': (event) => {
    event.preventDefault()
    log('Ctrl+Shift+S pressed - Save As action!')
  },
  'alt+enter': () => log('Alt+Enter pressed - Full screen toggle'),
  'cmd+k,ctrl+k': () => log('Cmd/Ctrl+K pressed - Command palette'),

  // Multiple key bindings
  'ctrl+a,ctrl+e': (event, handler) => {
    event.preventDefault()
    if (handler.key === 'ctrl+a') {
      log('Ctrl+A pressed - Select All')
    }
    else if (handler.key === 'ctrl+e') {
      log('Ctrl+E pressed - Export')
    }
  },

  // Arrow keys
  'up,down,left,right': (event, handler) => {
    log(`Arrow key pressed: ${handler.key}`)
  },

  // Function keys
  'f2': () => log('F2 pressed - Rename'),
  'f5': (event) => {
    event.preventDefault()
    log('F5 pressed - Refresh (prevented default)')
  },
  'f11': (event) => {
    event.preventDefault()
    log('F11 pressed - Fullscreen toggle (prevented default)')
  },

  // Number keys
  '1,2,3,4,5': (event, handler) => {
    log(`Number ${handler.key} pressed`)
  },

  // Letter combinations
  'g h': () => log('G then H - Go Home (sequence)'),
  'g i': () => log('G then I - Go to Issues'),
  'g p': () => log('G then P - Go to Pull Requests'),

  // Special characters
  'space': () => log('Spacebar pressed - Play/Pause'),
  'tab': (event) => {
    if (!event.shiftKey) {
      log('Tab pressed - Next item')
    }
  },
  'shift+tab': () => log('Shift+Tab pressed - Previous item'),

  // Complex combinations
  'ctrl+shift+alt+d': () => log('Ctrl+Shift+Alt+D - Developer tools'),
  'cmd+shift+p,ctrl+shift+p': () => log('Command Palette opened'),
}, {
  scope: 'demo',
  disableOnInputs: true,
  keydown: true,
  filter: (event) => {
    // Custom filter example - allow shortcuts even in contenteditable
    const target = event.target as HTMLElement
    return !target.closest('.no-shortcuts')
  },
})

// Scoped hotkeys example
const editorScope = createScopedHotkeys('editor')
editorScope.bind('ctrl+b', () => log('Bold text (editor scope)'))
editorScope.bind('ctrl+i', () => log('Italic text (editor scope)'))
editorScope.bind('ctrl+u', () => log('Underline text (editor scope)'))

const viewerScope = createScopedHotkeys('viewer')
viewerScope.bind('j', () => log('Next item (viewer scope)'))
viewerScope.bind('k', () => log('Previous item (viewer scope)'))
viewerScope.bind('x', () => log('Mark as read (viewer scope)'))

// Key sequence detector for easter eggs
const konamiCode = createKeySequenceDetector(
  ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'],
  () => {
    log('🎉 KONAMI CODE ACTIVATED! 🎉')
    document.body.style.background = 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)'
    setTimeout(() => {
      document.body.style.background = ''
    }, 3000)
  },
  { timeout: 1000 },
)

const helpSequence = createKeySequenceDetector(
  ['h', 'e', 'l', 'p'],
  () => log('Help sequence detected! Type "help" to show shortcuts'),
  { timeout: 1500 },
)

// Scope switching
function switchScope(scope: string) {
  currentScope.value = scope
  shortcuts.changeScope(scope)

  if (scope === 'editor') {
    editorScope.activate()
    log(`Switched to editor scope - Try Ctrl+B, Ctrl+I, Ctrl+U`)
  }
  else if (scope === 'viewer') {
    viewerScope.activate()
    log(`Switched to viewer scope - Try J, K, X`)
  }
  else {
    shortcuts.changeScope('demo')
    log('Switched to demo scope - All shortcuts available')
  }
}

// Register conflicts for demo
conflictDetector.register('ctrl+s', 'demo', 'HotkeysDemo')
conflictDetector.register('ctrl+s', 'editor', 'EditorScope')

// Cleanup
onBeforeUnmount(() => {
  konamiCode.destroy()
  helpSequence.destroy()
  editorScope.destroy()
  viewerScope.destroy()
})
</script>

<template>
  <div class="hotkeys-demo mx-auto max-w-4xl">
    <div class="mb-12">
      <h1 class="mb-4 text-5xl text-gray-900 font-light dark:text-gray-100">
        Hotkeys Demo
      </h1>
      <p class="text-lg text-gray-600 font-light dark:text-gray-400">
        Advanced keyboard shortcuts with hotkeys-js integration
      </p>
    </div>

    <!-- Status display -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Status
      </h2>
      <div class="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <div class="mb-3 text-sm text-gray-700 font-medium dark:text-gray-300">
          Last action:
        </div>
        <div class="min-h-[1.5rem] text-lg text-gray-900 font-mono dark:text-gray-100">
          {{ message }}
        </div>
        <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Current scope: <code class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">{{ shortcuts.getScope() }}</code>
        </div>
      </div>
    </div>

    <!-- Modifier keys state -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Modifier Keys
      </h2>
      <div class="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <div class="mb-3 text-sm text-gray-700 font-medium dark:text-gray-300">
          Currently pressed:
        </div>
        <div class="flex gap-4">
          <span :class="modifiers.ctrl ? 'text-blue-600 font-bold dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'">Ctrl</span>
          <span :class="modifiers.alt ? 'text-blue-600 font-bold dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'">Alt</span>
          <span :class="modifiers.shift ? 'text-blue-600 font-bold dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'">Shift</span>
          <span :class="modifiers.meta ? 'text-blue-600 font-bold dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'">Meta/Cmd</span>
        </div>
      </div>
    </div>

    <!-- Scope switching -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Scope Control
      </h2>
      <div class="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <div class="mb-4 text-sm text-gray-700 dark:text-gray-300">
          Switch between different shortcut scopes to test context-aware behavior:
        </div>
        <div class="flex gap-3">
          <button
            :class="currentScope === 'demo' ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'"
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            @click="switchScope('demo')"
          >
            Demo Scope
          </button>
          <button
            :class="currentScope === 'editor' ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'"
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            @click="switchScope('editor')"
          >
            Editor Scope
          </button>
          <button
            :class="currentScope === 'viewer' ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'"
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            @click="switchScope('viewer')"
          >
            Viewer Scope
          </button>
        </div>
      </div>
    </div>

    <!-- Input field test -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Input Handling
      </h2>
      <div class="rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
        <div class="mb-3 text-sm text-blue-700 font-medium dark:text-blue-300">
          Test shortcut behavior with form inputs:
        </div>
        <input
          type="text"
          placeholder="Shortcuts are disabled here (try Ctrl+S)"
          class="mb-4 w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
        >
        <div class="no-shortcuts border border-gray-300 rounded-md p-3 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" contenteditable>
          This contenteditable div blocks shortcuts (custom filter)
        </div>
      </div>
    </div>

    <!-- Shortcut reference -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Available Shortcuts
      </h2>
      <div class="grid gap-6 md:grid-cols-2">
        <div>
          <h3 class="mb-4 text-lg text-gray-700 font-medium dark:text-gray-300">
            Demo Scope
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">F1</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Help</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Ctrl+S</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Save</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Ctrl+Shift+S</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Save As</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Alt+Enter</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Fullscreen</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Ctrl+K</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Command Palette</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Arrow Keys</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Navigate</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">G → H</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Go Home</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Space</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Play/Pause</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="mb-4 text-lg text-gray-700 font-medium dark:text-gray-300">
            Special Sequences
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">↑↑↓↓←→←→BA</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Konami Code</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">H-E-L-P</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Help sequence</span>
            </div>
          </div>

          <h3 class="mb-4 mt-6 text-lg text-gray-700 font-medium dark:text-gray-300">
            Editor Scope
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Ctrl+B</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Bold</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Ctrl+I</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Italic</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">Ctrl+U</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Underline</span>
            </div>
          </div>

          <h3 class="mb-4 mt-6 text-lg text-gray-700 font-medium dark:text-gray-300">
            Viewer Scope
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">J</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Next item</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">K</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Previous item</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">X</kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Mark as read</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action log -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Action Log
      </h2>
      <div class="rounded-lg bg-gray-900 p-6">
        <div class="h-48 overflow-y-auto space-y-1">
          <div v-for="(logEntry, index) in logs" :key="index" class="text-sm text-green-400 font-mono">
            {{ logEntry }}
          </div>
          <div v-if="logs.length === 0" class="text-sm text-gray-500 italic">
            Press any hotkey to see actions here...
          </div>
        </div>
      </div>
    </div>

    <!-- Conflict detector demo -->
    <div class="rounded-lg bg-yellow-50 p-6 dark:bg-yellow-900/20">
      <h2 class="mb-4 text-2xl text-gray-800 font-light dark:text-gray-200">
        Conflict Detection
      </h2>
      <div class="mb-3 text-sm text-yellow-700 font-medium dark:text-yellow-300">
        Detected shortcut conflicts between scopes:
      </div>
      <div class="overflow-x-auto rounded bg-yellow-100 p-4 dark:bg-yellow-900/40">
        <pre class="text-sm text-yellow-800 dark:text-yellow-200">{{ JSON.stringify(conflictDetector.getConflicts(), null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
