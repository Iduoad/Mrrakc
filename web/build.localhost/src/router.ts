import { useEffect, useState } from 'react';

/**
 * The whole router. Routes are hash paths so no dev-server rewrite rules are
 * needed and every link is a plain anchor:
 *
 *   #/                    the data-type directory
 *   #/<dataType>          the tools available for that data type
 *   #/<dataType>/<tool>   a tool
 */
export function useRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export const href = (...segments: string[]) => `#/${segments.join('/')}`;
