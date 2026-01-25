<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: Boolean,
  title: {
    type: String,
    default: '添加注释'
  },
  placeholder: {
    type: String,
    default: '请输入注释内容...'
  },
  initialValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

const inputValue = ref('')
const textareaRef = ref(null)

watch(() => props.visible, (val) => {
  if (val) {
    inputValue.value = props.initialValue
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
})

function confirm() {
  if (inputValue.value.trim()) {
    emit('confirm', inputValue.value.trim())
    close()
  }
}

function close() {
  emit('update:visible', false)
  emit('cancel')
  inputValue.value = ''
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    close()
  } else if (e.key === 'Enter' && e.ctrlKey) {
    confirm()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="close" @keydown="handleKeydown">
        <div class="modal-container">
          <div class="modal-header">
            <span class="modal-icon">📝</span>
            <span class="modal-title">{{ title }}</span>
            <button class="close-btn" @click="close">×</button>
          </div>
          
          <div class="modal-body">
            <textarea
              ref="textareaRef"
              v-model="inputValue"
              :placeholder="placeholder"
              class="input-textarea"
              rows="4"
              @keydown.ctrl.enter="confirm"
            ></textarea>
            <div class="input-hint">
              <span>💡 Ctrl + Enter 快速提交</span>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="close">取消</button>
            <button class="btn btn-confirm" @click="confirm" :disabled="!inputValue.trim()">
              确认
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  width: 420px;
  background: linear-gradient(180deg, #1e1e3f 0%, #1a1a2e 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.modal-icon {
  font-size: 20px;
}

.modal-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.modal-body {
  padding: 20px;
}

.input-textarea {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  transition: all 0.2s;
  font-family: inherit;
}

.input-textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.input-textarea:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.input-hint {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9) translateY(-20px);
}
</style>
