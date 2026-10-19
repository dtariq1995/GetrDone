import { useSyncExternalStore } from 'react';

// A tiny store for error toasts. It lives outside React so non-component code
// (the query client's global error handler) can show a toast too.

export type Toast = { id: number; message: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function showErrorToast(message: string) {
  const toast = { id: nextId++, message };
  toasts = [...toasts, toast];
  emit();
  setTimeout(() => dismissToast(toast.id), 5000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Re-renders the component whenever the toast list changes.
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, () => toasts);
}
