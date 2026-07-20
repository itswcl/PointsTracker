import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEY } from '../../src/domain/records.js';
import { StateRepository } from '../../src/storage/state-repository.js';

export function usePointsState() {
  const repositoryRef = useRef(null);
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);

  if (!repositoryRef.current) {
    repositoryRef.current = new StateRepository(chrome.storage.local);
  }

  useEffect(() => {
    let mounted = true;
    const repository = repositoryRef.current;

    repository
      .ensureState()
      .then((nextState) => {
        if (mounted) setState(nextState);
      })
      .catch(() => {
        if (mounted) setLoadError('Local data could not be opened.');
      });

    const onChanged = (changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEY]?.newValue) {
        setState(changes[STORAGE_KEY].newValue);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const saveManualOverride = useCallback((programId, override) => {
    return repositoryRef.current.saveManualOverride(programId, override);
  }, []);

  const clearManualOverride = useCallback((programId) => {
    return repositoryRef.current.clearManualOverride(programId);
  }, []);

  const replaceState = useCallback((nextState) => {
    return repositoryRef.current.setState(nextState);
  }, []);

  return {
    clearManualOverride,
    loadError,
    replaceState,
    saveManualOverride,
    state,
  };
}
