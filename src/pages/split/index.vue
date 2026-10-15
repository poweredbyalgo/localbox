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
			<scroll-view v-if="thumbs.length" class="thumb-scroll" scroll-x>
				<view class="thumb-row">
					<image v-for="(t, i) in thumbs" :key="i" class="thumb-img" :src="t" mode="aspectFit" />
				</view>
			</scroll-view>
			<view v-if="!file" class="hint">选择一个 PDF，按页码范围拆分为多个文件。</view>
		</view>

		<view class="card">
			<view class="card-title">页码范围</view>
			<view class="label">每段范围用逗号分隔，各自输出为一个文件，如：1-3,5,8-10</view>
			<input class="input" v-model="ranges" placeholder="例如 1-3,5" />
			<button class="btn-primary" style="margin-top: 24rpx" :disabled="!file || busy" @tap="generate">
				{{ busy ? '处理中…' : '拆分' }}
			</button>
			<view v-if="busy" class="progress-wrap">
				<view class="progress-bar"><view class="progress-inner" :style="{ width: progress * 100 + '%' }"></view></view>
				<view class="progress-text">{{ Math.round(progress * 100) }}%</view>
			</view>
		</view>

		<view v-if="results.length" class="card">
			<view class="row-between">
				<view class="card-title" style="margin-bottom:0">拆分结果（{{ results.length }} 个文件）</view>
				<button class="mini-btn" @tap="downloadAll">全部下载</button>
			</view>
			<view v-for="(r, i) in results" :key="r.name" class="result-item">
				<text class="file-name">{{ r.name }}（{{ r.sizeText }}）</text>
				<button class="mini-btn" @tap="downloadOne(i)">下载</button>
			</view>
		</view>
	</view>
</template>

<script>
import { pickFiles, readFileBytes, downloadBytes, formatSize, baseName } from '../../utils/file'
import { getPdfThumbnails, getPdfPageCount } from '../../utils/pdfjs'
import { splitPdf } from '../../utils/pdf-ops'

export default {
	data() {
		return {
			file: null,
			ranges: '',
			thumbs: [],
			busy: false,
			progress: 0,
			results: [],
		}
	},
	methods: {
		async choose() {
			const files = await pickFiles('.pdf,application/pdf', false)
			if (!files.length) return
			const f = files[0]
			const bytes = await readFileBytes(f)
			try {
				const pageCount = await getPdfPageCount(bytes)
				const thumbs = await getPdfThumbnails(bytes, Math.min(pageCount, 8))
				this.file = { name: f.name, bytes, pageCount, sizeText: formatSize(f.size) }
				this.thumbs = thumbs.filter(Boolean)
				this.ranges = `1-${pageCount}`
				this.results = []
			} catch (e) {
				uni.showModal({ title: '无法读取', content: String((e && e.message) || e), showCancel: false })
			}
		},
		async generate() {
			this.busy = true
			this.progress = 0
			this.results = []
			try {
				const list = await splitPdf(this.file.bytes, this.ranges, baseName(this.file.name), (p) => (this.progress = p))
				this.results = list.map((r) => ({ ...r, sizeText: formatSize(r.bytes.length) }))
			} catch (e) {
				uni.showModal({ title: '拆分失败', content: String((e && e.message) || e), showCancel: false })
			} finally {
				this.busy = false
			}
		},
		downloadOne(i) {
			const r = this.results[i]
			downloadBytes(r.bytes, r.name, 'application/pdf')
		},
		async downloadAll() {
			for (let i = 0; i < this.results.length; i++) {
				this.downloadOne(i)
				await new Promise((res) => setTimeout(res, 400))
			}
		},
	},
}
</script>

<style>
.thumb-scroll {
	margin-top: 20rpx;
	white-space: nowrap;
}

.thumb-row {
	display: flex;
}

.thumb-img {
	width: 120rpx;
	height: 160rpx;
	flex-shrink: 0;
	margin-right: 12rpx;
	border-radius: 8rpx;
	background: #f3f4f6;
}
</style>
