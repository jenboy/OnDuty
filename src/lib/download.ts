/** 浏览器下载工具（替代 file-saver，少一个依赖） */

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 交给下一帧释放，避免部分浏览器还没开始下载就被回收
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTextFile(filename: string, text: string, mime = 'application/json'): void {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}

/** 去掉文件名里不能用的字符 */
export function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\n\r\t]/g, '_').trim() || '值日表';
}
