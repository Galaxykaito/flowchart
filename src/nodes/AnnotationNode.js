// 注释节点 - 可折叠的注释气泡
import { HtmlNode, HtmlNodeModel } from '@logicflow/core'

class AnnotationNodeView extends HtmlNode {
  setHtml(rootEl) {
    const { properties } = this.props.model
    const { width } = this.props.model
    const annotations = properties.annotations || []
    const isCollapsed = properties.isCollapsed ?? false
    
    const el = document.createElement('div')
    el.className = 'annotation-node'
    el.style.width = `${width}px`
    
    if (isCollapsed) {
      // 折叠状态 - 只显示图标和数量
      el.innerHTML = `
        <div class="annotation-collapsed">
          <span class="annotation-badge">${annotations.length}</span>
          <span class="annotation-icon">📝</span>
        </div>
      `
    } else {
      // 展开状态 - 显示所有注释
      const annotationItems = annotations.map((note, index) => `
        <div class="annotation-item" data-index="${index}">
          <div class="annotation-header">
            <span class="annotation-index">#${index + 1}</span>
            <span class="annotation-time">${note.time || ''}</span>
          </div>
          <div class="annotation-content">${note.content || ''}</div>
        </div>
      `).join('')
      
      el.innerHTML = `
        <div class="annotation-expanded">
          <div class="annotation-title">
            <span>📝 注释 (${annotations.length})</span>
            <button class="add-annotation-btn">+</button>
          </div>
          <div class="annotation-list">
            ${annotationItems || '<div class="no-annotations">暂无注释，点击 + 添加</div>'}
          </div>
        </div>
      `
    }
    
    rootEl.innerHTML = ''
    rootEl.appendChild(el)
    
    // 绑定事件
    this.bindEvents(el)
  }
  
  bindEvents(el) {
    const model = this.props.model
    
    // 点击折叠/展开
    const collapsed = el.querySelector('.annotation-collapsed')
    if (collapsed) {
      collapsed.addEventListener('click', () => {
        model.setProperties({ isCollapsed: false })
      })
    }
    
    const title = el.querySelector('.annotation-title')
    if (title) {
      title.addEventListener('click', (e) => {
        if (!e.target.classList.contains('add-annotation-btn')) {
          model.setProperties({ isCollapsed: true })
        }
      })
    }
    
    // 添加注释
    const addBtn = el.querySelector('.add-annotation-btn')
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const content = prompt('请输入注释内容:')
        if (content) {
          const annotations = model.properties.annotations || []
          annotations.push({
            content,
            time: new Date().toLocaleString('zh-CN', { 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          })
          model.setProperties({ annotations })
        }
      })
    }
    
    // 双击编辑注释
    const items = el.querySelectorAll('.annotation-item')
    items.forEach(item => {
      item.addEventListener('dblclick', () => {
        const index = parseInt(item.dataset.index)
        const annotations = [...(model.properties.annotations || [])]
        const newContent = prompt('编辑注释:', annotations[index]?.content)
        if (newContent !== null) {
          if (newContent === '') {
            // 删除注释
            annotations.splice(index, 1)
          } else {
            annotations[index].content = newContent
            annotations[index].time = new Date().toLocaleString('zh-CN', { 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }
          model.setProperties({ annotations })
        }
      })
    })
  }
}

class AnnotationNodeModel extends HtmlNodeModel {
  initNodeData(data) {
    super.initNodeData(data)
    this.width = data.properties?.width || 200
    this.height = data.properties?.height || (this.properties.isCollapsed ? 40 : Math.max(80, 60 + (this.properties.annotations?.length || 0) * 60))
    // 允许调整大小
    this.resizable = true
  }
  
  getResizeLimit() {
    return {
      minWidth: 150,
      minHeight: 40,
      maxWidth: 400,
      maxHeight: 500,
    }
  }
  
  setProperties(properties) {
    super.setProperties(properties)
    // 根据折叠状态和注释数量动态调整高度
    if (properties.isCollapsed !== undefined || properties.annotations !== undefined) {
      const isCollapsed = properties.isCollapsed ?? this.properties.isCollapsed
      const annotations = properties.annotations ?? this.properties.annotations ?? []
      this.height = isCollapsed ? 40 : Math.max(100, 70 + annotations.length * 65)
    }
  }
  
  getDefaultAnchor() {
    const { x, y, width, height } = this
    return [
      { x: x - width / 2, y, id: `${this.id}_left` },
    ]
  }
}

export function registerAnnotationNode(lf) {
  lf.register({
    type: 'annotation-node',
    view: AnnotationNodeView,
    model: AnnotationNodeModel,
  })
}

// 添加样式
const style = document.createElement('style')
style.textContent = `
  .annotation-node {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .annotation-collapsed {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    border-radius: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(252, 182, 159, 0.4);
    transition: all 0.3s;
  }
  
  .annotation-collapsed:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(252, 182, 159, 0.5);
  }
  
  .annotation-badge {
    background: #ff6b6b;
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    min-width: 20px;
    text-align: center;
  }
  
  .annotation-icon {
    font-size: 16px;
  }
  
  .annotation-expanded {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    border: 1px solid #eee;
  }
  
  .annotation-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    font-size: 13px;
    font-weight: 600;
    color: #333;
    cursor: pointer;
  }
  
  .add-annotation-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .add-annotation-btn:hover {
    background: white;
    transform: scale(1.1);
  }
  
  .annotation-list {
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
  }
  
  .annotation-item {
    padding: 10px;
    margin-bottom: 6px;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid #667eea;
  }
  
  .annotation-item:hover {
    background: #eef1ff;
  }
  
  .annotation-item:last-child {
    margin-bottom: 0;
  }
  
  .annotation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  
  .annotation-index {
    font-size: 10px;
    font-weight: 600;
    color: #667eea;
  }
  
  .annotation-time {
    font-size: 10px;
    color: #999;
  }
  
  .annotation-content {
    font-size: 12px;
    color: #333;
    line-height: 1.5;
    word-break: break-all;
  }
  
  .no-annotations {
    text-align: center;
    padding: 16px;
    color: #999;
    font-size: 12px;
  }
`
document.head.appendChild(style)
