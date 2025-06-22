<script setup lang="ts">
import ComponentA from '~/components/ComponentA.vue'
import ComponentB from '~/components/ComponentB.vue'

defineOptions({
  name: 'IndexPage',
})

const actions = ref<string[]>([])
const lastTriggered = ref('')

function addAction(action: string) {
  lastTriggered.value = action
  actions.value.unshift(`${new Date().toLocaleTimeString()}: ${action}`)
  if (actions.value.length > 5)
    actions.value.pop()
}

const shortcuts = {
  // Combined shortcuts
  'ctrl_s': () => addAction('Save triggered (Ctrl+S)'),
  'meta_k': () => addAction('Command palette triggered (⌘+K)'),
  'shift_d': () => addAction('Debug mode triggered (Shift+D)'),
  'ctrl_shift_p': () => addAction('Command triggered (Ctrl+Shift+P)'),

  // Chained shortcuts
  'g-h': () => addAction('Go home triggered (g→h)'),
  'g-g': () => addAction('Go to top triggered (g→g)'),
  'd-d': () => addAction('Delete triggered (d→d)'),
  'c-p': () => addAction('Copy path triggered (c→p)'),
}

defineShortcuts(shortcuts)

useHead({
  title: 'defineShortcuts Demo',
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <!-- Header -->
    <div class="mb-12">
      <h1 class="mb-4 text-5xl text-gray-900 font-light dark:text-gray-100">
        defineShortcuts
      </h1>
      <p class="text-lg text-gray-600 font-light dark:text-gray-400">
        A composable for keyboard shortcuts in Vue
      </p>
    </div>

    <!-- Live Demo Section -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Try the shortcuts
      </h2>

      <!-- Input field demo -->
      <div class="mb-6 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
        <div class="mb-3 text-sm text-blue-700 font-medium dark:text-blue-300">
          Test input field (shortcuts disabled while typing):
        </div>
        <input
          type="text"
          placeholder="Type here... shortcuts won't work while focused"
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
        >
      </div>

      <div class="mb-6 rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <div class="mb-3 text-sm text-gray-700 font-medium dark:text-gray-300">
          Last triggered:
        </div>
        <div class="min-h-[1.5rem] text-lg text-gray-900 font-mono dark:text-gray-100">
          {{ lastTriggered || 'Press any shortcut below...' }}
        </div>
      </div>

      <div class="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <div class="mb-3 text-sm text-gray-700 font-medium dark:text-gray-300">
          Recent actions:
        </div>
        <div class="space-y-1">
          <div
            v-for="action in actions"
            :key="action"
            class="text-sm text-gray-600 font-mono dark:text-gray-400"
          >
            {{ action }}
          </div>
          <div v-if="actions.length === 0" class="text-sm text-gray-500 italic">
            No actions yet
          </div>
        </div>
      </div>
    </div>

    <!-- Shortcuts Reference -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Available shortcuts
      </h2>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Combined Shortcuts -->
        <div>
          <h3 class="mb-4 text-lg text-gray-700 font-medium dark:text-gray-300">
            Combined shortcuts
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                Ctrl+S
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Save</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                ⌘+K
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Command palette</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                Shift+D
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Debug mode</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                Ctrl+Shift+P
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Command</span>
            </div>
          </div>
        </div>

        <!-- Chained Shortcuts -->
        <div>
          <h3 class="mb-4 text-lg text-gray-700 font-medium dark:text-gray-300">
            Chained shortcuts
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                g → h
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Go home</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                g → g
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Go to top</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                d → d
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Delete</span>
            </div>
            <div class="flex items-center justify-between">
              <kbd class="rounded bg-gray-200 px-2 py-1 text-sm font-mono dark:bg-gray-700">
                c → p
              </kbd>
              <span class="text-sm text-gray-600 dark:text-gray-400">Copy path</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Shortcut Conflicts Demo -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Multiple components with same shortcuts
      </h2>

      <div class="mb-6 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <div class="mb-2 text-sm text-yellow-800 font-medium dark:text-yellow-200">
          ⚠️ Behavior when shortcuts conflict:
        </div>
        <p class="text-sm text-yellow-700 dark:text-yellow-300">
          When multiple components define the same shortcut, <strong>both handlers will execute</strong> in the order they were registered.
          Try pressing <kbd class="rounded bg-yellow-200 px-1 text-xs dark:bg-yellow-800">Ctrl+D</kbd> to see both components respond.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <ComponentA />
        <ComponentB />
      </div>

      <div class="mt-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
        <div class="mb-2 text-sm text-gray-700 font-medium dark:text-gray-300">
          Test shortcuts:
        </div>
        <div class="flex flex-wrap gap-2">
          <kbd class="rounded bg-gray-200 px-2 py-1 text-xs font-mono dark:bg-gray-700">Ctrl+D</kbd>
          <span class="text-xs text-gray-500">triggers both components</span>
          <kbd class="rounded bg-gray-200 px-2 py-1 text-xs font-mono dark:bg-gray-700">F1</kbd>
          <span class="text-xs text-gray-500">only Component A</span>
          <kbd class="rounded bg-gray-200 px-2 py-1 text-xs font-mono dark:bg-gray-700">F2</kbd>
          <span class="text-xs text-gray-500">only Component B</span>
        </div>
      </div>
    </div>

    <!-- Usage Example -->
    <div class="mb-16">
      <h2 class="mb-6 text-2xl text-gray-800 font-light dark:text-gray-200">
        Usage
      </h2>

      <div class="overflow-x-auto rounded-lg bg-gray-900 p-6">
        <pre class="text-sm text-gray-100"><code>import { defineShortcuts } from './composables/defineShortcuts'

const shortcuts = {
  // Combined shortcuts (hold keys together)
  'ctrl_s': () => save(),
  'meta_k': () => openCommandPalette(),

  // Chained shortcuts (press keys in sequence)
  'g-h': () => goHome(),
  'd-d': () => deleteItem(),
}

defineShortcuts(shortcuts)</code></pre>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: home
</route>
