<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['select', 'create', 'delete', 'close'])

const props = defineProps({
  visible: Boolean,
  currentId: String
})

const projects = ref([])

onMounted(() => {
  loadProjects()
})

function loadProjects() {
  const saved = localStorage.getItem('flowchart-projects')
  if (saved) {
    const allProjects = JSON.parse(saved)
    
    // 检查是否有工作区
    const workspaceName = localStorage.getItem('workspace-name')
    
    if (workspaceName) {
      // 工作区模式：只显示有 folderName 的项目
      projects.value = allProjects.filter(p => p.folderName)
    } else {
      // localStorage 模式：只显示有 data 的项目（没有 folderName）
      projects.value = allProjects.filter(p => !p.folderName)
    }
  }
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function selectProject(project) {
  emit('select', project)
}

function createNew() {
  emit('create')
}

function deleteProject(e, project) {
  e.stopPropagation()
  if (confirm(`确定删除作品「${project.name}」吗？此操作不可恢复。`)) {
    emit('delete', project.id)
    loadProjects()
  }
}

function getNodeCount(project) {
  // 优先使用缓存的统计信息（工作区模式）
  if (project.nodeCount !== undefined) {
    return project.nodeCount
  }
  // 降级到从 data 读取（localStorage 模式）
  return project.data?.nodes?.length || 0
}

function getEdgeCount(project) {
  // 优先使用缓存的统计信息（工作区模式）
  if (project.edgeCount !== undefined) {
    return project.edgeCount
  }
  // 降级到从 data 读取（localStorage 模式）
  return project.data?.edges?.length || 0
}

// 监听外部更新
defineExpose({ loadProjects })
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-overlay" @click.self="emit('close')">
        <div class="drawer-container">
          <div class="drawer-header">
            <div class="header-title">
              <span class="header-icon">📁</span>
              <span>我的作品</span>
            </div>
            <button class="close-btn" @click="emit('close')">×</button>
          </div>

          <div class="drawer-actions">
            <button class="create-btn" @click="createNew">
              <span>✨</span>
              <span>新建作品</span>
            </button>
          </div>

          <div class="drawer-content">
            <div v-if="projects.length === 0" class="empty-state">
              <div class="empty-icon">📭</div>
              <p>暂无作品</p>
              <p class="empty-hint">点击上方按钮创建新作品</p>
            </div>

            <div v-else class="project-list">
              <div
                v-for="project in projects"
                :key="project.id"
                class="project-card"
                :class="{ active: project.id === currentId }"
                @click="selectProject(project)"
              >
                <div class="card-header">
                  <span class="project-name">{{ project.name }}</span>
                  <span v-if="project.id === currentId" class="current-badge">当前</span>
                </div>
                
                <div class="card-meta">
                  <div class="meta-item">
                    <span class="meta-icon">⬡</span>
                    <span>{{ getNodeCount(project) }} 节点</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-icon">↗️</span>
                    <span>{{ getEdgeCount(project) }} 连线</span>
                  </div>
                </div>

                <div class="card-footer">
                  <span class="update-time">
                    <span class="time-icon">🕐</span>
                    {{ formatDate(project.updatedAt) }}
                  </span>
                  <button 
                    class="delete-btn" 
                    @click="deleteProject($event, project)"
                    title="删除作品"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            <span class="storage-info">
              💾 本地存储 · {{ projects.length }} 个作品
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9998;
  display: flex;
  justify-content: flex-start;
}

.drawer-container {
  width: 360px;
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  box-shadow: 4px 0 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.header-icon {
  font-size: 22px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.drawer-actions {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.create-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.drawer-content::-webkit-scrollbar {
  width: 6px;
}

.drawer-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0;
}

.empty-hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4) !important;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateX(4px);
}

.project-card.active {
  background: rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.project-name {
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.current-badge {
  font-size: 10px;
  padding: 3px 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: white;
}

.card-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.meta-icon {
  font-size: 11px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.update-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.time-icon {
  font-size: 12px;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s;
}

.project-card:hover .delete-btn {
  opacity: 0.6;
}

.delete-btn:hover {
  background: rgba(255, 77, 79, 0.2);
  opacity: 1;
}

.drawer-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.storage-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

/* 动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-from .drawer-container,
.drawer-leave-to .drawer-container {
  transform: translateX(-100%);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
</style>
