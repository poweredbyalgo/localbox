<script>
import { initPwaInstall } from '@/utils/pwa-install.js'

export default {
  onLaunch: function () {
    // #ifdef H5
    initPwaInstall()
    // #endif
  },
  onShow: function () {},
  onHide: function () {},
}
</script>

<style>
page {
  background-color: #f5f7fa;
  font-size: 28rpx;
  color: #1f2937;
}

/* 工具页通用布局 */
.tool-page {
  padding: 24rpx;
  box-sizing: border-box;
  min-height: 100vh;
}

.card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 10rpx rgba(31, 41, 55, 0.05);
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: #111827;
}

.hint {
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.6;
}

.btn-primary {
  background: #2f6bff;
  color: #ffffff;
  border-radius: 14rpx;
  font-size: 30rpx;
  padding: 22rpx 0;
  text-align: center;
  border: none;
  line-height: 1.4;
}

.btn-primary[disabled] {
  background: #b9cbff;
  color: #ffffff;
}

.btn-ghost {
  background: #eef2ff;
  color: #2f6bff;
  border-radius: 14rpx;
  font-size: 28rpx;
  padding: 18rpx 0;
  text-align: center;
  border: none;
  line-height: 1.4;
}

.btn-ghost[disabled] {
  color: #9ca3af;
  background: #f3f4f6;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}

.file-item:last-child {
  border-bottom: none;
}

.file-thumb {
  width: 88rpx;
  height: 110rpx;
  border-radius: 8rpx;
  background: #f3f4f6;
  flex-shrink: 0;
  object-fit: cover;
}

.file-name {
  flex: 1;
  margin-left: 20rpx;
  font-size: 26rpx;
  color: #374151;
  word-break: break-all;
}

.file-size {
  color: #9ca3af;
  font-size: 22rpx;
}

.file-actions {
  display: flex;
  flex-direction: column;
  margin-left: 16rpx;
}

.mini-btn {
  font-size: 22rpx;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 8rpx;
  padding: 6rpx 16rpx;
  margin: 4rpx 0;
  border: none;
  line-height: 1.4;
}

.mini-btn.danger {
  color: #ef4444;
  background: #fef2f2;
}

.row {
  display: flex;
  align-items: center;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-size: 26rpx;
  color: #374151;
  margin: 16rpx 0 8rpx;
}

.input {
  border: 1rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
  background: #fafbfc;
}

.progress-wrap {
  margin-top: 20rpx;
}

.progress-bar {
  height: 12rpx;
  background: #e5e7eb;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: #2f6bff;
  border-radius: 6rpx;
  transition: width 0.2s;
}

.progress-text {
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 8rpx;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}

.result-item:last-child {
  border-bottom: none;
}

/* 分段选择器 */
.seg {
  display: flex;
  background: #f3f4f6;
  border-radius: 12rpx;
  padding: 6rpx;
  margin-top: 8rpx;
}

.seg-item {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #6b7280;
  padding: 14rpx 0;
  border-radius: 10rpx;
}

.seg-item.active {
  background: #ffffff;
  color: #2f6bff;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(31, 41, 55, 0.08);
}

/* 结果预览大图 */
.preview-img {
  width: 100%;
  border-radius: 12rpx;
  background: #f3f4f6;
  margin-top: 20rpx;
}

</style>
