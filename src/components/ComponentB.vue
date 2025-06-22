<script setup>
const lastAction = ref('')

const shortcuts = {
  ctrl_d: () => {
    lastAction.value = `Component B: Ctrl+D triggered at ${new Date().toLocaleTimeString()}`
  },
  f2: () => {
    lastAction.value = `Component B: F2 triggered at ${new Date().toLocaleTimeString()}`
  },
}

defineShortcuts(shortcuts)
</script>

<template>
  <div class="border-2 border-purple-200 rounded-lg bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/20">
    <h3 class="mb-2 text-lg text-purple-800 font-medium dark:text-purple-200">
      Component B
    </h3>
    <p class="mb-3 text-sm text-purple-700 dark:text-purple-300">
      Uses shortcuts: Ctrl+D, F2 (notice Ctrl+D conflicts with Component A)
    </p>
    <div class="text-sm text-purple-600 font-mono dark:text-purple-400">
      {{ lastAction || 'No actions yet' }}
    </div>
  </div>
</template>
