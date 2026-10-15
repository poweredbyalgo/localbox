<template>
	<view class="tool-page">
		<view class="card">
			<view class="card-title">选择 PDF</view>
			<button class="btn-ghost" @tap="choose">添加 PDF 文件</button>
			<view v-for="(it, i) in items" :key="it.id" class="file-item">
				<image v-if="it.thumb" class="file-thumb" :src="it.thumb" mode="aspectFill" />
				<view v-else class="file-thumb"></view>
				<view class="file-name">
					<text>{{ it.name }}</text>
					<text class="file-size">{{ it.pageCount }} 页 · {{ it.sizeText }}</text>
				</view>
				<view class="file-actions">
					<button class="mini-btn" :disabled="i === 0" @tap="moveUp(i)">上移</button>
					<button class="mini-btn" :disabled="i === items.length - 1" @tap="moveDown(i)">下移</button>
					<button class="mini-btn danger" @tap="removeAt(i)">删除</button>
				</view>
			</view>
			<view v-if="!items.length" class="hint">至少两个 PDF，按列表顺序合并。</view>
		</view>

		<view class="card">
			<button class="btn-primary" :disabled="items.length < 2 || busy" @tap="generate">
				{{ busy ? '处理中…' : '合并并下载' }}
			</button>
			<view v-if="busy" class="progress-wrap">
				<view class="progress-bar"><view class="progress-inner" :style="{ width: progress * 100 + '%' }"></view></view>
				<view class="progress-text">{{ Math.round(progress * 100) }}%</view>
			</view>
		</view>
	</view>
</template>

<script>
import { pickFiles, readFileBytes, downloadBytes, formatSize, baseName } from '../../utils/file'
import { getPdfThumbnails, getPdfPageCount } from '../../utils/pdfjs'
import { mergePdfs } from '../../utils/pdf-ops'

let uid = 1

export default {
	data() {
		return {
			items: [],
			busy: false,
			progress: 0,
		}
	},
	methods: {
		async choose() {
			const files = await pickFiles('.pdf,application/pdf', true)
			for (const f of files) {
				const bytes = await readFileBytes(f)
				let pageCount = 0
				let thumb = ''
				try {
					pageCount = await getPdfPageCount(bytes)
					thumb = (await getPdfThumbnails(bytes, 1))[0] || ''
				} catch (e) {
					uni.showModal({ title: '无法读取', content: `${f.name} 可能已损坏或加密`, showCancel: false })
					continue
				}
				this.items.push({ id: uid++, name: f.name, bytes, pageCount, thumb, sizeText: formatSize(f.size) })
			}
		},
		moveUp(i) {
			if (i === 0) return
			const arr = this.items.slice()
			const t = arr.splice(i, 1)[0]
			arr.splice(i - 1, 0, t)
			this.items = arr
		},
		moveDown(i) {
			const arr = this.items.slice()
			if (i === arr.length - 1) return
			const t = arr.splice(i, 1)[0]
			arr.splice(i + 1, 0, t)
			this.items = arr
		},
		removeAt(i) {
			this.items.splice(i, 1)
		},
		async generate() {
			this.busy = true
			this.progress = 0
			try {
				const bytes = await mergePdfs(
					this.items.map((it) => ({ bytes: it.bytes, name: it.name })),
					(p) => (this.progress = p)
				)
				const name = `${baseName(this.items[0].name)}_合并${this.items.length}份.pdf`
				downloadBytes(bytes, name, 'application/pdf')
			} catch (e) {
				uni.showModal({ title: '合并失败', content: String((e && e.message) || e), showCancel: false })
			} finally {
				this.busy = false
			}
		},
	},
}
</script>
