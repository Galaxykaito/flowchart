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

// 工作区管理（新架构）
const workspaceHandle = ref(null)  // 工作区文件夹句柄
const workspaceName = ref(localStorage.getItem('workspace-name') || '')
const isFileSystemSupported = ref('showDirectoryPicker' in window)

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

// 注释 tooltip
const annotationTooltip = ref({
  visible: false,
  content: '',
  x: 0,
  y: 0
})

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

    // 启动自动保存
    startAutoSave()
    
    // 尝试恢复工作区（必须在加载项目之前）
    await restoreWorkspace()
    
    // 加载上次的项目或初始数据（工作区恢复后执行）
    await loadLastProject()
    
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
  
  // 鼠标悬停显示注释
  lf.value.on('node:mouseenter', ({ data, e }) => {
    const annotations = data.properties?.annotations
    if (annotations && annotations.length > 0) {
      // 显示所有注释，用换行分隔
      const content = annotations.map((note, index) => 
        `#${index + 1} ${note.content}`
      ).join('\n')
      
      annotationTooltip.value = {
        visible: true,
        content: content,
        x: e.clientX + 10,
        y: e.clientY + 10
      }
    }
  })
  
  lf.value.on('node:mouseleave', () => {
    annotationTooltip.value.visible = false
  })
}

// 更新 tooltip 位置（相对于节点）
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
  input.onchange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result)
        
        // 检查是否是完整项目数据（包含 id, name 等）
        if (importedData.id && importedData.name && importedData.data) {
          // 导入完整项目
          await importFullProject(importedData, file.name)
        } else {
          // 只是流程图数据，渲染到当前项目
          lf.value?.render(importedData)
          updateGraphData()
          
          // 如果有工作区，提示保存
          if (workspaceHandle.value && currentProject.value) {
            await saveCurrentProject()
          }
          
          alert('导入成功！')
        }
      } catch (e) {
        console.error('导入失败:', e)
        alert('导入失败：' + e.message)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

// 导入完整项目
async function importFullProject(projectData, fileName = '') {
  // 从文件名提取项目名（去掉 .json 后缀）
  let projectName = projectData.name || '未命名项目'
  
  if (fileName && !projectData.name) {
    // 如果项目没有名称，从文件名提取
    projectName = fileName.replace(/\.json$/i, '')
  }
  
  // 生成新 ID 避免冲突
  const newProject = {
    ...projectData,
    id: Date.now().toString(),
    name: projectName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  
  // 检查是否有图片节点
  const hasImageNodes = newProject.data?.nodes?.some(node => 
    node.type === 'image-node' && node.properties?.isLocalFile
  )
  
  if (hasImageNodes && workspaceHandle.value) {
    // 提示用户关于图片的问题
    alert(
      '⚠️ 检测到该项目包含图片节点\n\n' +
      '导入后图片将显示为缺失状态。\n\n' +
      '解决方法：\n' +
      '1. 导入项目后，在图片节点上双击重新上传图片\n' +
      '2. 或手动将图片复制到项目的 images 文件夹中'
    )
  }
  
  // 创建项目（不自动导入图片）
  await createProjectInWorkspace(newProject)
}

// 在工作区创建项目（不含图片）
async function createProjectInWorkspace(newProject) {
  if (workspaceHandle.value) {
    try {
      const folderName = `${newProject.name}_${newProject.id}`
      const projectFolder = await workspaceHandle.value.getDirectoryHandle(folderName, { create: true })
      
      // 创建 images 子文件夹
      await projectFolder.getDirectoryHandle('images', { create: true })
      
      // 保存 flow.json
      const flowFile = await projectFolder.getFileHandle('flow.json', { create: true })
      const writable = await flowFile.createWritable()
      await writable.write(JSON.stringify(newProject, null, 2))
      await writable.close()
      
      newProject.folderName = folderName
      newProject.projectFolder = projectFolder
      
      console.log(`导入项目已创建文件夹: ${folderName}`)
    } catch (err) {
      console.error('创建项目文件夹失败:', err)
    }
  }
  
  await finishProjectImport(newProject)
}

// 完成项目导入（公共部分）
async function finishProjectImport(newProject) {
  // 添加到项目列表
  try {
    const projectsStr = localStorage.getItem('flowchart-projects')
    const projects = projectsStr ? JSON.parse(projectsStr) : []
    
    const saveData = workspaceHandle.value 
      ? {
          id: newProject.id,
          name: newProject.name,
          folderName: newProject.folderName,
          createdAt: newProject.createdAt,
          updatedAt: newProject.updatedAt,
          nodeCount: newProject.data?.nodes?.length || 0,
          edgeCount: newProject.data?.edges?.length || 0,
        }
      : newProject
    
    projects.unshift(saveData)
    localStorage.setItem('flowchart-projects', JSON.stringify(projects))
  } catch (err) {
    console.warn('保存到 localStorage 失败:', err)
  }
  
  // 加载项目
  currentProject.value = newProject
  localStorage.setItem('flowchart-last-project', newProject.id)
  
  if (newProject.projectFolder) {
    window.__flowchartCurrentProjectFolder = newProject.projectFolder
  }
  
  if (newProject.data && lf.value) {
    lf.value.render(newProject.data)
    updateGraphData()
  }
  
  // 刷新项目管理器
  projectManagerRef.value?.loadProjects()
  
  if (!newProject.folderName) {
    alert(`项目 "${newProject.name}" 导入成功！`)
  }
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
async function loadLastProject() {
  const lastProjectId = localStorage.getItem('flowchart-last-project')
  const projectsStr = localStorage.getItem('flowchart-projects')
  
  if (lastProjectId && projectsStr) {
    const projects = JSON.parse(projectsStr)
    const projectMeta = projects.find(p => p.id === lastProjectId)
    
    if (projectMeta) {
      // 检查是否是工作区项目（有 folderName）
      if (projectMeta.folderName && workspaceHandle.value) {
        // 从工作区加载完整数据
        await loadProjectById(lastProjectId, null)
        return
      } else if (projectMeta.data) {
        // 旧版本，直接从 localStorage 加载
        currentProject.value = projectMeta
        lf.value?.render(projectMeta.data)
        updateGraphData()
        setTimeout(() => lf.value?.translateCenter(), 100)
        return
      }
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
async function doCreateProject(projectName) {
  const newProject = {
    id: Date.now().toString(),
    name: projectName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: { nodes: [], edges: [] }
  }
  
  // 如果有工作区，创建项目文件夹
  if (workspaceHandle.value) {
    try {
      // 创建项目文件夹
      const folderName = `${projectName}_${newProject.id}`
      const projectFolder = await workspaceHandle.value.getDirectoryHandle(folderName, { create: true })
      
      // 创建 images 子文件夹
      await projectFolder.getDirectoryHandle('images', { create: true })
      
      // 保存 flow.json
      const flowFile = await projectFolder.getFileHandle('flow.json', { create: true })
      const writable = await flowFile.createWritable()
      await writable.write(JSON.stringify(newProject, null, 2))
      await writable.close()
      
      newProject.folderName = folderName
      newProject.projectFolder = projectFolder  // 保存句柄引用（不会序列化）
      
      console.log(`项目文件夹已创建: ${folderName}`)
    } catch (err) {
      console.error('创建项目文件夹失败:', err)
      alert('创建项目文件夹失败，将仅保存在浏览器中')
    }
  }
  
  // 保存到项目列表（localStorage 作为缓存）
  try {
    const projectsStr = localStorage.getItem('flowchart-projects')
    const projects = projectsStr ? JSON.parse(projectsStr) : []
    
    // 如果有工作区，只存元信息
    const saveData = workspaceHandle.value 
      ? {
          id: newProject.id,
          name: newProject.name,
          folderName: newProject.folderName,
          createdAt: newProject.createdAt,
          updatedAt: newProject.updatedAt
        }
      : newProject  // 无工作区时存完整数据
    
    projects.unshift(saveData)
    localStorage.setItem('flowchart-projects', JSON.stringify(projects))
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn('localStorage 已满')
      // 不影响工作区模式
    }
  }
  
  // 设置为当前项目
  currentProject.value = newProject
  localStorage.setItem('flowchart-last-project', newProject.id)
  
  // 设置图片节点的当前项目文件夹
  if (newProject.projectFolder) {
    window.__flowchartCurrentProjectFolder = newProject.projectFolder
  }
  
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
async function selectProject(project) {
  if (!project) return
  
  // 先保存当前项目
  if (currentProject.value) {
    await saveCurrentProject()
  }
  
  // 如果是工作区项目（有 folderName），从文件系统加载
  if (project.folderName && workspaceHandle.value) {
    await loadProjectById(project.id, null)
    showProjectManager.value = false
    return
  }
  
  // 加载选中的项目（localStorage 模式）
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
async function deleteProject(projectId) {
  const projectsStr = localStorage.getItem('flowchart-projects')
  if (!projectsStr) return
  
  let projects = JSON.parse(projectsStr)
  const targetProject = projects.find(p => p.id === projectId)
  
  // 如果是工作区项目，删除文件夹
  if (targetProject?.folderName && workspaceHandle.value) {
    try {
      await workspaceHandle.value.removeEntry(targetProject.folderName, { recursive: true })
      console.log(`已删除项目文件夹: ${targetProject.folderName}`)
    } catch (err) {
      console.error('删除项目文件夹失败:', err)
      alert('删除项目文件夹失败，但已从列表中移除')
    }
  }
  
  // 从列表中移除
  projects = projects.filter(p => p.id !== projectId)
  localStorage.setItem('flowchart-projects', JSON.stringify(projects))
  
  // 如果删除的是当前项目，切换到其他项目或创建新项目
  if (currentProject.value?.id === projectId) {
    // 先清空当前项目，避免自动保存到已删除的文件夹
    currentProject.value = null
    
    if (projects.length > 0) {
      await selectProject(projects[0])
    } else {
      createNewProject('未命名作品', false)
    }
  }
  
  projectManagerRef.value?.loadProjects()
}

// 保存当前项目
async function saveCurrentProject() {
  if (!currentProject.value || !lf.value) return
  
  const data = lf.value.getGraphData()
  currentProject.value.data = data
  currentProject.value.updatedAt = Date.now()
  
  // 保存到工作区（优先）
  if (workspaceHandle.value && currentProject.value.folderName) {
    try {
      await saveProjectToWorkspace()
      saveStatus.value = '已保存'
      
      // 工作区保存成功，只缓存项目元信息到 localStorage
      saveLightweightCache()
      return
    } catch (err) {
      console.error('保存到工作区失败:', err)
    }
  }
  
  // 没有工作区或保存失败，尝试保存到 localStorage（可能失败）
  try {
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
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn('localStorage 已满，建议设置工作区')
      alert('浏览器存储空间不足！\n\n建议点击"设置工作区"将项目保存到本地文件夹。')
      saveStatus.value = '存储已满'
    } else {
      console.error('保存失败:', err)
      saveStatus.value = '保存失败'
    }
  }
}

// 保存轻量级缓存（只存元信息，不存完整数据）
function saveLightweightCache() {
  try {
    const projectsStr = localStorage.getItem('flowchart-projects')
    const projects = projectsStr ? JSON.parse(projectsStr) : []
    
    // 只保存项目元信息
    const lightProject = {
      id: currentProject.value.id,
      name: currentProject.value.name,
      folderName: currentProject.value.folderName,
      createdAt: currentProject.value.createdAt,
      updatedAt: currentProject.value.updatedAt,
      // 添加统计信息（供项目卡片显示）
      nodeCount: currentProject.value.data?.nodes?.length || 0,
      edgeCount: currentProject.value.data?.edges?.length || 0,
    }
    
    const index = projects.findIndex(p => p.id === currentProject.value.id)
    if (index >= 0) {
      projects[index] = lightProject
    } else {
      projects.unshift(lightProject)
    }
    
    localStorage.setItem('flowchart-projects', JSON.stringify(projects))
  } catch (err) {
    console.warn('缓存元信息失败:', err)
    // 不影响主流程
  }
}

// 保存项目到工作区
async function saveProjectToWorkspace() {
  if (!workspaceHandle.value || !currentProject.value.folderName) return
  
  try {
    // 获取项目文件夹
    const projectFolder = await workspaceHandle.value.getDirectoryHandle(currentProject.value.folderName)
    
    // 保存 flow.json
    const flowFile = await projectFolder.getFileHandle('flow.json', { create: true })
    const writable = await flowFile.createWritable()
    
    // 准备保存的数据（移除不可序列化的属性）
    const { projectFolder: _, ...saveData } = currentProject.value
    await writable.write(JSON.stringify(saveData, null, 2))
    await writable.close()
    
    console.log(`项目已保存: ${currentProject.value.folderName}/flow.json`)
  } catch (err) {
    console.error('保存项目到工作区失败:', err)
    throw err
  }
}

// ==================== 工作区管理（新架构）====================

// 同步项目列表（只更新 localStorage，不加载项目）
async function syncProjectListFromWorkspace() {
  if (!workspaceHandle.value) return
  
  try {
    const projects = []
    
    // 遍历工作区内的所有子文件夹
    for await (const entry of workspaceHandle.value.values()) {
      if (entry.kind === 'directory') {
        try {
          // 尝试读取 flow.json
          const projectHandle = await workspaceHandle.value.getDirectoryHandle(entry.name)
          const flowFile = await projectHandle.getFileHandle('flow.json')
          const file = await flowFile.getFile()
          const content = await file.text()
          const projectData = JSON.parse(content)
          
          // 只保存元信息
          projects.push({
            id: projectData.id,
            name: projectData.name,
            folderName: entry.name,
            createdAt: projectData.createdAt,
            updatedAt: projectData.updatedAt,
            nodeCount: projectData.data?.nodes?.length || 0,
            edgeCount: projectData.data?.edges?.length || 0,
          })
        } catch (err) {
          // 没有 flow.json 的文件夹跳过
          console.log(`跳过文件夹: ${entry.name}`)
        }
      }
    }
    
    if (projects.length > 0) {
      // 替换 localStorage（只保留工作区项目）
      localStorage.setItem('flowchart-projects', JSON.stringify(projects))
      console.log(`已同步 ${projects.length} 个项目`)
    } else {
      // 工作区没有项目，清空列表
      localStorage.setItem('flowchart-projects', JSON.stringify([]))
    }
  } catch (err) {
    console.error('同步项目列表失败:', err)
  }
}

// 恢复工作区（启动时调用）
async function restoreWorkspace() {
  const savedName = localStorage.getItem('workspace-name')
  if (!savedName || !isFileSystemSupported.value) return
  
  try {
    // 使用 IndexedDB 存储的句柄
    const db = await openWorkspaceDB()
    const handle = await getStoredWorkspaceHandle(db)
    
    if (handle) {
      // 检查权限（不自动请求）
      const permission = await handle.queryPermission({ mode: 'readwrite' })
      
      if (permission === 'granted') {
        // 权限已授予，直接使用
        workspaceHandle.value = handle
        workspaceName.value = handle.name
        window.__flowchartWorkspace = handle
        
        console.log(`工作区已恢复: ${handle.name}`)
        
        // 更新 localStorage 中的项目列表（但不加载项目）
        await syncProjectListFromWorkspace()
        
        // 刷新项目管理器显示
        if (projectManagerRef.value) {
          projectManagerRef.value.loadProjects()
        }
      } else {
        // 权限未授予，提示用户
        console.log('工作区权限已过期，请重新授权')
        
        // 显示提示（不自动请求，避免 SecurityError）
        setTimeout(() => {
          const reauth = confirm(
            `上次的工作区 "${savedName}" 需要重新授权。\n\n` +
            '是否现在重新授权？\n（或点击状态栏的"设置工作区"按钮）'
          )
          
          if (reauth) {
            // 用户点击确定，请求权限
            handle.requestPermission({ mode: 'readwrite' }).then(newPermission => {
              if (newPermission === 'granted') {
                workspaceHandle.value = handle
                workspaceName.value = handle.name
                window.__flowchartWorkspace = handle
                
                console.log('工作区权限已重新授予')
                syncProjectListFromWorkspace()
              } else {
                clearWorkspace()
              }
            }).catch(err => {
              console.error('请求权限失败:', err)
              clearWorkspace()
            })
          } else {
            clearWorkspace()
          }
        }, 1000)  // 延迟显示，避免页面加载时弹窗
      }
    }
  } catch (err) {
    console.error('恢复工作区失败:', err)
    // 失败时不影响正常使用
  }
}

// 打开 IndexedDB
function openWorkspaceDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FlowchartWorkspace', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles')
      }
    }
  })
}

// 获取存储的工作区句柄
function getStoredWorkspaceHandle(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['handles'], 'readonly')
    const store = transaction.objectStore('handles')
    const request = store.get('workspace')
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// 存储工作区句柄
async function storeWorkspaceHandle(handle) {
  try {
    const db = await openWorkspaceDB()
    const transaction = db.transaction(['handles'], 'readwrite')
    const store = transaction.objectStore('handles')
    
    await new Promise((resolve, reject) => {
      const request = store.put(handle, 'workspace')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    console.log('工作区句柄已存储')
  } catch (err) {
    console.error('存储工作区句柄失败:', err)
  }
}

// 选择工作区文件夹
async function selectWorkspace() {
  if (!isFileSystemSupported.value) {
    alert('您的浏览器不支持文件系统访问 API，建议使用 Chrome/Edge 浏览器')
    return
  }
  
  try {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    })
    
    workspaceHandle.value = dirHandle
    workspaceName.value = dirHandle.name
    localStorage.setItem('workspace-name', dirHandle.name)
    
    // 设置全局访问（供图片节点使用）
    window.__flowchartWorkspace = dirHandle
    
    // 存储句柄到 IndexedDB（持久化）
    await storeWorkspaceHandle(dirHandle)
    
    alert(`工作区已设置: ${dirHandle.name}\n\n所有项目将保存在此文件夹下\n下次启动会自动恢复`)
    
    // 加载工作区内的所有项目
    await loadProjectsFromWorkspace()
    
    // 如果没有项目，引导创建
    if (!currentProject.value) {
      const createNew = confirm('工作区内没有项目，是否创建第一个项目？')
      if (createNew) {
        createNewProject('', true)
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('选择工作区失败:', err)
    }
  }
}

// 从工作区加载所有项目
async function loadProjectsFromWorkspace() {
  if (!workspaceHandle.value) return
  
  try {
    const projects = []
    
    // 遍历工作区内的所有子文件夹
    for await (const entry of workspaceHandle.value.values()) {
      if (entry.kind === 'directory') {
        try {
          // 尝试读取 flow.json
          const projectHandle = await workspaceHandle.value.getDirectoryHandle(entry.name)
          const flowFile = await projectHandle.getFileHandle('flow.json')
          const file = await flowFile.getFile()
          const content = await file.text()
          const projectData = JSON.parse(content)
          
          // 添加项目
          projects.push({
            ...projectData,
            folderName: entry.name,  // 记录文件夹名
            projectFolder: projectHandle  // 保存句柄引用
          })
        } catch (err) {
          // 没有 flow.json 的文件夹跳过
          console.log(`跳过文件夹: ${entry.name}`)
        }
      }
    }
    
    if (projects.length > 0) {
      // 更新 localStorage（兼容旧版项目管理器）
      const lightProjects = projects.map(p => ({
        id: p.id,
        name: p.name,
        folderName: p.folderName,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
      localStorage.setItem('flowchart-projects', JSON.stringify(lightProjects))
      
      // 加载第一个项目
      await loadProjectById(projects[0].id, projects[0])
      
      // 刷新项目管理器
      if (projectManagerRef.value) {
        projectManagerRef.value.loadProjects()
      }
      
      console.log(`已从工作区加载 ${projects.length} 个项目`)
    }
  } catch (err) {
    console.error('从工作区加载项目失败:', err)
  }
}

// 加载指定项目
async function loadProjectById(projectId, projectData = null) {
  try {
    let project = projectData
    
    // 如果没有提供数据，从工作区读取
    if (!project && workspaceHandle.value) {
      const projectsStr = localStorage.getItem('flowchart-projects')
      if (projectsStr) {
        const projects = JSON.parse(projectsStr)
        const projectMeta = projects.find(p => p.id === projectId)
        
        if (projectMeta && projectMeta.folderName) {
          // 从工作区读取
          const projectFolder = await workspaceHandle.value.getDirectoryHandle(projectMeta.folderName)
          const flowFile = await projectFolder.getFileHandle('flow.json')
          const file = await flowFile.getFile()
          const content = await file.text()
          project = {
            ...JSON.parse(content),
            folderName: projectMeta.folderName,
            projectFolder: projectFolder
          }
        }
      }
    }
    
    if (!project) {
      console.error('项目不存在:', projectId)
      return
    }
    
    // 设置为当前项目
    currentProject.value = project
    localStorage.setItem('flowchart-last-project', project.id)
    
    // 设置图片节点的当前项目文件夹
    if (project.projectFolder) {
      window.__flowchartCurrentProjectFolder = project.projectFolder
    }
    
    // 渲染数据
    if (project.data && lf.value) {
      lf.value.render(project.data)
      updateGraphData()
    }
    
    console.log(`已加载项目: ${project.name}`)
  } catch (err) {
    console.error('加载项目失败:', err)
  }
}

// 清除工作区关联
async function clearWorkspace() {
  workspaceHandle.value = null
  workspaceName.value = ''
  localStorage.removeItem('workspace-name')
  window.__flowchartWorkspace = null
  
  // 清除 IndexedDB 中的句柄
  try {
    const db = await openWorkspaceDB()
    const transaction = db.transaction(['handles'], 'readwrite')
    const store = transaction.objectStore('handles')
    store.delete('workspace')
  } catch (err) {
    console.error('清除存储的句柄失败:', err)
  }
  
  alert('已清除工作区，项目将仅保存在浏览器中')
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

    <!-- 注释 tooltip -->
    <Teleport to="body">
      <div 
        v-if="annotationTooltip.visible" 
        class="annotation-tooltip"
        :style="{
          left: annotationTooltip.x + 'px',
          top: annotationTooltip.y + 'px'
        }"
      >
        {{ annotationTooltip.content }}
      </div>
    </Teleport>

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
        <!-- 工作区 -->
        <div class="folder-manager">
          <button 
            v-if="!workspaceHandle" 
            class="folder-btn" 
            @click="selectWorkspace"
            :title="isFileSystemSupported ? '设置工作区文件夹' : '您的浏览器不支持此功能'"
            :disabled="!isFileSystemSupported"
          >
            <span>📂</span>
            <span>设置工作区</span>
          </button>
          <div v-else class="folder-info">
            <span class="folder-icon">📂</span>
            <span class="folder-name">{{ workspaceName || '工作区' }}</span>
            <button class="folder-clear" @click="clearWorkspace" title="清除工作区">×</button>
          </div>
        </div>
        
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

/* 本地文件夹管理 */
.folder-manager {
  margin-right: 12px;
}

.folder-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(52, 211, 153, 0.15);
  border: 1px solid rgba(52, 211, 153, 0.3);
  border-radius: 16px;
  color: rgba(52, 211, 153, 0.9);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-btn:hover:not(:disabled) {
  background: rgba(52, 211, 153, 0.25);
  border-color: rgba(52, 211, 153, 0.5);
  transform: translateY(-1px);
}

.folder-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.folder-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(52, 211, 153, 0.15);
  border: 1px solid rgba(52, 211, 153, 0.3);
  border-radius: 16px;
  font-size: 11px;
}

.folder-icon {
  font-size: 12px;
}

.folder-name {
  color: rgba(52, 211, 153, 0.9);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-sync {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(52, 211, 153, 0.2);
  border: none;
  border-radius: 50%;
  color: rgba(52, 211, 153, 0.9);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-sync:hover {
  background: rgba(52, 211, 153, 0.3);
  transform: rotate(180deg);
}

.folder-clear {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 77, 79, 0.2);
  border: none;
  border-radius: 50%;
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-clear:hover {
  background: #ff4d4f;
  color: white;
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

/* 注释 tooltip */
.annotation-tooltip {
  position: fixed;
  z-index: 10000;
  max-width: 300px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 13px;
  line-height: 1.6;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  word-wrap: break-word;
  white-space: pre-wrap;
  animation: tooltipFadeIn 0.2s ease;
}

.annotation-tooltip::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 10px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #667eea;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
