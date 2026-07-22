'use client';

import * as React from 'react';
import { CheckCircle, XCircle, Warning, Info, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, title?: string) => void;
}

const ToastContext = React.createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

const icons = {
  success: <CheckCircle size={18} className="text-emerald-500" />,
  error: <XCircle size={18} className="text-red-500" />,
  warning: <Warning size={18} className="text-amber-500" />,
  info: <Info size={18} className="text-blue-500" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message, title }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl shadow-lg p-4 min-w-[300px] max-w-[400px]"
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              {t.title && <p className="text-sm font-semibold text-slate-900">{t.title}</p>}
              <p className="text-sm text-slate-600">{t.message}</p>
            </div>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
