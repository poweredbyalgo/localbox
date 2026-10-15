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
			<view class="card-title">水印内容</view>
			<view class="seg">
				<view class="seg-item" :class="{ active: mode === 'text' }" @tap="mode = 'text'">文字</view>
				<view class="seg-item" :class="{ active: mode === 'image' }" @tap="mode = 'image'">图片</view>
			</view>
			<template v-if="mode === 'text'">
				<view class="label">水印文字</view>
				<input class="input" v-model="text" placeholder="例如：机密文件" />
			</template>
			<template v-else>
				<view class="label">水印图片</view>
				<view class="row">
					<button class="btn-ghost" style="flex:1" @tap="chooseImage">{{ imageFile ? imageFile : '选择图片' }}</button>
					<button v-if="imageBytes" class="mini-btn danger" @tap="clearImage">清除</button>
				</view>
				<image v-if="imageURL" class="mark-img" :src="imageURL" mode="aspectFit" />
			</template>
			<view class="label">布局</view>
			<view class="seg">
				<view class="seg-item" :class="{ active: layout === 'tile' }" @tap="layout = 'tile'">平铺</view>
				<view class="seg-item" :class="{ active: layout === 'center' }" @tap="layout = 'center'">居中</view>
			</view>
			<view class="label">颜色</view>
			<view class="row color-row">
				<view
					v-for="c in colorPresets"
					:key="c"
					class="color-dot"
					:class="{ active: color === c }"
					:style="{ backgroundColor: c }"
					@tap="color = c"
				></view>
				<input class="input color-input" v-model="color" placeholder="#9ca3af" />
			</view>
			<view class="label">透明度：{{ opacity }}%</view>
			<slider :value="opacity" :min="5" :max="100" :step="5" activeColor="#2f6bff" @change="(e) => (opacity = e.detail.value)" />
			<view class="label">倾斜角度：{{ angle }}°</view>
			<slider :value="angle" :min="-90" :max="90" :step="5" activeColor="#2f6bff" @change="(e) => (angle = e.detail.value)" />
			<view class="label">大小：{{ size }} pt</view>
			<slider :value="size" :min="16" :max="120" :step="4" activeColor="#2f6bff" @change="(e) => (size = e.detail.value)" />
		</view>

		<view class="card">
			<button class="btn-primary" :disabled="!file || busy" @tap="generate">
				{{ busy ? '处理中…' : '生成预览' }}
			</button>
			<image v-if="preview" class="preview-img" :src="preview" mode="widthFix" />
			<view v-if="result" class="result-item">
				<text class="file-name">{{ result.name }}（{{ result.sizeText }}）</text>
				<button class="mini-btn" @tap="download">下载</button>
			</view>
		</view>
	</view>
</template>

<script>
import { pickFiles, readFileBytes, downloadBytes, formatSize, baseName } from '../../utils/file'
import { getPdfThumbnails, getPdfPageCount } from '../../utils/pdfjs'
import { addWatermark } from '../../utils/watermark-add'

export default {
	data() {
		return {
			file: null,
			mode: 'text',
			text: '机密',
			imageBytes: null,
			imageURL: '',
			imageFile: '',
			color: '#9ca3af',
			colorPresets: ['#9ca3af', '#ef4444', '#2f6bff', '#111827'],
			opacity: 25,
			angle: 30,
			size: 48,
			layout: 'tile',
			busy: false,
			result: null,
			preview: '',
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
				this.result = null
				this.preview = ''
			} catch (e) {
				uni.showModal({ title: '无法读取', content: String((e && e.message) || e), showCancel: false })
			}
		},
		async chooseImage() {
			const files = await pickFiles('image/*', false)
			if (!files.length) return
			const f = files[0]
			this.imageBytes = await readFileBytes(f)
			this.imageFile = f.name
			if (this.imageURL) URL.revokeObjectURL(this.imageURL)
			this.imageURL = URL.createObjectURL(f)
		},
		clearImage() {
			this.imageBytes = null
			this.imageFile = ''
			if (this.imageURL) URL.revokeObjectURL(this.imageURL)
			this.imageURL = ''
		},
		async generate() {
			this.busy = true
			this.result = null
			this.preview = ''
			try {
				const bytes = await addWatermark(this.file.bytes, {
					mode: this.mode,
					text: this.text,
					imageBytes: this.imageBytes,
					color: this.color,
					opacity: this.opacity / 100,
					angle: this.angle,
					size: this.size,
					layout: this.layout,
				})
				const name = `${baseName(this.file.name)}_已加水印.pdf`
				this.result = { bytes, name, sizeText: formatSize(bytes.length) }
				this.preview = (await getPdfThumbnails(bytes, 1, 600))[0] || ''
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

<style>
.color-row {
	flex-wrap: wrap;
}

.color-dot {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	margin-right: 16rpx;
	border: 4rpx solid transparent;
}

.color-dot.active {
	border-color: #2f6bff;
}

.color-input {
	flex: 1;
	min-width: 200rpx;
}

.mark-img {
	width: 200rpx;
	height: 200rpx;
	background: #f3f4f6;
	border-radius: 12rpx;
	margin-top: 16rpx;
}
</style>
