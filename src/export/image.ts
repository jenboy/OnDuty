'use client';

/**
 * 图片导出：html-to-image 对日历 DOM 截图。
 *
 * 踩过的坑（两次）：
 * 1. 旧实现用 html2canvas，在 Tailwind 4 的 oklch 颜色下直接失败 → 换 html-to-image；
 * 2. 试图用 `options.style` 给导出图加内边距：html-to-image 先按 options.width/height
 *    （缺省取原节点尺寸）定画布，再把 style 应用到克隆节点；克隆节点按 content-box 处理，
 *    于是「width=678 + padding 16×2」把网格排到 694px，画布只到 678 —— 最右一列被切。
 *    现在**完全不注入样式**：画布 = 节点自身的盒子，边距一律由 DOM 提供（见详情页的 p-3），
 *    这样"节点里有的东西"一定能完整落到图上。
 */
import { toPng } from 'html-to-image';
import { downloadBlob } from '@/lib/download';
import { exportFilename } from './shared';

export async function exportNodeToPng(node: HTMLElement, filenameBase: string, now: Date = new Date()): Promise<void> {
  const width = node.scrollWidth;
  const height = node.scrollHeight;
  if (width === 0 || height === 0) throw new Error('日历还没渲染完成，请稍后再试');

  const dataUrl = await toPng(node, {
    width,
    height,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  downloadBlob(exportFilename(filenameBase, 'png', now), blob);
}
