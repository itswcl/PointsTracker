import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeState, STORAGE_KEY } from '../../src/domain/records.js';
import { StateRepository } from '../../src/storage/state-repository.js';
import type {
  ManualOverrideInput,
  PointsState,
  ProgramId,
} from '../../src/types.js';

export function usePointsState() {
  const repositoryRef = useRef<StateRepository | null>(null);
  const [state, setState] = useState<PointsState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  if (!repositoryRef.current) {
    repositoryRef.current = new StateRepository(chrome.storage.local);
  }
  const repository = repositoryRef.current;

  useEffect(() => {
    let mounted = true;
    repository
      .ensureState()
      .then((nextState) => {
        if (mounted) setState(nextState);
      })
      .catch(() => {
        if (mounted) setLoadError('Local data could not be opened.');
      });

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName,
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEY]?.newValue) {
        setState(normalizeState(changes[STORAGE_KEY].newValue));
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, [repository]);

  const saveManualOverride = useCallback(
    (programId: ProgramId, override: ManualOverrideInput) =>
      repository.saveManualOverride(programId, override),
    [repository],
  );

  const replaceState = useCallback(
    (nextState: PointsState) => repository.setState(nextState),
    [repository],
  );

  return {
    loadError,
    replaceState,
    saveManualOverride,
    state,
  };
}
