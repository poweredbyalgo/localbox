<template>
	<view class="home">
		<view class="hero">
			<text class="hero-title">PDF 工具箱</text>
			<text class="hero-sub">图片转PDF · 合并 · 拆分 · 水印 · 转图片，全部在浏览器本地处理，文件不上传</text>
		</view>
		<view class="grid">
			<view
				v-for="t in tools"
				:key="t.url"
				class="tool-card"
				hover-class="tool-card-hover"
				@tap="go(t.url)"
			>
				<view class="tool-icon" :style="{ backgroundColor: t.color }">
					<text class="tool-icon-text">{{ t.badge }}</text>
				</view>
				<text class="tool-name">{{ t.name }}</text>
				<text class="tool-desc">{{ t.desc }}</text>
			</view>
		</view>
		<view class="hint footer">添加到主屏幕后可离线使用（PWA）。</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			tools: [
				{ name: '图片转 PDF', desc: '多张图片合成一个 PDF', badge: '图', color: '#2f6bff', url: '/pages/img2pdf/index' },
				{ name: 'PDF 合并', desc: '多个 PDF 按顺序拼接', badge: '合', color: '#0ea5e9', url: '/pages/merge/index' },
				{ name: 'PDF 拆分', desc: '按页码范围拆成多个文件', badge: '拆', color: '#8b5cf6', url: '/pages/split/index' },
				{ name: 'PDF 加水印', desc: '文字/图片水印，平铺或居中', badge: '加', color: '#f59e0b', url: '/pages/add-mark/index' },
				{ name: 'PDF 去水印', desc: '删除 PDF 中的水印图片对象', badge: '去', color: '#10b981', url: '/pages/remove-mark/index' },
				{ name: 'PDF 转图片', desc: '逐页导出 JPG / PNG', badge: '转', color: '#ef4444', url: '/pages/pdf2img/index' },
			],
		}
	},
	methods: {
		go(url) {
			uni.navigateTo({ url })
		},
	},
}
</script>

<style>
.home {
	padding: 32rpx 24rpx;
}

.hero {
	padding: 24rpx 8rpx 40rpx;
	display: flex;
	flex-direction: column;
}

.hero-title {
	font-size: 48rpx;
	font-weight: 700;
	color: #111827;
}

.hero-sub {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #6b7280;
	line-height: 1.6;
}

.grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
}

.tool-card {
	width: 48.5%;
	box-sizing: border-box;
	background: #ffffff;
	border-radius: 20rpx;
	padding: 28rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 10rpx rgba(31, 41, 55, 0.05);
	display: flex;
	flex-direction: column;
}

.tool-card-hover {
	transform: scale(0.98);
	box-shadow: 0 4rpx 16rpx rgba(31, 41, 55, 0.12);
}

.tool-icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 20rpx;
}

.tool-icon-text {
	color: #ffffff;
	font-size: 40rpx;
	font-weight: 700;
}

.tool-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #111827;
}

.tool-desc {
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #9ca3af;
	line-height: 1.5;
}

.footer {
	text-align: center;
	margin-top: 8rpx;
}
</style>
