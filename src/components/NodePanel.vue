<script setup>
import { inject } from 'vue'

const lf = inject('lf')

const basicShapes = [
  { type: 'styled-rect', label: '矩形', icon: '▭', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fillColor: '#667eea' },
  { type: 'styled-circle', label: '圆形', icon: '○', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', fillColor: '#f5576c' },
  { type: 'styled-diamond', label: '菱形', icon: '◇', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', fillColor: '#4facfe' },
  { type: 'styled-ellipse', label: '椭圆', icon: '⬭', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', fillColor: '#13c2c2' },
  { type: 'styled-text', label: '文本', icon: 'T', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', fillColor: '#333333' },
]

const flowShapes = [
  { type: 'styled-circle', label: '开始', text: '开始', color: '#52c41a', bg: '#f6ffed', fillColor: '#52c41a' },
  { type: 'styled-circle', label: '结束', text: '结束', color: '#ff4d4f', bg: '#fff2f0', fillColor: '#ff4d4f' },
  { type: 'styled-rect', label: '处理', text: '处理', color: '#1890ff', bg: '#e6f7ff', fillColor: '#1890ff' },
  { type: 'styled-diamond', label: '判断', text: '判断?', color: '#faad14', bg: '#fffbe6', fillColor: '#faad14' },
  { type: 'styled-rect', label: '子流程', text: '子流程', color: '#722ed1', bg: '#f9f0ff', fillColor: '#722ed1' },
]

const specialNodes = [
  { type: 'image-node', label: '图片节点', icon: '🖼️', desc: '可上传图片', isDecoration: false },
  { type: 'image-node', label: '装饰图片', icon: '🎨', desc: '纯图片展示', isDecoration: true },
]

// 使用 LogicFlow 的 dnd API 拖拽
function startDrag(e, shape) {
  if (!lf.value) return
  lf.value.dnd.startDrag({
    type: shape.type,
    text: shape.text || shape.label,
    properties: {
      fillColor: shape.fillColor,
    }
  })
}

// 特殊节点拖拽
function startSpecialDrag(e, node) {
  if (!lf.value) return
  lf.value.dnd.startDrag({
    type: node.type,
    text: node.label,
    properties: {
      isDecoration: node.isDecoration,
    }
  })
}
</script>

<template>
  <aside class="node-panel">
    <!-- 标题 -->
    <div class="panel-header">
      <div class="header-icon">🎨</div>
      <span>组件库</span>
    </div>

    <div class="panel-content">
      <!-- 基础形状 -->
      <div class="category">
        <div class="category-header">
          <span class="category-icon">📐</span>
          <span class="category-title">基础形状</span>
        </div>
        <div class="node-grid">
          <div
            v-for="shape in basicShapes"
            :key="shape.type"
            class="node-item"
            @mousedown="startDrag($event, shape)"
          >
            <div class="node-preview" :style="{ background: shape.gradient }">
              <span class="preview-icon">{{ shape.icon }}</span>
            </div>
            <span class="node-label">{{ shape.label }}</span>
          </div>
        </div>
      </div>

      <!-- 流程图形状 -->
      <div class="category">
        <div class="category-header">
          <span class="category-icon">🔄</span>
          <span class="category-title">流程节点</span>
        </div>
        <div class="flow-grid">
          <div
            v-for="shape in flowShapes"
            :key="shape.label"
            class="flow-item"
            :style="{ '--node-color': shape.color, '--node-bg': shape.bg }"
            @mousedown="startDrag($event, shape)"
          >
            <div class="flow-indicator"></div>
            <span class="flow-label">{{ shape.label }}</span>
          </div>
        </div>
      </div>

      <!-- 特殊节点 -->
      <div class="category">
        <div class="category-header">
          <span class="category-icon">✨</span>
          <span class="category-title">特殊节点</span>
        </div>
        <div class="special-grid">
          <div
            v-for="node in specialNodes"
            :key="node.label"
            class="special-item"
            @mousedown="startSpecialDrag($event, node)"
          >
            <div class="special-icon">{{ node.icon }}</div>
            <div class="special-info">
              <span class="special-name">{{ node.label }}</span>
              <span class="special-desc">{{ node.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷键提示 -->
      <div class="shortcuts">
        <div class="shortcut-title">⌨️ 快捷键</div>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Z</kbd>
            <span>撤销</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Y</kbd>
            <span>重做</span>
          </div>
          <div class="shortcut-item">
            <kbd>Delete</kbd>
            <span>删除</span>
          </div>
          <div class="shortcut-item">
            <kbd>滚轮</kbd>
            <span>缩放</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.node-panel {
  width: 220px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
}

.panel-header {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 15px;
}

.header-icon {
  font-size: 20px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.category {
  margin-bottom: 20px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.category-icon {
  font-size: 14px;
}

.category-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 500;
}

/* 基础形状网格 */
.node-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.node-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: grab;
  transition: all 0.3s ease;
  user-select: none;
}

.node-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.node-item:active {
  cursor: grabbing;
  transform: scale(0.95);
}

.node-preview {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.preview-icon {
  font-size: 16px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.node-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

/* 流程节点 */
.flow-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--node-bg);
  border-radius: 10px;
  cursor: grab;
  transition: all 0.3s ease;
  user-select: none;
  border: 1px solid transparent;
}

.flow-item:hover {
  transform: translateX(4px);
  border-color: var(--node-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.flow-item:active {
  cursor: grabbing;
}

.flow-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--node-color);
  box-shadow: 0 0 8px var(--node-color);
}

.flow-label {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

/* 特殊节点 */
.special-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.special-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(255,236,210,0.3) 0%, rgba(252,182,159,0.3) 100%);
  border: 1px solid rgba(252, 182, 159, 0.4);
  border-radius: 10px;
  cursor: grab;
  transition: all 0.3s ease;
  user-select: none;
}

.special-item:hover {
  background: linear-gradient(135deg, rgba(255,236,210,0.5) 0%, rgba(252,182,159,0.5) 100%);
  border-color: #fcb69f;
  transform: translateX(4px);
}

.special-item:active {
  cursor: grabbing;
}

.special-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 4px 8px rgba(252, 182, 159, 0.3);
}

.special-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.special-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.special-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

/* 快捷键 */
.shortcuts {
  margin-top: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.shortcut-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 10px;
  font-weight: 500;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.shortcut-item span {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.4);
}

kbd {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
}
</style>
