// H5 PWA 安装辅助：捕获 beforeinstallprompt、判断平台与运行模式

let deferredPrompt = null

export function initPwaInstall() {
	if (typeof window === 'undefined') return
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault()
		deferredPrompt = e
	})
	window.addEventListener('appinstalled', () => {
		deferredPrompt = null
	})
}

// 是否已作为独立应用运行（已安装）
export function isStandalone() {
	if (typeof window === 'undefined') return false
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		window.navigator.standalone === true ||
		document.referrer.startsWith('android-app://')
	)
}

export function isIOS() {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent || ''
	return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1)
}

// 微信内置浏览器（无法安装 PWA，需引导用系统浏览器打开）
export function isWeChat() {
	if (typeof navigator === 'undefined') return false
	return /MicroMessenger/i.test(navigator.userAgent || '')
}

// 是否可以直接调起浏览器原生安装弹窗（Android Edge/Chrome）
export function canPromptInstall() {
	return !!deferredPrompt
}

// 返回 'accepted' | 'dismissed' | 'unavailable'
export async function promptInstall() {
	if (!deferredPrompt) return 'unavailable'
	deferredPrompt.prompt()
	const { outcome } = await deferredPrompt.userChoice
	deferredPrompt = null
	return outcome
}
