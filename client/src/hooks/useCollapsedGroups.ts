import { useCallback, useState } from 'hono/jsx';

export function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expand = useCallback((key: string) => {
    setCollapsed((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const collapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const reset = useCallback((keys: Iterable<string>) => setCollapsed(new Set(keys)), []);

  return { collapsed, toggle, expand, collapse, reset };
}
