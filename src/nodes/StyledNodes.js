// 自定义美化节点样式
import { RectNode, RectNodeModel, CircleNode, CircleNodeModel, DiamondNode, DiamondNodeModel, EllipseNode, EllipseNodeModel, TextNode, TextNodeModel, h } from '@logicflow/core'

// ================== 美化矩形节点 ==================
class StyledRectView extends RectNode {
  getShape() {
    const { x, y, width, height, properties } = this.props.model
    
    // 获取自定义颜色或使用默认渐变
    const fillColor = properties.fillColor || '#667eea'
    const opacity = properties.opacity ?? 1
    const gradientId = `rect-gradient-${this.props.model.id}`
    
    return h('g', { opacity }, [
      // 阴影
      h('rect', {
        x: x - width / 2 + 3,
        y: y - height / 2 + 3,
        width,
        height,
        rx: 8,
        ry: 8,
        fill: 'rgba(0,0,0,0.15)',
      }),
      // 渐变定义
      h('defs', {}, [
        h('linearGradient', {
          id: gradientId,
          x1: '0%',
          y1: '0%',
          x2: '100%',
          y2: '100%',
        }, [
          h('stop', { offset: '0%', style: { stopColor: fillColor, stopOpacity: 1 } }),
          h('stop', { offset: '100%', style: { stopColor: this.darkenColor(fillColor, 20), stopOpacity: 1 } }),
        ])
      ]),
      // 主体
      h('rect', {
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
        rx: 8,
        ry: 8,
        fill: `url(#${gradientId})`,
        stroke: this.darkenColor(fillColor, 30),
        strokeWidth: 2,
      }),
    ])
  }
  
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max((num >> 16) - amt, 0)
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
    const B = Math.max((num & 0x0000FF) - amt, 0)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }
}

class StyledRectModel extends RectNodeModel {
  initNodeData(data) {
    super.initNodeData(data)
    this.width = data.width || 120
    this.height = data.height || 60
    this.radius = 8
  }
  
  getTextStyle() {
    const style = super.getTextStyle()
    const { properties } = this
    style.color = properties.fontColor || '#fff'
    style.fontSize = properties.fontSize || 14
    style.fontWeight = 500
    return style
  }
}

// ================== 美化圆形节点 ==================
class StyledCircleView extends CircleNode {
  getShape() {
    const { x, y, r, properties } = this.props.model
    const fillColor = properties.fillColor || '#52c41a'
    const opacity = properties.opacity ?? 1
    const gradientId = `circle-gradient-${this.props.model.id}`
    
    return h('g', { opacity }, [
      // 阴影
      h('circle', {
        cx: x + 2,
        cy: y + 2,
        r,
        fill: 'rgba(0,0,0,0.1)',
      }),
      // 渐变
      h('defs', {}, [
        h('radialGradient', {
          id: gradientId,
          cx: '30%',
          cy: '30%',
        }, [
          h('stop', { offset: '0%', style: { stopColor: this.lightenColor(fillColor, 20), stopOpacity: 1 } }),
          h('stop', { offset: '100%', style: { stopColor: fillColor, stopOpacity: 1 } }),
        ])
      ]),
      // 主体
      h('circle', {
        cx: x,
        cy: y,
        r,
        fill: `url(#${gradientId})`,
        stroke: this.darkenColor(fillColor, 20),
        strokeWidth: 2,
      }),
    ])
  }
  
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max((num >> 16) - amt, 0)
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
    const B = Math.max((num & 0x0000FF) - amt, 0)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }
  
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min((num >> 16) + amt, 255)
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255)
    const B = Math.min((num & 0x0000FF) + amt, 255)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }
}

class StyledCircleModel extends CircleNodeModel {
  initNodeData(data) {
    super.initNodeData(data)
    this.r = data.r || 35
  }
  
  getTextStyle() {
    const style = super.getTextStyle()
    const { properties } = this
    style.color = properties.fontColor || '#fff'
    style.fontSize = properties.fontSize || 14
    style.fontWeight = 500
    return style
  }
}

// ================== 美化菱形节点 ==================
class StyledDiamondView extends DiamondNode {
  getShape() {
    const { x, y, properties } = this.props.model
    const { rx, ry } = this.props.model
    const fillColor = properties.fillColor || '#faad14'
    const opacity = properties.opacity ?? 1
    const gradientId = `diamond-gradient-${this.props.model.id}`
    
    const points = [
      [x, y - ry],
      [x + rx, y],
      [x, y + ry],
      [x - rx, y],
    ].map(p => p.join(',')).join(' ')
    
    const shadowPoints = [
      [x + 2, y - ry + 2],
      [x + rx + 2, y + 2],
      [x + 2, y + ry + 2],
      [x - rx + 2, y + 2],
    ].map(p => p.join(',')).join(' ')
    
    return h('g', { opacity }, [
      // 阴影
      h('polygon', {
        points: shadowPoints,
        fill: 'rgba(0,0,0,0.1)',
      }),
      // 渐变
      h('defs', {}, [
        h('linearGradient', {
          id: gradientId,
          x1: '0%',
          y1: '0%',
          x2: '100%',
          y2: '100%',
        }, [
          h('stop', { offset: '0%', style: { stopColor: this.lightenColor(fillColor, 10), stopOpacity: 1 } }),
          h('stop', { offset: '100%', style: { stopColor: fillColor, stopOpacity: 1 } }),
        ])
      ]),
      // 主体
      h('polygon', {
        points,
        fill: `url(#${gradientId})`,
        stroke: this.darkenColor(fillColor, 20),
        strokeWidth: 2,
      }),
    ])
  }
  
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max((num >> 16) - amt, 0)
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
    const B = Math.max((num & 0x0000FF) - amt, 0)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }
  
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min((num >> 16) + amt, 255)
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255)
    const B = Math.min((num & 0x0000FF) + amt, 255)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }
}

class StyledDiamondModel extends DiamondNodeModel {
  initNodeData(data) {
    super.initNodeData(data)
    this.rx = data.rx || 55
    this.ry = data.ry || 35
  }
  
  getTextStyle() {
    const style = super.getTextStyle()
    const { properties } = this
    style.color = properties.fontColor || '#fff'
    style.fontSize = properties.fontSize || 13
    style.fontWeight = 500
    return style
  }
}

// ================== 美化椭圆节点 ==================
class StyledEllipseView extends EllipseNode {
  getShape() {
    const { x, y, properties } = this.props.model
    const { rx, ry } = this.props.model
    const fillColor = properties.fillColor || '#13c2c2'
    const opacity = properties.opacity ?? 1
    const gradientId = `ellipse-gradient-${this.props.model.id}`
    
    return h('g', { opacity }, [
      // 阴影
      h('ellipse', {
        cx: x + 2,
        cy: y + 2,
        rx,
        ry,
        fill: 'rgba(0,0,0,0.1)',
      }),
      // 渐变
      h('defs', {}, [
        h('radialGradient', {
          id: gradientId,
          cx: '30%',
          cy: '30%',
        }, [
          h('stop', { offset: '0%', style: { stopColor: this.lightenColor(fillColor, 20), stopOpacity: 1 } }),
          h('stop', { offset: '100%', style: { stopColor: fillColor, stopOpacity: 1 } }),
        ])
      ]),
      // 主体
      h('ellipse', {
        cx: x,
        cy: y,
        rx,
        ry,
        fill: `url(#${gradientId})`,
        stroke: this.darkenColor(fillColor, 20),
        strokeWidth: 2,
      }),
    ])
  }
  
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max((num >> 16) - amt, 0)
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
    const B = Math.max((num & 0x0000FF) - amt, 0)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }
  
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min((num >> 16) + amt, 255)
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255)
    const B = Math.min((num & 0x0000FF) + amt, 255)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }
}

class StyledEllipseModel extends EllipseNodeModel {
  initNodeData(data) {
    super.initNodeData(data)
    this.rx = data.rx || 60
    this.ry = data.ry || 35
  }
  
  getTextStyle() {
    const style = super.getTextStyle()
    const { properties } = this
    style.color = properties.fontColor || '#fff'
    style.fontSize = properties.fontSize || 14
    style.fontWeight = 500
    return style
  }
}

// ================== 美化文本节点 ==================
class StyledTextView extends RectNode {
  getShape() {
    const { x, y, width, height, properties } = this.props.model
    const opacity = properties.opacity ?? 1
    const bgColor = properties.fillColor || 'transparent'
    const showBg = properties.showBackground !== false && bgColor !== 'transparent'
    
    return h('g', { opacity }, [
      // 背景（可选）
      showBg ? h('rect', {
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
        rx: 4,
        ry: 4,
        fill: bgColor,
        fillOpacity: 0.1,
        stroke: bgColor,
        strokeWidth: 1,
        strokeOpacity: 0.3,
      }) : null,
    ].filter(Boolean))
  }
}

class StyledTextModel extends RectNodeModel {
  initNodeData(data) {
    super.initNodeData(data)
    this.width = data.width || 100
    this.height = data.height || 40
    this.radius = 4
  }
  
  getTextStyle() {
    const style = super.getTextStyle()
    const { properties } = this
    style.color = properties.fontColor || '#333333'
    style.fontSize = properties.fontSize || 14
    style.fontWeight = properties.fontWeight || 400
    return style
  }
  
  getNodeStyle() {
    const style = super.getNodeStyle()
    // 隐藏默认边框
    style.stroke = 'transparent'
    style.fill = 'transparent'
    return style
  }
}

// 注册所有美化节点
export function registerStyledNodes(lf) {
  lf.register({
    type: 'styled-rect',
    view: StyledRectView,
    model: StyledRectModel,
  })
  
  lf.register({
    type: 'styled-circle',
    view: StyledCircleView,
    model: StyledCircleModel,
  })
  
  lf.register({
    type: 'styled-diamond',
    view: StyledDiamondView,
    model: StyledDiamondModel,
  })
  
  lf.register({
    type: 'styled-ellipse',
    view: StyledEllipseView,
    model: StyledEllipseModel,
  })
  
  lf.register({
    type: 'styled-text',
    view: StyledTextView,
    model: StyledTextModel,
  })
}
