// PDF 去水印：结构化删除方案。
// 识别页面资源中的水印图片（带透明蒙版 SMask 的图像、跨页重复出现的图像、
// Form XObject 内嵌图像）以及 Watermark 注释，将其从 PDF 中移除，不做栅格化，
// 保留原有矢量文字与排版。
import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFRef,
  PDFArray,
  PDFRawStream,
} from 'pdf-lib'

const N = (s) => PDFName.of(s)

function resolveObj(context, obj) {
  return obj instanceof PDFRef ? context.lookup(obj) : obj
}

function nameStr(obj) {
  if (!obj) return ''
  const s = String(obj)
  return s.startsWith('/') ? s.slice(1) : s
}

function numVal(context, obj) {
  const o = resolveObj(context, obj)
  const n = parseFloat(String(o))
  return Number.isFinite(n) ? n : undefined
}

function filterNames(context, dict) {
  const f = resolveObj(context, dict.get(N('Filter')))
  if (!f) return []
  if (f instanceof PDFArray) {
    const arr = []
    for (let i = 0; i < f.size(); i++) arr.push(nameStr(f.get(i)))
    return arr
  }
  return [nameStr(f)]
}

// 沿 Parent 链解析页面 Resources（可能是继承的）
function findResourcesDict(context, pageNode) {
  let node = pageNode
  const visited = new Set()
  while (node && !visited.has(node)) {
    visited.add(node)
    if (!(node instanceof PDFDict)) break
    const res = node.get(N('Resources'))
    if (res) {
      const d = resolveObj(context, res)
      if (d instanceof PDFDict) return d
    }
    const parent = node.get(N('Parent'))
    node = parent ? resolveObj(context, parent) : null
  }
  return null
}

// 遍历所有页面（含 Form XObject 递归），收集图像 XObject 与 Watermark 注释
function analyzeDoc(doc) {
  const context = doc.context
  const pages = doc.getPages()
  const imageMap = new Map() // key -> { ref, stream, usages:[{resDict,name}], pageIdxs:Set }
  const annotCandidates = [] // { id, ref, pageNode, pageIdx }

  const scanXObjects = (resDict, pageIdx, depth) => {
    if (!resDict || depth > 3) return
    const xobj = resolveObj(context, resDict.get(N('XObject')))
    if (!(xobj instanceof PDFDict)) return
    for (const [key, value] of xobj.entries()) {
      const target = resolveObj(context, value)
      if (!(target instanceof PDFRawStream)) continue
      const subtype = nameStr(target.dict.get(N('Subtype')))
      if (subtype === 'Image') {
        const isRef = value instanceof PDFRef
        const mapKey = isRef ? value.toString() : `direct:${pageIdx}:${String(key)}`
        let entry = imageMap.get(mapKey)
        if (!entry) {
          entry = { ref: isRef ? value : null, stream: target, usages: [], pageIdxs: new Set() }
          imageMap.set(mapKey, entry)
        }
        entry.usages.push({ resDict, name: key })
        entry.pageIdxs.add(pageIdx)
      } else if (subtype === 'Form') {
        const formRes = resolveObj(context, target.dict.get(N('Resources')))
        scanXObjects(formRes instanceof PDFDict ? formRes : null, pageIdx, depth + 1)
      }
    }
  }

  pages.forEach((page, idx) => {
    const resDict = findResourcesDict(context, page.node)
    scanXObjects(resDict, idx, 0)
    const a = resolveObj(context, page.node.get(N('Annots')))
    if (a instanceof PDFArray) {
      for (let i = 0; i < a.size(); i++) {
        const obj = a.get(i)
        const d = resolveObj(context, obj)
        if (d instanceof PDFDict && nameStr(d.get(N('Subtype'))) === 'Watermark') {
          annotCandidates.push({
            id: `annot:${obj instanceof PDFRef ? obj.toString() : idx + ':' + i}`,
            ref: obj,
            pageNode: page.node,
            pageIdx: idx,
          })
        }
      }
    }
  })

  return { imageMap, annotCandidates, total: pages.length }
}

// ---------- 预览提取（尽力而为，失败返回 null，不影响删除） ----------

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

function bytesToDataUrl(bytes, mime) {
  let bin = ''
  const chunk = 0x8000
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk))
  }
  return `data:${mime};base64,${btoa(bin)}`
}

async function extractPreview(context, stream) {
  try {
    const dict = stream.dict
    const width = numVal(context, dict.get(N('Width')))
    const height = numVal(context, dict.get(N('Height')))
    if (!width || !height || width * height > 25e6) return null
    const filters = filterNames(context, dict)
    const raw = stream.getContents()

    if (filters.includes('DCTDecode')) return bytesToDataUrl(raw, 'image/jpeg')
    if (filters.includes('JPXDecode')) return null
    if (filters.some((f) => f !== 'FlateDecode')) return null

    const bpc = numVal(context, dict.get(N('BitsPerComponent'))) || 8
    const cs = resolveObj(context, dict.get(N('ColorSpace')))
    let channels = null
    if (cs instanceof PDFName) {
      const csn = nameStr(cs)
      if (csn === 'DeviceRGB') channels = 3
      else if (csn === 'DeviceGray') channels = 1
    } else if (cs instanceof PDFArray) {
      const t = nameStr(cs.get(0))
      if (t === 'ICCBased') {
        const nd = resolveObj(context, cs.get(1))
        channels = (nd instanceof PDFDict ? numVal(context, nd.get(N('N'))) : 3) || 3
      }
    }
    if (!channels || bpc !== 8) return null

    const samples = filters.includes('FlateDecode') ? await inflate(raw) : raw
    const need = width * height * channels
    if (samples.length < need) return null

    let alpha = null
    const smaskObj = resolveObj(context, dict.get(N('SMask')))
    if (smaskObj instanceof PDFRawStream) {
      const sf = filterNames(context, smaskObj.dict)
      const sraw = smaskObj.getContents()
      let sdec = sraw
      if (sf.includes('FlateDecode')) sdec = await inflate(sraw)
      else if (sf.length) return null
      if (sdec.length >= width * height) alpha = sdec
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    const imgData = ctx.createImageData(width, height)
    const out = imgData.data
    for (let i = 0, j = 0; i < width * height; i++) {
      if (channels === 3) {
        out[i * 4] = samples[j]
        out[i * 4 + 1] = samples[j + 1]
        out[i * 4 + 2] = samples[j + 2]
        j += 3
      } else {
        out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = samples[j]
        j += 1
      }
      out[i * 4 + 3] = alpha ? alpha[i] : 255
    }
    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL('image/png')
  } catch (e) {
    return null
  }
}

// ---------- 对外 API ----------

// 返回候选水印列表：{ id, type, reason, pages, pageCount, preview, checked }
export async function detectWatermarks(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const context = doc.context
  const { imageMap, annotCandidates, total } = analyzeDoc(doc)
  const candidates = []

  for (const [key, e] of imageMap) {
    const dict = e.stream.dict
    if (dict.get(N('WmStub'))) continue // 本工具替换水印用的占位图，跳过
    const width = numVal(context, dict.get(N('Width')))
    const height = numVal(context, dict.get(N('Height')))
    const hasSmask = !!dict.get(N('SMask'))
    const pageCount = e.pageIdxs.size
    const reasons = []
    if (hasSmask) reasons.push('带透明蒙版')
    if (total > 1 && pageCount >= 2) reasons.push(`在 ${pageCount} 页重复出现`)
    if (!reasons.length) continue // 普通内容图片不列出
    candidates.push({
      id: key,
      type: 'image',
      width,
      height,
      pageCount,
      pages: Array.from(e.pageIdxs).map((i) => i + 1).sort((a, b) => a - b),
      reason: reasons.join('，'),
      checked: true,
      preview: await extractPreview(context, e.stream),
    })
  }

  for (const a of annotCandidates) {
    candidates.push({
      id: a.id,
      type: 'annot',
      pageCount: 1,
      pages: [a.pageIdx + 1],
      reason: 'Watermark 注释',
      checked: true,
      preview: null,
    })
  }

  return { candidates, pageCount: total }
}

// 1x1 全透明占位图：替换水印引用，绘制时不可见；WmStub 标记避免被再次识别为水印
function createTransparentStub(context) {
  const base = {
    Type: 'XObject',
    Subtype: 'Image',
    Width: 1,
    Height: 1,
    BitsPerComponent: 8,
    WmStub: 1,
  }
  const smaskRef = context.register(context.stream(Uint8Array.from([0]), { ...base, WmStub: undefined, ColorSpace: 'DeviceGray' }))
  return context.register(context.stream(Uint8Array.from([255]), { ...base, ColorSpace: 'DeviceGray', SMask: smaskRef }))
}

function hasObjStm(context) {
  for (const [, obj] of context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && nameStr(obj.dict.get(N('Type'))) === 'ObjStm') return true
  }
  return false
}

// 检查 ref 是否仍被任何对象引用（pdf-lib 的 PDFRef 是驻留的，可按身份比较）
function isStillReferenced(context, ref) {
  const hit = (v) => v === ref
  for (const [selfRef, obj] of context.enumerateIndirectObjects()) {
    if (selfRef === ref) continue
    if (obj instanceof PDFRawStream) {
      for (const [, v] of obj.dict.entries()) if (hit(v)) return true
    } else if (obj instanceof PDFDict) {
      for (const [, v] of obj.entries()) if (hit(v)) return true
    } else if (obj instanceof PDFArray) {
      for (let i = 0; i < obj.size(); i++) if (hit(obj.get(i))) return true
    }
  }
  return false
}

// selectedIds: 勾选的候选 id；返回处理后的 Uint8Array
export async function removeWatermarks(bytes, selectedIds, onProgress) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const context = doc.context
  const { imageMap, annotCandidates } = analyzeDoc(doc)
  const idSet = new Set(selectedIds)
  const canDelete = !hasObjStm(context)
  let stubRef = null
  let done = 0

  for (const [key, e] of imageMap) {
    if (!idSet.has(key)) continue
    if (!stubRef) stubRef = createTransparentStub(context)
    for (const u of e.usages) {
      u.resDict.set(u.name, stubRef)
    }
    if (canDelete && e.ref && !isStillReferenced(context, e.ref)) {
      const sm = resolveObj(context, e.stream.dict.get(N('SMask')))
      const smRef = e.stream.dict.get(N('SMask'))
      context.delete(e.ref)
      if (sm instanceof PDFRawStream && smRef instanceof PDFRef && !isStillReferenced(context, smRef)) {
        context.delete(smRef)
      }
    }
    done++
    onProgress && onProgress(done / Math.max(1, idSet.size))
  }

  for (const a of annotCandidates) {
    if (!idSet.has(a.id)) continue
    const arr = resolveObj(context, a.pageNode.get(N('Annots')))
    if (arr instanceof PDFArray) {
      const keep = PDFArray.withContext(context)
      const target = resolveObj(context, a.ref)
      for (let i = 0; i < arr.size(); i++) {
        const obj = arr.get(i)
        if (resolveObj(context, obj) !== target) keep.push(obj)
      }
      if (keep.size()) a.pageNode.set(N('Annots'), keep)
      else a.pageNode.delete(N('Annots'))
    }
    done++
    onProgress && onProgress(done / Math.max(1, idSet.size))
  }

  return doc.save()
}
