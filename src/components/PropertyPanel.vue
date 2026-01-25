<script setup>
import { ref, watch, inject } from 'vue'
import AnnotationModal from './AnnotationModal.vue'

const props = defineProps({
  element: {
    type: Object,
    default: null
  }
})

const lf = inject('lf')
const selectedElement = inject('selectedElement')

// 预设颜色
const colorPresets = ['#667eea', '#52c41a', '#ff4d4f', '#faad14', '#1890ff', '#722ed1', '#13c2c2', '#eb2f96']

// 注释弹窗状态
const showAnnotationModal = ref(false)
const annotationModalTitle = ref('添加注释')
const annotationModalValue = ref('')
const editingAnnotationIndex = ref(-1)

const formData = ref({
  text: '',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
})

watch(() => props.element, (newVal) => {
  if (newVal) {
    let textVal = ''
    if (newVal.text) {
      textVal = typeof newVal.text === 'string' ? newVal.text : (newVal.text.value || '')
    }
    formData.value = {
      text: textVal,
      x: Math.round(newVal.x || 0),
      y: Math.round(newVal.y || 0),
      width: Math.round(newVal.width || 100),
      height: Math.round(newVal.height || 80),
    }
  }
}, { immediate: true, deep: true })

function updateText() {
  if (!props.element || !lf.value) return
  const { id, isEdge } = props.element
  if (isEdge) {
    const edge = lf.value.getEdgeModelById(id)
    if (edge) edge.updateText(formData.value.text)
  } else {
    lf.value.updateText(id, formData.value.text)
  }
}

function updatePosition() {
  if (!props.element || !lf.value || props.element.isEdge) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) node.moveTo(formData.value.x, formData.value.y)
}

// 更新节点尺寸
function updateSize() {
  if (!props.element || !lf.value || props.element.isEdge) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.resize(formData.value.width, formData.value.height)
  }
}

// 图片节点操作
function uploadImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (file && props.element && lf.value) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const node = lf.value.getNodeModelById(props.element.id)
        if (node) {
          node.setProperties({
            imageSrc: event.target.result,
            imageAlt: file.name
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

function toggleDecoration(e) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ isDecoration: e.target.checked })
  }
}

// 更新节点颜色
function updateNodeColor(e) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ fillColor: e.target.value })
  }
}

function setNodeColor(color) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ fillColor: color })
  }
}

// 更新透明度
function updateOpacity(e) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ opacity: parseFloat(e.target.value) })
  }
}

// 更新字体大小
function updateFontSize(e) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ fontSize: parseInt(e.target.value) })
  }
}

// 更新字体颜色
function updateFontColor(e) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ fontColor: e.target.value })
  }
}

function setFontColor(color) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ fontColor: color })
  }
}

// 更新字体粗细
function updateFontWeight(e) {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node) {
    node.setProperties({ fontWeight: parseInt(e.target.value) })
  }
}

// 获取默认字体颜色（文本节点用深色，其他用白色）
function getDefaultFontColor() {
  if (props.element?.type === 'styled-text') {
    return '#333333'
  }
  return '#ffffff'
}

// 注释操作
function addAnnotation() {
  annotationModalTitle.value = '添加注释'
  annotationModalValue.value = ''
  editingAnnotationIndex.value = -1
  showAnnotationModal.value = true
}

function editAnnotation(index) {
  if (!props.element) return
  const annotations = props.element.properties?.annotations || []
  annotationModalTitle.value = '编辑注释'
  annotationModalValue.value = annotations[index]?.content || ''
  editingAnnotationIndex.value = index
  showAnnotationModal.value = true
}

function handleAnnotationConfirm(content) {
  if (!props.element || !lf.value) return
  
  const node = lf.value.getNodeModelById(props.element.id)
  if (!node) return
  
  const annotations = [...(node.properties.annotations || [])]
  const time = new Date().toLocaleString('zh-CN', { 
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
  })
  
  if (editingAnnotationIndex.value >= 0) {
    // 编辑现有注释
    annotations[editingAnnotationIndex.value] = { content, time }
  } else {
    // 添加新注释
    annotations.push({ content, time })
  }
  
  node.setProperties({ annotations })
  
  // 立即更新属性面板显示
  refreshSelectedElement()
}

function deleteAnnotation(index) {
  if (!props.element || !lf.value) return
  if (confirm('确定删除这条注释吗？')) {
    const node = lf.value.getNodeModelById(props.element.id)
    if (node) {
      const annotations = [...(node.properties.annotations || [])]
      annotations.splice(index, 1)
      node.setProperties({ annotations })
      // 立即更新属性面板显示
      refreshSelectedElement()
    }
  }
}

// 刷新选中元素数据
function refreshSelectedElement() {
  if (!props.element || !lf.value) return
  const node = lf.value.getNodeModelById(props.element.id)
  if (node && selectedElement) {
    // 更新 selectedElement 以触发响应式更新
    selectedElement.value = {
      ...node.getData(),
      isNode: true
    }
  }
}
</script>

<template>
  <aside class="property-panel">
    <div class="panel-header">
      <span class="header-icon">⚙️</span>
      <span>属性面板</span>
    </div>

    <div class="panel-content">
      <!-- 无选中时 -->
      <div v-if="!element" class="empty-state">
        <div class="empty-illustration">
          <div class="floating-shapes">
            <div class="shape shape-1">○</div>
            <div class="shape shape-2">□</div>
            <div class="shape shape-3">◇</div>
          </div>
        </div>
        <h3 class="empty-title">选择元素</h3>
        <p class="empty-desc">点击画布上的节点或连线查看属性</p>
      </div>

      <!-- 已选中 -->
      <div v-else class="property-form">
        <!-- 元素信息卡片 -->
        <div class="info-card">
          <div class="info-header">
            <div class="info-icon" :class="element.isEdge ? 'edge' : 'node'">
              {{ element.isEdge ? '↗️' : '⬡' }}
            </div>
            <div class="info-text">
              <span class="info-type">{{ element.isEdge ? '连接线' : '节点' }}</span>
              <span class="info-subtype">{{ element.type }}</span>
            </div>
          </div>
          <div class="info-id">
            <span class="id-label">ID</span>
            <code class="id-value">{{ element.id }}</code>
          </div>
        </div>

        <!-- 文本编辑 -->
        <div class="property-section">
          <div class="section-header">
            <span class="section-icon">✏️</span>
            <span class="section-title">文本内容</span>
          </div>
          <div class="input-wrapper">
            <input 
              type="text" 
              v-model="formData.text" 
              @blur="updateText"
              @keyup.enter="updateText"
              placeholder="输入文本..."
              class="text-input"
            />
          </div>
        </div>

        <!-- 位置和尺寸（仅节点） -->
        <div v-if="!element.isEdge" class="property-section">
          <div class="section-header">
            <span class="section-icon">📍</span>
            <span class="section-title">位置与尺寸</span>
          </div>
          <div class="coord-inputs">
            <div class="coord-item">
              <label>X</label>
              <input 
                type="number" 
                v-model.number="formData.x" 
                @blur="updatePosition"
                @keyup.enter="updatePosition"
              />
            </div>
            <div class="coord-item">
              <label>Y</label>
              <input 
                type="number" 
                v-model.number="formData.y" 
                @blur="updatePosition"
                @keyup.enter="updatePosition"
              />
            </div>
          </div>
          <div class="coord-inputs" style="margin-top: 10px;">
            <div class="coord-item">
              <label>宽度</label>
              <input 
                type="number" 
                v-model.number="formData.width" 
                @blur="updateSize"
                @keyup.enter="updateSize"
                min="30"
              />
            </div>
            <div class="coord-item">
              <label>高度</label>
              <input 
                type="number" 
                v-model.number="formData.height" 
                @blur="updateSize"
                @keyup.enter="updateSize"
                min="30"
              />
            </div>
          </div>
        </div>

        <!-- 注释管理（所有节点） -->
        <div v-if="!element.isEdge" class="property-section annotation-section">
          <div class="section-header">
            <span class="section-icon">📝</span>
            <span class="section-title">节点注释</span>
            <button class="add-note-btn" @click="addAnnotation" title="添加注释">➕</button>
          </div>
          <div v-if="element.properties?.annotations?.length" class="annotation-preview">
            <div 
              v-for="(note, index) in element.properties.annotations" 
              :key="index"
              class="preview-item"
              @dblclick="editAnnotation(index)"
            >
              <span class="preview-index">#{{ index + 1 }}</span>
              <span class="preview-content">{{ note.content }}</span>
              <span class="preview-time">{{ note.time }}</span>
              <button class="delete-btn" @click="deleteAnnotation(index)">×</button>
            </div>
          </div>
          <div v-else class="no-notes">
            <span>💬</span>
            <span>暂无注释，点击 + 添加</span>
          </div>
        </div>

        <!-- 图片节点特殊属性 -->
        <div v-if="element?.type === 'image-node'" class="property-section">
          <div class="section-header">
            <span class="section-icon">🖼️</span>
            <span class="section-title">图片设置</span>
          </div>
          <div class="image-actions">
            <button class="action-btn" @click="uploadImage">
              <span>📂</span> 更换图片
            </button>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                :checked="element.properties?.isDecoration"
                @change="toggleDecoration"
              />
              作为装饰图片
            </label>
          </div>
        </div>

        <!-- 注释节点特殊属性 -->
        <div v-if="element?.type === 'annotation-node'" class="property-section">
          <div class="section-header">
            <span class="section-icon">📝</span>
            <span class="section-title">注释管理</span>
          </div>
          <div class="annotation-manager">
            <div class="annotation-count">
              <span class="count-number">{{ element.properties?.annotations?.length || 0 }}</span>
              <span class="count-label">条注释</span>
            </div>
            <button class="action-btn" @click="addAnnotation">
              <span>➕</span> 添加注释
            </button>
          </div>
          <div v-if="element.properties?.annotations?.length" class="annotation-preview">
            <div 
              v-for="(note, index) in element.properties.annotations" 
              :key="index"
              class="preview-item"
              @dblclick="editAnnotation(index)"
            >
              <span class="preview-index">#{{ index + 1 }}</span>
              <span class="preview-content">{{ note.content }}</span>
              <button class="delete-btn" @click="deleteAnnotation(index)">×</button>
            </div>
          </div>
        </div>

        <!-- 节点样式（美化节点） -->
        <div v-if="!element.isEdge && element.type?.startsWith('styled-')" class="property-section">
          <div class="section-header">
            <span class="section-icon">🎨</span>
            <span class="section-title">{{ element.type === 'styled-text' ? '文本样式' : '节点样式' }}</span>
          </div>
                  
          <!-- 节点颜色/背景色 -->
          <div class="style-row">
            <span class="style-label">{{ element.type === 'styled-text' ? '背景色' : '节点颜色' }}</span>
            <div class="color-picker-row">
              <input 
                type="color" 
                :value="element.properties?.fillColor || '#667eea'"
                @change="updateNodeColor"
                class="color-input"
              />
              <div class="color-presets">
                <div 
                  v-for="color in colorPresets" 
                  :key="color"
                  class="color-dot"
                  :style="{ background: color }"
                  @click="setNodeColor(color)"
                ></div>
              </div>
            </div>
          </div>

          <!-- 透明度 -->
          <div class="style-row">
            <span class="style-label">透明度</span>
            <div class="slider-row">
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1"
                :value="element.properties?.opacity ?? 1"
                @input="updateOpacity"
                class="range-slider"
              />
              <span class="slider-value">{{ Math.round((element.properties?.opacity ?? 1) * 100) }}%</span>
            </div>
          </div>

          <!-- 字体大小 -->
          <div class="style-row">
            <span class="style-label">字体大小</span>
            <div class="slider-row">
              <input 
                type="range" 
                min="10" 
                max="32" 
                step="1"
                :value="element.properties?.fontSize ?? 14"
                @input="updateFontSize"
                class="range-slider"
              />
              <span class="slider-value">{{ element.properties?.fontSize ?? 14 }}px</span>
            </div>
          </div>

          <!-- 字体粗细（文本节点） -->
          <div v-if="element.type === 'styled-text'" class="style-row">
            <span class="style-label">字体粗细</span>
            <div class="slider-row">
              <input 
                type="range" 
                min="300" 
                max="700" 
                step="100"
                :value="element.properties?.fontWeight ?? 400"
                @input="updateFontWeight"
                class="range-slider"
              />
              <span class="slider-value">{{ element.properties?.fontWeight ?? 400 }}</span>
            </div>
          </div>

          <!-- 字体颜色 -->
          <div class="style-row">
            <span class="style-label">字体颜色</span>
            <div class="color-picker-row">
              <input 
                type="color" 
                :value="element.properties?.fontColor || getDefaultFontColor()"
                @change="updateFontColor"
                class="color-input"
              />
              <div class="color-presets">
                <div class="color-dot" style="background: #ffffff" @click="setFontColor('#ffffff')"></div>
                <div class="color-dot" style="background: #000000" @click="setFontColor('#000000')"></div>
                <div class="color-dot" style="background: #333333" @click="setFontColor('#333333')"></div>
                <div class="color-dot" style="background: #666666" @click="setFontColor('#666666')"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 连线信息 -->
        <div v-if="element.isEdge" class="property-section">
          <div class="section-header">
            <span class="section-icon">🔗</span>
            <span class="section-title">连接关系</span>
          </div>
          <div class="connection-info">
            <div class="connection-node source">
              <span class="node-dot"></span>
              <span class="node-id">{{ element.sourceNodeId }}</span>
            </div>
            <div class="connection-arrow">→</div>
            <div class="connection-node target">
              <span class="node-dot"></span>
              <span class="node-id">{{ element.targetNodeId }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 注释弹窗 -->
    <AnnotationModal
      v-model:visible="showAnnotationModal"
      :title="annotationModalTitle"
      :initial-value="annotationModalValue"
      @confirm="handleAnnotationConfirm"
    />
  </aside>
</template>

<style scoped>
.property-panel {
  width: 260px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
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
  font-size: 18px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-illustration {
  width: 100px;
  height: 100px;
  margin-bottom: 24px;
  position: relative;
}

.floating-shapes {
  position: relative;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  font-size: 28px;
  color: rgba(255, 255, 255, 0.3);
  animation: float 3s ease-in-out infinite;
}

.shape-1 {
  top: 10%;
  left: 20%;
  animation-delay: 0s;
}

.shape-2 {
  top: 40%;
  right: 15%;
  animation-delay: 0.5s;
}

.shape-3 {
  bottom: 10%;
  left: 35%;
  animation-delay: 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.empty-title {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 8px;
  font-weight: 600;
}

.empty-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* 属性表单 */
.property-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 信息卡片 */
.info-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.info-icon.node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.info-icon.edge {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-type {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.info-subtype {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.info-id {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.id-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.id-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
}

/* 属性区块 */
.property-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 14px;
}

.section-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.input-wrapper {
  position: relative;
}

.text-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: white;
  transition: all 0.2s;
}

.text-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.text-input:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

/* 坐标输入 */
.coord-inputs {
  display: flex;
  gap: 10px;
}

.coord-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coord-item label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.coord-item input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: white;
  transition: all 0.2s;
}

.coord-item input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

/* 连接信息 */
.connection-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-node {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.source .node-dot {
  background: #52c41a;
}

.target .node-dot {
  background: #ff4d4f;
}

.node-id {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Consolas', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection-arrow {
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}

/* 图片节点样式 */
.image-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #667eea;
}

/* 注释管理样式 */
.annotation-manager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.annotation-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.count-number {
  font-size: 24px;
  font-weight: 700;
  color: #fcb69f;
}

.count-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.annotation-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.preview-index {
  font-size: 10px;
  font-weight: 600;
  color: #fcb69f;
}

.preview-content {
  flex: 1;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 77, 79, 0.2);
  color: #ff4d4f;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
  opacity: 0;
}

.preview-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #ff4d4f;
  color: white;
}

/* 颜色选择器 */
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-input {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
  background: transparent;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-input::-webkit-color-swatch {
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
}

.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.color-dot:hover {
  transform: scale(1.2);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 样式行 */
.style-row {
  margin-bottom: 14px;
}

.style-row:last-child {
  margin-bottom: 0;
}

.style-label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}

/* 滑块 */
.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.5);
}

.slider-value {
  min-width: 45px;
  text-align: right;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* 注释区块样式 */
.annotation-section .section-header {
  display: flex;
  align-items: center;
}

.add-note-btn {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.add-note-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.no-notes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.preview-time {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  margin-left: auto;
}
</style>
