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
    
    if (properties.imageSrc) {
      el.innerHTML = `
        <div class="image-wrapper ${properties.isDecoration ? 'decoration' : 'node-style'}">
          <img src="${properties.imageSrc}" alt="${properties.imageAlt || '图片'}" />
          ${properties.isDecoration ? '' : `<div class="image-label">${properties.text || ''}</div>`}
        </div>
      `
    } else {
      el.innerHTML = `
        <div class="image-placeholder">
          <span class="placeholder-icon">🖼️</span>
          <span class="placeholder-text">点击上传图片</span>
        </div>
      `
    }
    
    rootEl.innerHTML = ''
    rootEl.appendChild(el)
    
    // 点击上传图片
    if (!properties.imageSrc) {
      el.addEventListener('dblclick', () => {
        this.uploadImage()
      })
    }
  }
  
  uploadImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const imageSrc = event.target.result
          this.props.model.setProperties({
            imageSrc,
            imageAlt: file.name
          })
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
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
`
document.head.appendChild(style)
