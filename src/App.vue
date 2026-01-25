<script setup>
import { ref, onMounted, provide, nextTick, onUnmounted, watch } from 'vue'
import LogicFlow from '@logicflow/core'
import { MiniMap, SelectionSelect, Snapshot } from '@logicflow/extension'
import '@logicflow/core/dist/index.css'
import '@logicflow/extension/dist/index.css'

import Toolbar from './components/Toolbar.vue'
import NodePanel from './components/NodePanel.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import ProjectManager from './components/ProjectManager.vue'
import InputModal from './components/InputModal.vue'
import { registerImageNode } from './nodes/ImageNode'
import { registerStyledNodes } from './nodes/StyledNodes'

// LogicFlow 实例
const lf = ref(null)
const selectedElement = ref(null)
const graphData = ref({ nodes: [], edges: [] })

// 项目管理
const showProjectManager = ref(false)
const currentProject = ref(null)
const projectManagerRef = ref(null)
const autoSaveTimer = ref(null)
const saveStatus = ref('已保存')

// 命名弹窗
const showNameModal = ref(false)
const pendingProjectAction = ref(null) // 'create' | 'rename'

// 画布颜色设置
const showCanvasColorPicker = ref(false)
const canvasColor = ref(localStorage.getItem('canvas-color') || '#f0f2f5')
const canvasColorPresets = [
  { name: '默认灰', color: '#f0f2f5' },
  { name: '杏仁黄', color: '#FAF9DE' },
  { name: '秋叶褐', color: '#FFF2E2' },
  { name: '绿豆沙', color: '#C7EDCC' },
  { name: '电脑管家', color: '#CCE8CF' },
  { name: '极光灰', color: '#EAEAEF' },
]

// 提供给子组件
provide('lf', lf)
provide('selectedElement', selectedElement)

// 初始化 LogicFlow
onMounted(async () => {
  await nextTick()
  
  const container = document.querySelector('#lf-container')
  if (!container) {
    console.error('容器不存在')
    return
  }
  
  const { width, height } = container.getBoundingClientRect()
  console.log('容器尺寸:', width, height)

  try {
    // 创建 LogicFlow 实例
    lf.value = new LogicFlow({
      container,
      width: width || 800,
      height: height || 600,
      grid: {
        size: 20,
        visible: true,
        type: 'dot',
        config: {
          color: '#b8c0cc',  // 更明显的网格点
        }
      },
      // 不设置 background，让容器控制背景色，避免覆盖网格点
      keyboard: {
        enabled: true,
      },
      edgeTextDraggable: true,
      nodeTextDraggable: false,  // 禁止文本单独拖动，保持与节点一体
      nodeTextEdit: true,
      edgeTextEdit: true,
      adjustEdgeStartAndEnd: true,
      hoverOutline: true,
      nodeSelectedOutline: true,
      edgeType: 'polyline',
      // 节点缩放
      allowResize: true,
      // 插件在这里配置
      plugins: [MiniMap, SelectionSelect, Snapshot],
    })

    console.log('LogicFlow 实例创建成功')

    // 注册自定义节点
    registerImageNode(lf.value)
    registerStyledNodes(lf.value)

    // 设置事件监听
    setupEventListeners()

    // 加载上次的项目或初始数据
    loadLastProject()

    // 启动自动保存
    startAutoSave()
    
    // 应用保存的画布颜色
    applyCanvasColor(canvasColor.value)

    // 先禁用小地图，确保主功能正常
    // setTimeout(() => {
    //   try {
    //     if (lf.value?.extension?.miniMap) {
    //       lf.value.extension.miniMap.show(150, 100)
    //     }
    //   } catch (e) {
    //     console.warn('MiniMap 显示失败', e)
    //   }
    // }, 500)

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
    
  } catch (error) {
    console.error('LogicFlow 初始化失败:', error)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  // 清理自动保存
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
})

// 设置事件监听
function setupEventListeners() {
  if (!lf.value) return

  lf.value.on('node:click', ({ data }) => {
    selectedElement.value = { ...data, isNode: true }
  })

  lf.value.on('edge:click', ({ data }) => {
    selectedElement.value = { ...data, isEdge: true }
  })

  lf.value.on('blank:click', () => {
    selectedElement.value = null
  })

  lf.value.on('node:add', updateGraphData)
  lf.value.on('node:delete', updateGraphData)
  lf.value.on('edge:add', updateGraphData)
  lf.value.on('edge:delete', updateGraphData)
  
  // 数据变化时标记需要保存
  lf.value.on('history:change', () => {
    saveStatus.value = '未保存'
  })
}

// 渲染初始数据
function renderInitialData() {
  if (!lf.value) return

  const initialData = {
    nodes: [
      { id: 'start', type: 'styled-circle', x: 200, y: 150, text: '开始', properties: { fillColor: '#52c41a' } },
      { id: 'process1', type: 'styled-rect', x: 400, y: 150, text: '处理步骤', properties: { fillColor: '#667eea' } },
      { id: 'decision', type: 'styled-diamond', x: 600, y: 150, text: '条件判断', properties: { fillColor: '#faad14' } },
      { id: 'process2', type: 'styled-rect', x: 600, y: 300, text: '其他处理', properties: { fillColor: '#722ed1' } },
      { id: 'end', type: 'styled-circle', x: 800, y: 150, text: '结束', properties: { fillColor: '#ff4d4f' } },
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'start', targetNodeId: 'process1' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'process1', targetNodeId: 'decision' },
      { id: 'e3', type: 'polyline', sourceNodeId: 'decision', targetNodeId: 'end', text: '是' },
      { id: 'e4', type: 'polyline', sourceNodeId: 'decision', targetNodeId: 'process2', text: '否' },
      { id: 'e5', type: 'polyline', sourceNodeId: 'process2', targetNodeId: 'process1' },
    ]
  }

  lf.value.render(initialData)
  updateGraphData()
  
  setTimeout(() => {
    lf.value?.translateCenter()
  }, 100)
}

function updateGraphData() {
  if (lf.value) {
    graphData.value = lf.value.getGraphData()
  }
}

function handleResize() {
  if (!lf.value) return
  const container = document.querySelector('#lf-container')
  if (container) {
    const { width, height } = container.getBoundingClientRect()
    lf.value.resize(width, height)
  }
}

// ========== 工具栏方法 ==========

function undo() { lf.value?.undo() }
function redo() { lf.value?.redo() }
function zoomIn() { lf.value?.zoom(true) }
function zoomOut() { lf.value?.zoom(false) }

function resetZoom() {
  lf.value?.resetZoom()
  lf.value?.translateCenter()
}

function deleteSelected() {
  if (!selectedElement.value || !lf.value) return
  const { id, isEdge } = selectedElement.value
  if (isEdge) {
    lf.value.deleteEdge(id)
  } else {
    lf.value.deleteNode(id)
  }
  selectedElement.value = null
  updateGraphData()
}

function selectAll() {
  console.log('全选')
}

function newFile() {
  if (confirm('确定要新建吗？当前未保存的内容将丢失。')) {
    lf.value?.clearData()
    selectedElement.value = null
    updateGraphData()
  }
}

function exportImage() {
  if (!lf.value) return
  // 直接导出透明背景
  lf.value.getSnapshot(`flowchart-${Date.now()}`, 'transparent')
}

// 下载 Blob 文件
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportJSON() {
  const data = lf.value?.getGraphData()
  if (!data) return
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flowchart-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importJSON() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        lf.value?.render(JSON.parse(event.target.result))
        updateGraphData()
        alert('导入成功！')
      } catch (e) {
        alert('导入失败')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

// ========== 画布颜色 ==========

function applyCanvasColor(color) {
  canvasColor.value = color
  localStorage.setItem('canvas-color', color)
  
  // 只设置容器背景，不要设置 SVG 层，否则会覆盖网格点
  const container = document.querySelector('#lf-container')
  if (container) {
    container.style.backgroundColor = color
  }
  
  // 设置 LogicFlow 的 grid 背景层（如果存在）
  const gridBg = document.querySelector('.lf-grid')
  if (gridBg) {
    gridBg.style.backgroundColor = color
  }
}

function setCanvasColor(color) {
  applyCanvasColor(color)
  showCanvasColorPicker.value = false
}

function updateCanvasColorCustom(e) {
  applyCanvasColor(e.target.value)
}

// ========== 项目管理 ==========

// 加载上次的项目
function loadLastProject() {
  const lastProjectId = localStorage.getItem('flowchart-last-project')
  const projectsStr = localStorage.getItem('flowchart-projects')
  
  if (lastProjectId && projectsStr) {
    const projects = JSON.parse(projectsStr)
    const project = projects.find(p => p.id === lastProjectId)
    if (project && project.data) {
      currentProject.value = project
      lf.value?.render(project.data)
      updateGraphData()
      setTimeout(() => lf.value?.translateCenter(), 100)
      return
    }
  }
  
  // 没有上次的项目，创建新项目（静默创建，不弹窗）
  createNewProject('我的流程图', false)
}

// 创建新项目
function createNewProject(name = '', showPrompt = false) {
  if (showPrompt) {
    // 显示命名弹窗
    pendingProjectAction.value = 'create'
    showNameModal.value = true
    return
  }
  
  doCreateProject(name || '未命名作品')
}

// 实际创建项目
function doCreateProject(projectName) {
  const newProject = {
    id: Date.now().toString(),
    name: projectName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: { nodes: [], edges: [] }
  }
  
  // 保存到项目列表
  const projectsStr = localStorage.getItem('flowchart-projects')
  const projects = projectsStr ? JSON.parse(projectsStr) : []
  projects.unshift(newProject)
  localStorage.setItem('flowchart-projects', JSON.stringify(projects))
  
  // 设置为当前项目
  currentProject.value = newProject
  localStorage.setItem('flowchart-last-project', newProject.id)
  
  // 清空画布
  lf.value?.clearData()
  selectedElement.value = null
  updateGraphData()
  saveStatus.value = '已保存'
  
  // 刷新项目管理器
  projectManagerRef.value?.loadProjects()
  showProjectManager.value = false
}

// 弹窗确认回调
function handleNameConfirm(name) {
  if (pendingProjectAction.value === 'create') {
    doCreateProject(name)
  }
  pendingProjectAction.value = null
}

// 选择项目
function selectProject(project) {
  if (!project) return
  
  // 先保存当前项目
  saveCurrentProject()
  
  // 加载选中的项目
  currentProject.value = project
  localStorage.setItem('flowchart-last-project', project.id)
  
  if (project.data) {
    lf.value?.render(project.data)
  } else {
    lf.value?.clearData()
  }
  
  selectedElement.value = null
  updateGraphData()
  saveStatus.value = '已保存'
  showProjectManager.value = false
  
  setTimeout(() => lf.value?.translateCenter(), 100)
}

// 删除项目
function deleteProject(projectId) {
  const projectsStr = localStorage.getItem('flowchart-projects')
  if (!projectsStr) return
  
  let projects = JSON.parse(projectsStr)
  projects = projects.filter(p => p.id !== projectId)
  localStorage.setItem('flowchart-projects', JSON.stringify(projects))
  
  // 如果删除的是当前项目，切换到其他项目或创建新项目
  if (currentProject.value?.id === projectId) {
    if (projects.length > 0) {
      selectProject(projects[0])
    } else {
      createNewProject('未命名作品', false)
    }
  }
  
  projectManagerRef.value?.loadProjects()
}

// 保存当前项目
function saveCurrentProject() {
  if (!currentProject.value || !lf.value) return
  
  const data = lf.value.getGraphData()
  currentProject.value.data = data
  currentProject.value.updatedAt = Date.now()
  
  // 更新项目列表
  const projectsStr = localStorage.getItem('flowchart-projects')
  if (projectsStr) {
    const projects = JSON.parse(projectsStr)
    const index = projects.findIndex(p => p.id === currentProject.value.id)
    if (index >= 0) {
      projects[index] = currentProject.value
      localStorage.setItem('flowchart-projects', JSON.stringify(projects))
    }
  }
  
  saveStatus.value = '已保存'
}

// 启动自动保存
function startAutoSave() {
  // 每 5 秒自动保存一次
  autoSaveTimer.value = setInterval(() => {
    if (saveStatus.value === '未保存') {
      saveCurrentProject()
    }
  }, 5000)
}

// 手动保存（替换原来的 saveToLocal）
function saveToLocal() {
  saveCurrentProject()
  // 显示保存提示
  const originalStatus = saveStatus.value
  saveStatus.value = '保存成功!'
  setTimeout(() => {
    saveStatus.value = originalStatus === '未保存' ? '已保存' : originalStatus
  }, 1500)
}

// 加载（打开项目管理器）
function loadFromLocal() {
  showProjectManager.value = true
}


</script>

<template>
  <div class="app-container">
    <Toolbar 
      @undo="undo" @redo="redo"
      @zoom-in="zoomIn" @zoom-out="zoomOut" @reset-zoom="resetZoom"
      @delete="deleteSelected" @select-all="selectAll"
      @new-file="() => createNewProject('', true)" @save="saveToLocal" @load="loadFromLocal"
      @export-image="exportImage" @export-json="exportJSON" @import-json="importJSON"
    />

    <main class="main-content">
      <NodePanel />

      <section class="canvas-area">
        <div id="lf-container"></div>
      </section>

      <PropertyPanel :element="selectedElement" />
    </main>

    <!-- 底部状态栏 -->
    <footer class="status-bar">
      <div class="status-left">
        <!-- 项目信息 -->
        <div class="project-info" @click="showProjectManager = true">
          <span class="project-icon">📁</span>
          <span class="project-name">{{ currentProject?.name || '未命名' }}</span>
          <span class="project-arrow">›</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">⬡</span>
          <span class="stat-value">{{ graphData.nodes?.length || 0 }}</span>
          <span class="stat-label">节点</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">↗️</span>
          <span class="stat-value">{{ graphData.edges?.length || 0 }}</span>
          <span class="stat-label">连线</span>
        </div>
      </div>
      <div class="status-center">
        <span v-if="selectedElement" class="selected-info">
          ✅ 已选中: {{ selectedElement.type }} 
          <code>{{ selectedElement.id }}</code>
        </span>
        <span v-else class="hint-text">
          💡 拖拽添加节点 · 双击编辑文本 · 从边缘拖出连线
        </span>
      </div>
      <div class="status-right">
        <!-- 画布颜色设置 -->
        <div class="canvas-color-picker">
          <button class="color-trigger" @click="showCanvasColorPicker = !showCanvasColorPicker">
            <span class="color-preview" :style="{ background: canvasColor }"></span>
            <span>画布</span>
          </button>
          <div v-if="showCanvasColorPicker" class="color-dropdown">
            <div class="dropdown-header">画布背景色</div>
            <div class="color-presets">
              <div
                v-for="preset in canvasColorPresets"
                :key="preset.color"
                class="preset-item"
                :class="{ active: canvasColor === preset.color }"
                @click="setCanvasColor(preset.color)"
              >
                <span class="preset-color" :style="{ background: preset.color }"></span>
                <span class="preset-name">{{ preset.name }}</span>
              </div>
            </div>
            <div class="custom-color">
              <span>自定义</span>
              <input 
                type="color" 
                :value="canvasColor" 
                @input="updateCanvasColorCustom"
                class="custom-input"
              />
            </div>
          </div>
        </div>
        <span class="save-status" :class="{ unsaved: saveStatus === '未保存' }">
          {{ saveStatus }}
        </span>
        <span class="version">v1.0.0</span>
      </div>
    </footer>

    <!-- 项目管理器 -->
    <ProjectManager
      ref="projectManagerRef"
      :visible="showProjectManager"
      :current-id="currentProject?.id"
      @close="showProjectManager = false"
      @select="selectProject"
      @create="createNewProject('', true)"
      @delete="deleteProject"
    />

    <!-- 命名弹窗 -->
    <InputModal
      v-model:visible="showNameModal"
      title="新建作品"
      placeholder="请输入作品名称..."
      initial-value="未命名作品"
      confirm-text="创建"
      @confirm="handleNameConfirm"
    />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; overflow: hidden; }
body { 
  font-family: 'Inter', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #0f0f23;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  position: relative;
  background: #e8eaed;  /* 护眼灰 */
  margin: 12px;
  border-radius: 16px;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 20px 50px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

#lf-container {
  width: 100%;
  height: 100%;
  background: #f0f2f5;  /* 与 LogicFlow 背景保持一致 */
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

.stat-icon {
  font-size: 12px;
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.status-center {
  flex: 1;
  text-align: center;
}

.selected-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.selected-info code {
  background: rgba(102, 126, 234, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #667eea;
  margin-left: 4px;
}

.hint-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.version {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

/* 项目信息 */
.project-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-info:hover {
  background: rgba(102, 126, 234, 0.25);
  border-color: rgba(102, 126, 234, 0.5);
}

.project-icon {
  font-size: 14px;
}

.project-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-arrow {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* 画布颜色选择器 */
.canvas-color-picker {
  position: relative;
}

.color-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.color-trigger:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.color-preview {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.color-dropdown {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  width: 180px;
  background: linear-gradient(180deg, #1e1e3f 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 1000;
}

.dropdown-header {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.color-presets {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.preset-item.active {
  background: rgba(102, 126, 234, 0.2);
}

.preset-color {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.preset-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.custom-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.custom-input {
  width: 32px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.custom-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.custom-input::-webkit-color-swatch {
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

/* 保存状态 */
.save-status {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
}

.save-status.unsaved {
  background: rgba(250, 173, 20, 0.15);
  color: #faad14;
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 小地图 - 移动到右下角并缩小 */
.lf-mini-map {
  position: fixed !important;
  right: 280px !important;
  bottom: 60px !important;
  left: auto !important;
  top: auto !important;
  width: 150px !important;
  height: 100px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  z-index: 100;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.lf-mini-map * {
  max-width: 100% !important;
  max-height: 100% !important;
}
</style>
