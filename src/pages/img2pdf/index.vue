<template>
	<view class="tool-page">
		<view class="card">
			<view class="card-title">选择图片</view>
			<button class="btn-ghost" @tap="choose">添加图片</button>
			<view v-if="items.length" class="hint" style="margin-top: 16rpx">共 {{ items.length }} 张，列表顺序即页序</view>
			<view v-for="(it, i) in items" :key="it.id" class="file-item">
				<image class="file-thumb" :src="it.url" mode="aspectFill" />
				<view class="file-name">
					<text>{{ it.name }}</text>
					<text class="file-size">{{ it.sizeText }}</text>
				</view>
				<view class="file-actions">
					<button class="mini-btn" :disabled="i === 0" @tap="moveUp(i)">上移</button>
					<button class="mini-btn" :disabled="i === items.length - 1" @tap="moveDown(i)">下移</button>
					<button class="mini-btn danger" @tap="removeAt(i)">删除</button>
				</view>
			</view>
			<view v-if="!items.length" class="hint">支持 JPG / PNG / WebP 等，可多选。</view>
		</view>

		<view class="card">
			<view class="card-title">参数</view>
			<view class="label">页面大小</view>
			<view class="seg">
				<view class="seg-item" :class="{ active: pageSize === 'a4' }" @tap="pageSize = 'a4'">A4</view>
				<view class="seg-item" :class="{ active: pageSize === 'original' }" @tap="pageSize = 'original'">按图片尺寸</view>
			</view>
			<template v-if="pageSize === 'a4'">
				<view class="label">方向</view>
				<view class="seg">
					<view
						v-for="o in orientations"
						:key="o.value"
						class="seg-item"
						:class="{ active: orientation === o.value }"
						@tap="orientation = o.value"
					>{{ o.label }}</view>
				</view>
			</template>
			<view class="label">页边距：{{ margin }} pt</view>
			<slider :value="margin" :min="0" :max="60" :step="5" activeColor="#2f6bff" @change="onMargin" />
		</view>

		<view class="card">
			<button class="btn-primary" :disabled="!items.length || busy" @tap="generate">
				{{ busy ? '处理中…' : '生成 PDF' }}
			</button>
			<view v-if="busy" class="progress-wrap">
				<view class="progress-bar"><view class="progress-inner" :style="{ width: progress * 100 + '%' }"></view></view>
				<view class="progress-text">{{ Math.round(progress * 100) }}%</view>
			</view>
			<view v-if="result" class="result-item">
				<text class="file-name">{{ result.name }}（{{ result.sizeText }}）</text>
				<button class="mini-btn" @tap="download">下载</button>
			</view>
		</view>
	</view>
</template>

<script>
import { pickFiles, downloadBytes, formatSize, baseName } from '../../utils/file'
import { imagesToPdf } from '../../utils/pdf-ops'

let uid = 1

export default {
	data() {
		return {
			items: [],
			pageSize: 'a4',
			orientation: 'auto',
			orientations: [
				{ value: 'auto', label: '自动' },
				{ value: 'portrait', label: '纵向' },
				{ value: 'landscape', label: '横向' },
			],
			margin: 20,
			busy: false,
			progress: 0,
			result: null,
		}
	},
	methods: {
		async choose() {
			const files = await pickFiles('image/*', true)
			for (const f of files) {
				this.items.push({
					id: uid++,
					file: f,
					name: f.name,
					sizeText: formatSize(f.size),
					url: URL.createObjectURL(f),
				})
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
			const [it] = this.items.splice(i, 1)
			if (it) URL.revokeObjectURL(it.url)
		},
		onMargin(e) {
			this.margin = e.detail.value
		},
		async generate() {
			this.busy = true
			this.progress = 0
			this.result = null
			try {
				const bytes = await imagesToPdf(
					this.items.map((it) => it.file),
					{ pageSize: this.pageSize, orientation: this.orientation, margin: this.margin },
					(p) => (this.progress = p)
				)
				const name = `${baseName(this.items[0].name)}_共${this.items.length}页.pdf`
				this.result = { bytes, name, sizeText: formatSize(bytes.length) }
			} catch (e) {
				uni.showModal({ title: '生成失败', content: String((e && e.message) || e), showCancel: false })
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
