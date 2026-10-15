import { PDFDocument } from 'pdf-lib'
import { canvasToBlob } from './file'

const A4 = { width: 595.28, height: 841.89 }

export async function loadDoc(bytes) {
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
}

export async function mergePdfs(items, onProgress) {
  const out = await PDFDocument.create()
  for (let i = 0; i < items.length; i++) {
    const src = await loadDoc(items[i].bytes)
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
    onProgress && onProgress((i + 1) / items.length)
  }
  return out.save()
}

// "1-3,5,8-10" -> [[1,2,3],[5],[8,9,10]]（1 起始，越界截断，乱序纠正）
export function parseRanges(str, total) {
  const groups = []
  const parts = String(str || '')
    .split(/[,，;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*[-~—]\s*(\d+)$/)
    if (m) {
      let a = parseInt(m[1], 10)
      let b = parseInt(m[2], 10)
      if (a > b) [a, b] = [b, a]
      const g = []
      for (let i = Math.max(1, a); i <= Math.min(total, b); i++) g.push(i)
      if (g.length) groups.push(g)
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10)
      if (n >= 1 && n <= total) groups.push([n])
    } else {
      throw new Error(`无法识别的页码范围：${part}`)
    }
  }
  return groups
}

export async function splitPdf(bytes, rangesStr, baseNameStr, onProgress) {
  const src = await loadDoc(bytes)
  const total = src.getPageCount()
  const groups = parseRanges(rangesStr, total)
  if (!groups.length) throw new Error('没有有效的页码范围')
  const results = []
  for (let i = 0; i < groups.length; i++) {
    const out = await PDFDocument.create()
    const pages = await out.copyPages(src, groups[i].map((n) => n - 1))
    pages.forEach((p) => out.addPage(p))
    const saved = await out.save()
    const label =
      groups[i].length === 1 ? `${groups[i][0]}` : `${groups[i][0]}-${groups[i][groups[i].length - 1]}`
    results.push({ name: `${baseNameStr}_第${label}页.pdf`, bytes: saved })
    onProgress && onProgress((i + 1) / groups.length)
  }
  return results
}

// 图片文件 -> JPEG 字节（统一格式、白底、控制体积）
async function imageFileToJpeg(file, maxSide = 2400) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    let { naturalWidth: w, naturalHeight: h } = img
    const scale = Math.min(1, maxSide / Math.max(w, h))
    w = Math.max(1, Math.round(w * scale))
    h = Math.max(1, Math.round(h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// files: File[]，opts: { pageSize: 'a4' | 'original', orientation: 'auto' | 'portrait' | 'landscape', margin: pt }
export async function imagesToPdf(files, opts = {}, onProgress) {
  const { pageSize = 'a4', orientation = 'auto', margin = 20 } = opts
  const doc = await PDFDocument.create()
  for (let i = 0; i < files.length; i++) {
    const { bytes, width, height } = await imageFileToJpeg(files[i])
    const img = await doc.embedJpg(bytes)
    if (pageSize === 'original') {
      // 按 96dpi 换算为 pt
      const wPt = (width * 72) / 96
      const hPt = (height * 72) / 96
      const page = doc.addPage([wPt + margin * 2, hPt + margin * 2])
      page.drawImage(img, { x: margin, y: margin, width: wPt, height: hPt })
    } else {
      const landscape = orientation === 'landscape' || (orientation === 'auto' && width > height)
      const pw = landscape ? A4.height : A4.width
      const ph = landscape ? A4.width : A4.height
      const page = doc.addPage([pw, ph])
      const availW = pw - margin * 2
      const availH = ph - margin * 2
      const scale = Math.min(availW / width, availH / height)
      const w = width * scale
      const h = height * scale
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
    }
    onProgress && onProgress((i + 1) / files.length)
  }
  return doc.save()
}
