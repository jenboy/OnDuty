'use client';

/**
 * 弹窗：Headless UI 的 Dialog 负责焦点圈定、Esc 关闭、aria-modal 与背景滚动锁 ——
 * 旧代码三个弹窗各写一遍遮罩，既没有这些行为，交互还不一致（有的点遮罩关、有的不关）。
 */
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { cn } from '@/lib/cn';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className={cn('w-full rounded-xl bg-white shadow-xl', width)}>
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4">
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">{title}</DialogTitle>
              {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
            </div>
            <IconButton label="关闭" icon={<X className="h-5 w-5" />} onClick={onClose} />
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-gray-200 p-4">{footer}</div>}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/** 二次确认（替代原生 confirm：可定制、可聚焦、能显示细节） */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确定',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-gray-600">{message}</div>
    </Modal>
  );
}
