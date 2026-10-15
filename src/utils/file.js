// H5/PWA 专用：文件选择、读取、下载（本应用仅构建 H5，可直接使用 DOM）

export function pickFiles(accept = '', multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = !!multiple
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      const files = Array.from(input.files || [])
      input.remove()
      resolve(files)
    })
    input.addEventListener('cancel', () => {
      input.remove()
      resolve([])
    })
    input.click()
  })
}

export async function readFileBytes(file) {
  const buf = await file.arrayBuffer()
  return new Uint8Array(buf)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export function downloadBytes(bytes, filename, mime = 'application/octet-stream') {
  downloadBlob(new Blob([bytes], { type: mime }), filename)
}

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

export function baseName(filename) {
  return String(filename || '').replace(/\.[^.]+$/, '') || 'file'
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas 导出失败'))
    }, type, quality)
  })
}
