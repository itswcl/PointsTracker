import { useEffect, useState } from 'react';
import { checkForAvailableUpdate } from '../../src/update-check.js';

export function useUpdateCheck(installedVersion: string): string | null {
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void checkForAvailableUpdate({
      installedVersion,
      storageArea: chrome.storage.local,
    }).then((version) => {
      if (mounted) setAvailableVersion(version);
    });

    return () => {
      mounted = false;
    };
  }, [installedVersion]);

  return availableVersion;
}
