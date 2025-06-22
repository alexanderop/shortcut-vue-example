<script setup>
const lastAction = ref('')

const shortcuts = {
  ctrl_d: () => {
    lastAction.value = `Component A: Ctrl+D triggered at ${new Date().toLocaleTimeString()}`
  },
  f1: () => {
    lastAction.value = `Component A: F1 triggered at ${new Date().toLocaleTimeString()}`
  },
}

defineShortcuts(shortcuts)
</script>

<template>
  <div class="border-2 border-green-200 rounded-lg bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
    <h3 class="mb-2 text-lg text-green-800 font-medium dark:text-green-200">
      Component A
    </h3>
    <p class="mb-3 text-sm text-green-700 dark:text-green-300">
      Uses shortcuts: Ctrl+D, F1
    </p>
    <div class="text-sm text-green-600 font-mono dark:text-green-400">
      {{ lastAction || 'No actions yet' }}
    </div>
  </div>
</template>
