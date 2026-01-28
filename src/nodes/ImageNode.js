// 图片节点 - 可作为流程节点或纯装饰图片
import { HtmlNode, HtmlNodeModel } from '@logicflow/core'

class ImageNodeView extends HtmlNode {
  setHtml(rootEl) {
    const { properties } = this.props.model
    const { width, height } = this.props.model
    
    const el = document.createElement('div')
    el.className = 'image-node-container'
    el.style.width = `${width}px`
    el.style.height = `${height}px`
    
    // 如果是本地文件，从文件夹加载
    if (properties.isLocalFile && properties.imageFileName) {
      this.loadImageFromFolder(el, properties)
    } else if (properties.imageSrc) {
      // Base64 图片
      this.renderImage(el, properties)
    } else {
      // 占位符
      this.renderPlaceholder(el)
    }
    
    rootEl.innerHTML = ''
    rootEl.appendChild(el)
    
    // 点击上传图片
    if (!properties.imageSrc && !properties.imageFileName) {
      el.addEventListener('dblclick', () => {
        this.uploadImage()
      })
    }
  }
  
  // 渲染图片
  renderImage(el, properties) {
    el.innerHTML = `
      <div class="image-wrapper ${properties.isDecoration ? 'decoration' : 'node-style'}">
        <img src="${properties.imageSrc}" alt="${properties.imageAlt || '图片'}" />
        ${properties.isDecoration ? '' : `<div class="image-label">${properties.text || ''}</div>`}
      </div>
    `
  }
  
  // 渲染占位符
  renderPlaceholder(el) {
    el.innerHTML = `
      <div class="image-placeholder">
        <span class="placeholder-icon">🖼️</span>
        <span class="placeholder-text">点击上传图片</span>
      </div>
    `
  }
  
  // 从文件夹加载图片
  async loadImageFromFolder(el, properties) {
    const projectFolder = window.__flowchartCurrentProjectFolder
    
    if (!projectFolder) {
      // 项目文件夹未关联，显示提示
      el.innerHTML = `
        <div class="image-placeholder error">
          <span class="placeholder-icon">⚠️</span>
          <span class="placeholder-text">图片文件需要工作区访问权限</span>
          <span class="placeholder-hint">请设置工作区</span>
        </div>
      `
      return
    }
    
    try {
      // 获取 images 子目录
      const imagesFolder = await projectFolder.getDirectoryHandle('images')
      const fileHandle = await imagesFolder.getFileHandle(properties.imageFileName)
      const file = await fileHandle.getFile()
      
      // 读取为 Base64 用于显示
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageSrc = event.target.result
        el.innerHTML = `
          <div class="image-wrapper ${properties.isDecoration ? 'decoration' : 'node-style'}">
            <img src="${imageSrc}" alt="${properties.imageAlt || '图片'}" />
            ${properties.isDecoration ? '' : `<div class="image-label">${properties.text || ''}</div>`}
          </div>
        `
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('加载图片失败:', err)
      el.innerHTML = `
        <div class="image-placeholder error">
          <span class="placeholder-icon">❌</span>
          <span class="placeholder-text">图片加载失败</span>
          <span class="placeholder-hint">${properties.imageFileName}</span>
        </div>
      `
    }
  }
  
  uploadImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (file) {
        // 检查文件大小（超过 1MB 建议使用工作区）
        const fileSizeMB = file.size / 1024 / 1024
        
        // 获取当前项目文件夹句柄
        const projectFolder = window.__flowchartCurrentProjectFolder
        const workspace = window.__flowchartWorkspace
        
        if (fileSizeMB > 1 && !workspace) {
          const useWorkspace = confirm(
            `图片大小: ${fileSizeMB.toFixed(2)} MB\n\n` +
            '建议设置工作区文件夹存储图片，避免浏览器存储溢出。\n\n' +
            '是否现在设置工作区？（选择"取消"将使用内存存储，可能导致性能问题）'
          )
          
          if (useWorkspace) {
            alert('请在状态栏点击 "📂 设置工作区" 按钮，然后重新上传图片')
            return
          }
        }
        
        // 如果有项目文件夹，保存图片文件
        if (projectFolder) {
          try {
            await this.saveImageToProjectFolder(file, projectFolder)
          } catch (err) {
            console.error('保存图片到项目文件夹失败:', err)
            // 失败则降级到 Base64
            this.loadImageAsBase64(file)
          }
        } else {
          // 未设置工作区，使用 Base64（传统方式）
          this.loadImageAsBase64(file)
        }
      }
    }
    input.click()
  }
  
  // 保存图片到项目文件夹
  async saveImageToProjectFolder(file, projectFolder) {
    // 确保 images 子目录存在
    let imagesFolder
    try {
      imagesFolder = await projectFolder.getDirectoryHandle('images', { create: true })
    } catch (err) {
      console.error('创建 images 目录失败:', err)
      throw err
    }
    
    // 生成唯一文件名（时间戳 + 原文件名）
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`
    
    // 保存文件
    const fileHandle = await imagesFolder.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file)
    await writable.close()
    
    // 保存文件路径引用（而非 Base64）
    this.props.model.setProperties({
      imageFileName: fileName,  // 文件名
      imageAlt: file.name,
      imageSize: file.size,
      isLocalFile: true  // 标记为本地文件
    })
    
    console.log(`图片已保存到项目: images/${fileName}`)
  }
  
  // 加载图片为 Base64（降级方案）
  loadImageAsBase64(file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      const imageSrc = event.target.result
      this.props.model.setProperties({
        imageSrc,
        imageAlt: file.name,
        isLocalFile: false
      })
    }
    reader.readAsDataURL(file)
  }
}

class ImageNodeModel extends HtmlNodeModel {
  initNodeData(data) {
    super.initNodeData(data)
    this.width = data.properties?.width || 120
    this.height = data.properties?.height || 100
    // 允许调整大小
    this.resizable = true
  }
  
  // 设置最小/最大尺寸
  getResizeLimit() {
    return {
      minWidth: 60,
      minHeight: 60,
      maxWidth: 500,
      maxHeight: 400,
    }
  }
  
  getDefaultAnchor() {
    const { x, y, width, height } = this
    // 如果是装饰图片，不显示锚点
    if (this.properties.isDecoration) {
      return []
    }
    return [
      { x: x - width / 2, y, id: `${this.id}_left` },
      { x: x + width / 2, y, id: `${this.id}_right` },
      { x, y: y - height / 2, id: `${this.id}_top` },
      { x, y: y + height / 2, id: `${this.id}_bottom` },
    ]
  }
}

export function registerImageNode(lf) {
  lf.register({
    type: 'image-node',
    view: ImageNodeView,
    model: ImageNodeModel,
  })
}

// 添加样式
const style = document.createElement('style')
style.textContent = `
  .image-node-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  
  .image-wrapper.node-style {
    background: white;
    border: 2px solid #667eea;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  }
  
  .image-wrapper.decoration {
    background: transparent;
    border: none;
  }
  
  .image-wrapper img {
    max-width: 100%;
    max-height: 80%;
    object-fit: contain;
    border-radius: 4px;
  }
  
  .image-wrapper.decoration img {
    max-height: 100%;
    border-radius: 0;
  }
  
  .image-label {
    font-size: 11px;
    color: #333;
    margin-top: 4px;
    text-align: center;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
    border: 2px dashed #ccc;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .image-placeholder:hover {
    border-color: #667eea;
    background: linear-gradient(135deg, #e8ecff 0%, #dde4ff 100%);
  }
  
  .placeholder-icon {
    font-size: 24px;
    margin-bottom: 4px;
  }
  
  .placeholder-text {
    font-size: 10px;
    color: #999;
  }
  
  .placeholder-hint {
    font-size: 9px;
    color: #666;
    margin-top: 4px;
    max-width: 90%;
    word-wrap: break-word;
    text-align: center;
  }
  
  .image-placeholder.error {
    border-color: #ff4d4f;
    background: linear-gradient(135deg, #fff1f0 0%, #ffe7e7 100%);
  }
  
  .image-placeholder.error .placeholder-icon {
    color: #ff4d4f;
  }
  
  .image-placeholder.error .placeholder-text {
    color: #ff4d4f;
  }
`
document.head.appendChild(style)
