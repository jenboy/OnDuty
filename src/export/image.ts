'use client';

/**
 * 图片导出：html-to-image 对日历 DOM 截图。
 * 旧实现用 html2canvas，它在 Tailwind 4（oklch 颜色）下会直接失败，
 * 而且和 useCORS/allowTaint 的组合会让 toDataURL 抛 SecurityError。
 */
import { toPng } from 'html-to-image';
import { downloadBlob } from '@/lib/download';
import { exportFilename } from './shared';

export async function exportNodeToPng(node: HTMLElement, filenameBase: string, now: Date = new Date()): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    style: { padding: '16px', background: '#ffffff' },
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  downloadBlob(exportFilename(filenameBase, 'png', now), blob);
}
