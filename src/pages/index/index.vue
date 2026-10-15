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
		<!-- #ifdef H5 -->
		<view v-if="!installed" class="install-bar">
			<view class="install-btn" hover-class="install-btn-hover" @tap="onInstall">
				<text class="install-btn-text">＋ 添加到主屏幕，离线可用</text>
			</view>
		</view>
		<view v-else class="hint footer">已安装为应用，可离线使用。</view>
		<!-- #endif -->

		<!-- 安装指引弹窗 -->
		<view v-if="showGuide" class="mask" @tap="showGuide = false">
			<view class="guide-card" @tap.stop>
				<text class="guide-title">{{ guideTitle }}</text>
				<view class="guide-steps">
					<text v-for="(s, i) in guideSteps" :key="i" class="guide-step">{{ i + 1 }}. {{ s }}</text>
				</view>
				<view class="guide-btn" hover-class="install-btn-hover" @tap="showGuide = false">
					<text class="guide-btn-text">知道了</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
// #ifdef H5
import { isStandalone, isIOS, isWeChat, canPromptInstall, promptInstall } from '@/utils/pwa-install.js'
// #endif

export default {
	data() {
		return {
			installed: false,
			showGuide: false,
			guidePlatform: '',
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
	computed: {
		guideTitle() {
			if (this.guidePlatform === 'wechat') return '请在系统浏览器中打开'
			if (this.guidePlatform === 'ios') return 'iPhone / iPad 安装方法'
			return '安装到主屏幕'
		},
		guideSteps() {
			if (this.guidePlatform === 'wechat') {
				return [
					'点右上角 ··· 菜单',
					'选择「在浏览器打开」（安卓选 Chrome/Edge，苹果选 Safari）',
					'再回到本页点「添加到主屏幕」',
				]
			}
			if (this.guidePlatform === 'ios') {
				return [
					'iOS 只有 Safari 支持安装，微信/Edge/Chrome 内都不行',
					'用 Safari 打开本页面',
					'点底部 分享 按钮',
					'选择「添加到主屏幕」即可',
				]
			}
			return [
				'Edge：点右下角 ··· 菜单 → 「应用」→「将此网站安装为应用」',
				'Chrome：点右上角 ⋮ 菜单 → 「添加到主屏幕」/「安装应用」',
			]
		},
	},
	onShow() {
		// #ifdef H5
		this.installed = isStandalone()
		// #endif
	},
	methods: {
		go(url) {
			uni.navigateTo({ url })
		},
		// #ifdef H5
		async onInstall() {
			if (isWeChat()) {
				this.guidePlatform = 'wechat'
				this.showGuide = true
				return
			}
			if (canPromptInstall()) {
				const outcome = await promptInstall()
				if (outcome === 'accepted') {
					uni.showToast({ title: '已添加到主屏幕', icon: 'success' })
					this.installed = true
				}
				return
			}
			this.guidePlatform = isIOS() ? 'ios' : 'android'
			this.showGuide = true
		},
		// #endif
		}
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

.install-bar {
	margin-top: 16rpx;
}

.install-btn {
	background: linear-gradient(135deg, #2f6bff, #0ea5e9);
	border-radius: 16rpx;
	padding: 26rpx 0;
	text-align: center;
	box-shadow: 0 6rpx 18rpx rgba(47, 107, 255, 0.3);
}

.install-btn-hover {
	opacity: 0.85;
	transform: scale(0.98);
}

.install-btn-text {
	color: #ffffff;
	font-size: 30rpx;
	font-weight: 600;
}

.mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(17, 24, 39, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
	padding: 48rpx;
}

.guide-card {
	width: 100%;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 40rpx 36rpx;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.guide-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #111827;
	margin-bottom: 24rpx;
}

.guide-steps {
	display: flex;
	flex-direction: column;
}

.guide-step {
	font-size: 27rpx;
	color: #374151;
	line-height: 1.7;
	margin-bottom: 12rpx;
}

.guide-btn {
	margin-top: 28rpx;
	background: #2f6bff;
	border-radius: 14rpx;
	padding: 20rpx 0;
	text-align: center;
}

.guide-btn-text {
	color: #ffffff;
	font-size: 28rpx;
}
</style>
