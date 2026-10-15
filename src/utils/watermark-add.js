// PDF 加水印：文字水印先渲染为透明 PNG（支持中文，无需嵌入 CJK 字体），
// 再用 pdf-lib 平铺/居中绘制；图片水印直接嵌入。
import { degrees } from 'pdf-lib'
import { loadDoc } from './pdf-ops'

async function textToPng(text, { fontSize = 48, color = '#9ca3af', opacity = 0.25 }) {
  const ss = 3 // 超采样，保证打印清晰度
  const font = `bold ${Math.round(fontSize * ss)}px "PingFang SC","Microsoft YaHei",sans-serif`
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = font
  const tw = measure.measureText(text).width
  const w = Math.ceil(tw) + Math.round(fontSize * ss * 0.6)
  const h = Math.round(fontSize * ss * 1.8)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.fillStyle = color
  ctx.globalAlpha = opacity
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return { bytes: new Uint8Array(await blob.arrayBuffer()), widthPt: w / ss, heightPt: h / ss }
}

function detectImageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png'
  return 'other'
}

// opts: { mode:'text'|'image', text, imageBytes, color, opacity, angle, size, layout:'tile'|'center' }
export async function addWatermark(bytes, opts = {}) {
  const {
    mode = 'text',
    text = '机密',
    imageBytes = null,
    color = '#9ca3af',
    opacity = 0.25,
    angle = 30,
    size = 48,
    layout = 'tile',
  } = opts

  const doc = await loadDoc(bytes)
  let embed
  let drawW
  let drawH
  if (mode === 'text') {
    const t = await textToPng(String(text || '水印'), { fontSize: size, color, opacity })
    embed = await doc.embedPng(t.bytes)
    drawW = t.widthPt
    drawH = t.heightPt
  } else {
    if (!imageBytes) throw new Error('请选择水印图片')
    const type = detectImageType(imageBytes)
    if (type === 'jpg') embed = await doc.embedJpg(imageBytes)
    else if (type === 'png') embed = await doc.embedPng(imageBytes)
    else {
      // webp/gif/bmp 等统一转 PNG
      const url = URL.createObjectURL(new Blob([imageBytes]))
      try {
        const img = await new Promise((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = reject
          el.src = url
        })
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
        embed = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()))
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    const s = size / embed.height()
    drawW = embed.width() * s
    drawH = size
  }

  const rotate = degrees(angle)
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    if (layout === 'center') {
      page.drawImage(embed, {
        x: (width - drawW) / 2,
        y: (height - drawH) / 2,
        width: drawW,
        height: drawH,
        rotate,
      })
    } else {
      const stepX = drawW * 1.5
      const stepY = drawH * 2.5
      for (let y = stepY / 2; y < height + stepY; y += stepY) {
        for (let x = stepX / 2; x < width + stepX; x += stepX) {
          page.drawImage(embed, { x: x - drawW / 2, y: y - drawH / 2, width: drawW, height: drawH, rotate })
        }
      }
    }
  }
  return doc.save()
}
