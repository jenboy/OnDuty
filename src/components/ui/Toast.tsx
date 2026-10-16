'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{ push: (kind: ToastKind, message: string) => void } | null>(null);

/** 导出失败、迁移完成这类结果必须有出口 —— 旧代码只 console.error，用户什么都看不到 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
} as const;

const STYLES: Record<ToastKind, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list, { id, kind, message }]);
      // 错误信息留久一点，方便用户读完
      setTimeout(() => remove(id), kind === 'error' ? 8000 : 4000);
    },
    [remove]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2" role="status" aria-live="polite">
        {items.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <div
              key={item.id}
              className={cn('pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg', STYLES[item.kind])}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 break-words">{item.message}</span>
              <button
                type="button"
                aria-label="关闭提示"
                onClick={() => remove(item.id)}
                className="rounded p-0.5 hover:bg-black/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
