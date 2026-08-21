import { useCallback, useRef, useState } from 'hono/jsx';

export interface ToastState {
  message: string;
  isError: boolean;
  key: number;
}

export function useToast() {
  const [state, setState] = useState<ToastState | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const show = useCallback((message: string, isError = false) => {
    window.clearTimeout(timerRef.current);
    setState((prev) => ({ message, isError, key: (prev?.key ?? 0) + 1 }));
    timerRef.current = window.setTimeout(() => setState(null), 2600);
  }, []);

  return { state, show };
}
