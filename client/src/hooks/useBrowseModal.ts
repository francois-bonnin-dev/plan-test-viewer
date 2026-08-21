import { useCallback, useState } from 'hono/jsx';
import type { BrowseDirEntry } from '../../../src/api-types.js';
import { api } from '../api/client.js';

export interface UseBrowseModalOptions {
  onToast: (message: string, isError?: boolean) => void;
}

export function useBrowseModal(opts: UseBrowseModalOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [path, setPath] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);
  const [dirs, setDirs] = useState<BrowseDirEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useCallback(
    async (target: string) => {
      setLoading(true);
      try {
        const res = await api.browse(target);
        setPath(res.path);
        setParent(res.parent);
        setDirs(res.dirs);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        opts.onToast(`Impossible de parcourir ce dossier : ${message}`, true);
      } finally {
        setLoading(false);
      }
    },
    [opts]
  );

  const open = useCallback(
    (startPath: string) => {
      setIsOpen(true);
      void navigate(startPath);
    },
    [navigate]
  );

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, path, parent, dirs, loading, open, close, navigate };
}
