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
			<view class="hint">去水印 = 删除 PDF 中的水印图片对象（带透明蒙版、跨页重复出现的图片，以及 Watermark 注释），不做栅格化，正文文字与排版保持原样。</view>
		</view>

		<view class="card">
			<button class="btn-primary" :disabled="!file || busy" @tap="detect">
				{{ busy ? '处理中…' : file && !candidates.length && !detected ? '识别水印' : '重新识别' }}
			</button>
			<view v-if="busy" class="progress-wrap">
				<view class="progress-bar"><view class="progress-inner" :style="{ width: progress * 100 + '%' }"></view></view>
				<view class="progress-text">{{ Math.round(progress * 100) }}%</view>
			</view>
		</view>

		<view v-if="detected && !candidates.length" class="card">
			<view class="hint">未检测到水印图片对象。该文件可能没有可结构化删除的水印（例如水印是直接绘制在页面内容里的普通图片）。</view>
		</view>

		<view v-if="candidates.length" class="card">
			<view class="row-between">
				<view class="card-title" style="margin-bottom: 0">候选水印（{{ candidates.length }} 个）</view>
				<text class="hint">点击条目可勾选/取消</text>
			</view>
			<view v-for="c in candidates" :key="c.id" class="cand" :class="{ on: c.checked }" @tap="c.checked = !c.checked">
				<view class="cand-check">{{ c.checked ? '✓' : '' }}</view>
				<image v-if="c.preview" class="cand-img" :src="c.preview" mode="aspectFit" />
				<view v-else class="cand-img cand-img-empty"><text>{{ c.type === 'annot' ? '注释' : '无预览' }}</text></view>
				<view class="cand-info">
					<text class="cand-reason">{{ c.reason }}</text>
					<text class="cand-pages">第 {{ c.pages.join('、') }} 页<text v-if="c.width"> · {{ c.width }}×{{ c.height }}</text></text>
				</view>
			</view>
			<button class="btn-primary" style="margin-top: 24rpx" :disabled="busy || !checkedIds.length" @tap="remove">
				删除所选并生成（{{ checkedIds.length }} 个）
			</button>
		</view>

		<view v-if="result" class="card">
			<view class="card-title">结果预览（首页）</view>
			<image v-if="preview" class="preview-img" :src="preview" mode="widthFix" />
			<view class="result-item">
				<text class="file-name">{{ result.name }}（{{ result.sizeText }}）</text>
				<button class="mini-btn" @tap="download">下载</button>
			</view>
		</view>
	</view>
</template>

<script>
import { pickFiles, readFileBytes, downloadBytes, formatSize, baseName } from '../../utils/file'
import { getPdfThumbnails } from '../../utils/pdfjs'
import { detectWatermarks, removeWatermarks } from '../../utils/watermark-remove'

export default {
	data() {
		return {
			file: null,
			candidates: [],
			detected: false,
			busy: false,
			progress: 0,
			result: null,
			preview: '',
		}
	},
	computed: {
		checkedIds() {
			return this.candidates.filter((c) => c.checked).map((c) => c.id)
		},
	},
	methods: {
		async choose() {
			const files = await pickFiles('.pdf,application/pdf', false)
			if (!files.length) return
			const f = files[0]
			try {
				const bytes = await readFileBytes(f)
				this.file = { name: f.name, bytes, sizeText: formatSize(f.size) }
				this.candidates = []
				this.detected = false
				this.result = null
				this.preview = ''
				await this.detect()
			} catch (e) {
				uni.showModal({ title: '无法读取', content: String((e && e.message) || e), showCancel: false })
			}
		},
		async detect() {
			this.busy = true
			this.progress = 0
			this.result = null
			this.preview = ''
			try {
				const { candidates, pageCount } = await detectWatermarks(this.file.bytes)
				this.file.pageCount = pageCount
				this.candidates = candidates
				this.detected = true
			} catch (e) {
				uni.showModal({ title: '识别失败', content: String((e && e.message) || e), showCancel: false })
			} finally {
				this.busy = false
			}
		},
		async remove() {
			this.busy = true
			this.progress = 0
			try {
				const bytes = await removeWatermarks(this.file.bytes, this.checkedIds, (p) => (this.progress = p))
				const name = `${baseName(this.file.name)}_已去水印.pdf`
				this.result = { bytes, name, sizeText: formatSize(bytes.length) }
				this.preview = (await getPdfThumbnails(bytes, 1, 600))[0] || ''
			} catch (e) {
				uni.showModal({ title: '删除失败', content: String((e && e.message) || e), showCancel: false })
			} finally {
				this.busy = false
			}
		},
		download() {
			if (this.result) downloadBytes(this.result.bytes, this.result.name, 'application/pdf')
		},
	},
}
</script>

<style>
.cand {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f0f1f3;
}

.cand:last-of-type {
	border-bottom: none;
}

.cand-check {
	width: 48rpx;
	height: 48rpx;
	border-radius: 10rpx;
	border: 2rpx solid #d1d5db;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ffffff;
	font-size: 30rpx;
	flex-shrink: 0;
	margin-right: 20rpx;
}

.cand.on .cand-check {
	background: #2f6bff;
	border-color: #2f6bff;
}

.cand-img {
	width: 88rpx;
	height: 88rpx;
	border-radius: 8rpx;
	background: #f3f4f6;
	flex-shrink: 0;
}

.cand-img-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20rpx;
	color: #9ca3af;
}

.cand-info {
	flex: 1;
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
}

.cand-reason {
	font-size: 26rpx;
	color: #374151;
}

.cand-pages {
	font-size: 22rpx;
	color: #9ca3af;
	margin-top: 6rpx;
}
</style>
