import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['static/icons/favicon.svg'],
      manifest: {
        name: 'PDF 工具箱',
        short_name: 'PDF工具箱',
        description: '常用 PDF 处理工具：图片转PDF、PDF合并、PDF拆分、去水印、加水印、PDF转图片，全部本地处理。',
        theme_color: '#2f6bff',
        background_color: '#f5f7fa',
        display: 'standalone',
        lang: 'zh-CN',
        start_url: '.',
        icons: [
          {
            src: 'static/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'static/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'static/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // pdf.worker 以 .mjs 输出，默认 glob 不包含，需显式加入
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024
      }
    })
  ]
})
