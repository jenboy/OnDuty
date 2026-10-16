'use client';

/**
 * 图片导出：html-to-image 对日历 DOM 截图。
 *
 * 两个坑都踩过：
 * 1. html-to-image 按「原节点的尺寸」开画布，再把你给的 style 应用到克隆节点。
 *    之前只给了 `padding: 16px`（没给 width/height），内边距把内容挤得比画布宽，
 *    导出图右侧被裁掉一列 —— 所以这里显式传 width/height 并声明 border-box；
 * 2. 旧实现用 html2canvas，在 Tailwind 4 的 oklch 颜色下会直接失败。
 */
import { toPng } from 'html-to-image';
import { downloadBlob } from '@/lib/download';
import { exportFilename } from './shared';

const PADDING = 16;

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
    style: {
      // 显式盒模型 + 固定尺寸，保证内边距算在画布之内而不是把内容顶出去
      boxSizing: 'border-box',
      width: `${width}px`,
      height: `${height}px`,
      padding: `${PADDING}px`,
      margin: '0',
      background: '#ffffff',
    },
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  downloadBlob(exportFilename(filenameBase, 'png', now), blob);
}
