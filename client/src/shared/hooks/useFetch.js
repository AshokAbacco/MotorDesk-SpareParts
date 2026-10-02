import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * const { data, meta, loading, error, reload } = useFetch(() => getThings(params), [params])
 * Ignores stale responses when deps change quickly (e.g. typing in search).
 */
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const callId = useRef(0);

  const run = useCallback(async () => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetcher();
      if (id === callId.current) setState({ data: res.data, meta: res.meta ?? null, loading: false, error: null });
    } catch (err) {
      if (id === callId.current) setState((s) => ({ ...s, loading: false, error: err.message }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
