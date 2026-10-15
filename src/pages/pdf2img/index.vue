<template>
	<view class="tool-page">
		<view class="card">
			<view class="card-title">选择 PDF</view>
			<button class="btn-ghost" @tap="choose">{{ file ? '重新选择' : '选择 PDF 文件' }}</button>
			<view v-if="file" class="file-item">
				<view class="file-name">
					<text>{{ file.name }}</text>
					<text class="file-size">{{ file.pageCount }} 页 · {{ file.sizeText }}</text>
				</view>
			</view>
		</view>

		<view class="card">
			<view class="card-title">导出设置</view>
			<view class="label">格式</view>
			<view class="seg">
				<view class="seg-item" :class="{ active: format === 'jpeg' }" @tap="format = 'jpeg'">JPG</view>
				<view class="seg-item" :class="{ active: format === 'png' }" @tap="format = 'png'">PNG</view>
			</view>
			<view class="label">清晰度：{{ scale }}x（约 {{ Math.round(scale * 96) }} DPI）</view>
			<slider :value="scale * 10" :min="10" :max="40" :step="5" activeColor="#2f6bff" @change="(e) => (scale = e.detail.value / 10)" />
			<button class="btn-primary" style="margin-top: 24rpx" :disabled="!file || busy" @tap="generate">
				{{ busy ? `导出中 ${Math.round(progress * 100)}%` : '逐页导出图片' }}
			</button>
			<view v-if="busy" class="progress-wrap">
				<view class="progress-bar"><view class="progress-inner" :style="{ width: progress * 100 + '%' }"></view></view>
			</view>
		</view>

		<view v-if="images.length" class="card">
			<view class="row-between">
				<view class="card-title" style="margin-bottom: 0">导出结果（{{ images.length }} 张）</view>
				<button class="mini-btn" @tap="downloadAll">全部下载</button>
			</view>
			<view v-for="(im, i) in images" :key="im.name" class="result-item">
				<image class="out-thumb" :src="im.url" mode="aspectFill" />
				<text class="file-name">{{ im.name }}（{{ im.sizeText }}）</text>
				<button class="mini-btn" @tap="downloadOne(i)">下载</button>
			</view>
		</view>
	</view>
</template>

<script>
import { pickFiles, readFileBytes, canvasToBlob, downloadBlob, formatSize, baseName } from '../../utils/file'
import { loadPdfDoc, renderPageToCanvas, getPdfPageCount } from '../../utils/pdfjs'

export default {
	data() {
		return {
			file: null,
			format: 'jpeg',
			scale: 2,
			busy: false,
			progress: 0,
			images: [],
		}
	},
	methods: {
		async choose() {
			const files = await pickFiles('.pdf,application/pdf', false)
			if (!files.length) return
			const f = files[0]
			try {
				const bytes = await readFileBytes(f)
				const pageCount = await getPdfPageCount(bytes)
				this.file = { name: f.name, bytes, pageCount, sizeText: formatSize(f.size) }
				this.clearImages()
			} catch (e) {
				uni.showModal({ title: '无法读取', content: String((e && e.message) || e), showCancel: false })
			}
		},
		clearImages() {
			this.images.forEach((im) => URL.revokeObjectURL(im.url))
			this.images = []
		},
		async generate() {
			this.busy = true
			this.progress = 0
			this.clearImages()
			let doc = null
			try {
				doc = await loadPdfDoc(this.file.bytes)
				const mime = this.format === 'jpeg' ? 'image/jpeg' : 'image/png'
				const ext = this.format === 'jpeg' ? 'jpg' : 'png'
				const base = baseName(this.file.name)
				for (let i = 1; i <= doc.numPages; i++) {
					const page = await doc.getPage(i)
					const canvas = await renderPageToCanvas(page, this.scale)
					const blob = await canvasToBlob(canvas, mime, 0.92)
					this.images.push({
						name: `${base}_第${i}页.${ext}`,
						blob,
						sizeText: formatSize(blob.size),
						url: URL.createObjectURL(blob),
					})
					this.progress = i / doc.numPages
				}
			} catch (e) {
				uni.showModal({ title: '导出失败', content: String((e && e.message) || e), showCancel: false })
			} finally {
				if (doc) await doc.destroy()
				this.busy = false
			}
		},
		downloadOne(i) {
			const im = this.images[i]
			downloadBlob(im.blob, im.name)
		},
		async downloadAll() {
			for (let i = 0; i < this.images.length; i++) {
				this.downloadOne(i)
				await new Promise((res) => setTimeout(res, 400))
			}
		},
	},
}
</script>

<style>
.out-thumb {
	width: 64rpx;
	height: 84rpx;
	border-radius: 8rpx;
	background: #f3f4f6;
	flex-shrink: 0;
	margin-right: 16rpx;
	object-fit: cover;
}
</style>
