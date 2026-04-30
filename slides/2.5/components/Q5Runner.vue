<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  code: string
  width?: number
  height?: number
}>()

const runKey = ref(1)
const editedCode = ref(props.code)
const runningCode = ref(props.code)

function encodeCode(code: string): string {
  const utf8 = unescape(encodeURIComponent(code))
  const b64 = btoa(utf8)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const iframeSrc = computed(() => {
  return `/q5play/runner.html?code=${encodeCode(runningCode.value)}&r=${runKey.value}`
})

function runCode() {
  runningCode.value = editedCode.value
  runKey.value++
}

function resetCode() {
  editedCode.value = props.code
  runningCode.value = props.code
  runKey.value++
}

const iframeWidth = computed(() => (props.width ?? 360) + 'px')
const iframeHeight = computed(() => (props.height ?? 360) + 'px')
</script>

<template>
  <div class="q5-runner-wrap">
    <div class="q5-editor">
      <textarea v-model="editedCode" spellcheck="false" />
      <div class="q5-buttons">
        <button class="q5-btn q5-btn-run" @click="runCode">▶ Run</button>
        <button class="q5-btn q5-btn-reset" @click="resetCode">↺ Reset</button>
      </div>
    </div>
    <iframe
      :key="runKey"
      :src="iframeSrc"
      :style="{ width: iframeWidth, height: iframeHeight }"
      class="q5-iframe"
      allow="autoplay"
    />
  </div>
</template>

<style scoped>
.q5-runner-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 8px 0;
}

.q5-editor {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.q5-editor textarea {
  flex: 1;
  min-height: 300px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  padding: 10px;
  background: #282a36;
  color: #f8f8f2;
  border: 1px solid #44475a;
  border-radius: 4px;
  resize: vertical;
}

.q5-buttons {
  display: flex;
  gap: 8px;
}

.q5-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}

.q5-btn-run {
  background: #50fa7b;
  color: #282a36;
}

.q5-btn-reset {
  background: #44475a;
  color: #f8f8f2;
}

.q5-iframe {
  border: 1px solid #44475a;
  border-radius: 4px;
  background: #111;
}
</style>
