<script setup>
const emit = defineEmits([
  'undo', 'redo', 'zoom-in', 'zoom-out', 'reset-zoom',
  'delete', 'select-all', 'new-file', 'save', 'load',
  'export-image', 'export-json', 'import-json'
])
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="brand">
        <span class="brand-icon">⚡</span>
        <span class="brand-text">FlowCraft</span>
      </div>
    </div>

    <div class="toolbar-center">
      <!-- 文件操作 -->
      <div class="tool-group">
        <button class="tool-btn" @click="emit('new-file')" title="新建">
          <span class="btn-icon">📄</span>
          <span class="btn-text">新建</span>
        </button>
        <button class="tool-btn" @click="emit('save')" title="保存">
          <span class="btn-icon">💾</span>
          <span class="btn-text">保存</span>
        </button>
        <button class="tool-btn" @click="emit('load')" title="加载">
          <span class="btn-icon">📂</span>
          <span class="btn-text">加载</span>
        </button>
      </div>

      <div class="divider"></div>

      <!-- 编辑操作 -->
      <div class="tool-group">
        <button class="tool-btn icon-only" @click="emit('undo')" title="撤销 Ctrl+Z">
          <span class="btn-icon">↩️</span>
        </button>
        <button class="tool-btn icon-only" @click="emit('redo')" title="重做 Ctrl+Y">
          <span class="btn-icon">↪️</span>
        </button>
        <button class="tool-btn icon-only danger" @click="emit('delete')" title="删除 Delete">
          <span class="btn-icon">🗑️</span>
        </button>
      </div>

      <div class="divider"></div>

      <!-- 视图操作 -->
      <div class="tool-group">
        <button class="tool-btn icon-only" @click="emit('zoom-out')" title="缩小">
          <span class="btn-icon">➖</span>
        </button>
        <button class="tool-btn icon-only" @click="emit('reset-zoom')" title="重置视图">
          <span class="btn-icon">🎯</span>
        </button>
        <button class="tool-btn icon-only" @click="emit('zoom-in')" title="放大">
          <span class="btn-icon">➕</span>
        </button>
      </div>

      <div class="divider"></div>

      <!-- 导出 -->
      <div class="tool-group">
        <button class="tool-btn" @click="emit('export-image')" title="导出图片">
          <span class="btn-icon">🖼️</span>
          <span class="btn-text">图片</span>
        </button>
        <button class="tool-btn" @click="emit('export-json')" title="导出JSON">
          <span class="btn-icon">📤</span>
          <span class="btn-text">导出</span>
        </button>
        <button class="tool-btn" @click="emit('import-json')" title="导入JSON">
          <span class="btn-icon">📥</span>
          <span class="btn-text">导入</span>
        </button>
      </div>
    </div>

    <div class="toolbar-right">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>就绪</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 24px;
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.8);
}

.tool-btn:hover {
  background: rgba(102, 126, 234, 0.3);
  color: white;
  transform: translateY(-1px);
}

.tool-btn:active {
  transform: scale(0.95);
}

.tool-btn.icon-only {
  padding: 8px;
}

.tool-btn.danger:hover {
  background: rgba(255, 77, 79, 0.3);
}

.btn-icon {
  font-size: 16px;
  line-height: 1;
}

.btn-text {
  font-size: 12px;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(82, 196, 26, 0.15);
  border: 1px solid rgba(82, 196, 26, 0.3);
  border-radius: 20px;
  font-size: 12px;
  color: #52c41a;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #52c41a;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 6px rgba(82, 196, 26, 0);
  }
}
</style>
