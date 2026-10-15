import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

// pdf.js 会转移（transfer）传入的 buffer，这里始终传副本，避免原 bytes 失效
// 注意：pdfjs-dist v4+ 的 PDFDocumentProxy 没有 destroy()，销毁必须走 loadingTask
export function loadPdfDoc(bytes) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) })
  return loadingTask.promise.then((doc) => {
    doc.destroy = () => loadingTask.destroy()
    return doc
  })
}

export async function renderPageToCanvas(page, scale = 2) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(viewport.width))
  canvas.height = Math.max(1, Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

// 取指定 PDF 的若干页缩略图（dataURL），用于列表预览
export async function getPdfThumbnails(bytes, pageCount, maxWidth = 150) {
  const doc = await loadPdfDoc(bytes)
  const total = Math.min(pageCount, doc.numPages)
  const urls = []
  for (let i = 1; i <= total; i++) {
    try {
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const canvas = await renderPageToCanvas(page, maxWidth / base.width)
      urls.push(canvas.toDataURL('image/jpeg', 0.8))
    } catch (e) {
      urls.push('')
    }
  }
  await doc.destroy()
  return urls
}

export async function getPdfPageCount(bytes) {
  const doc = await loadPdfDoc(bytes)
  const n = doc.numPages
  await doc.destroy()
  return n
}
