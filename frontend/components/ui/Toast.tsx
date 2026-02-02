'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ToastProps {
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  duration?: number;
  onClose?: () => void;
}

interface ToastItem extends ToastProps {
  id: number;
}

// Toast state management
let toastId = 0;
const toastListeners: Set<(toasts: ToastItem[]) => void> = new Set();
let currentToasts: ToastItem[] = [];

function notifyListeners() {
  toastListeners.forEach(listener => listener([...currentToasts]));
}

/**
 * Show a toast notification
 */
export function showToast(props: ToastProps): number {
  const id = ++toastId;
  const newToast: ToastItem = { ...props, id };
  currentToasts = [...currentToasts, newToast];
  notifyListeners();

  // Auto-remove after duration
  const duration = props.duration ?? 3000;
  setTimeout(() => {
    dismissToast(id);
  }, duration);

  return id;
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(id: number) {
  currentToasts = currentToasts.filter(t => t.id !== id);
  notifyListeners();
}

// Individual Toast Component
function ToastNotification({ toastItem, onDismiss }: { toastItem: ToastItem; onDismiss: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
      toastItem.onClose?.();
    }, 200);
  }, [onDismiss, toastItem]);

  const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-700',
      icon: '❌'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      border: 'border-amber-200 dark:border-amber-700',
      icon: '⚠️'
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-700',
      icon: '✅'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-700',
      icon: 'ℹ️'
    },
  };

  const style = typeStyles[toastItem.type || 'info'];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${style.bg} ${style.border}
        transform transition-all duration-200
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <span className="text-lg">{style.icon}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-white">
        {toastItem.message}
      </span>
      <button
        onClick={handleDismiss}
        className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Hook to subscribe to toast updates
 */
function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>(currentToasts);

  useEffect(() => {
    const handleUpdate = (newToasts: ToastItem[]) => {
      setToasts(newToasts);
    };

    toastListeners.add(handleUpdate);

    return () => {
      toastListeners.delete(handleUpdate);
    };
  }, []);

  return toasts;
}

/**
 * Toast Container - renders all active toasts
 * Place this once at the app root level
 * Renders inline (fixed position) instead of using portal
 */
export function ToastContainer() {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm"
      aria-live="polite"
    >
      {toasts.map(toastItem => (
        <ToastNotification
          key={toastItem.id}
          toastItem={toastItem}
          onDismiss={() => dismissToast(toastItem.id)}
        />
      ))}
    </div>
  );
}

// Convenience functions
export const toast = {
  error: (message: string, duration?: number) => showToast({ message, type: 'error', duration }),
  warning: (message: string, duration?: number) => showToast({ message, type: 'warning', duration }),
  success: (message: string, duration?: number) => showToast({ message, type: 'success', duration }),
  info: (message: string, duration?: number) => showToast({ message, type: 'info', duration }),
};

