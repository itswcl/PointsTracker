import { useCallback, useEffect, useRef, useState } from 'react';
import {
  normalizeSettings,
  SETTINGS_STORAGE_KEY,
} from '../../src/domain/settings.js';
import { SettingsRepository } from '../../src/storage/settings-repository.js';
import type {
  PointsTrackerSettings,
  ProgramId,
} from '../../src/types.js';

export function usePointsSettings() {
  const repositoryRef = useRef<SettingsRepository | null>(null);
  const [settings, setSettings] = useState<PointsTrackerSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  if (!repositoryRef.current) {
    repositoryRef.current = new SettingsRepository(chrome.storage.local);
  }
  const repository = repositoryRef.current;

  useEffect(() => {
    let mounted = true;
    repository
      .ensureSettings()
      .then((nextSettings) => {
        if (mounted) setSettings(nextSettings);
      })
      .catch(() => {
        if (mounted) setSettingsError('Settings could not be opened.');
      });

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName,
    ) => {
      if (
        areaName === 'local' &&
        changes[SETTINGS_STORAGE_KEY]?.newValue
      ) {
        setSettings(
          normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue),
        );
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, [repository]);

  const changeProgramEnabled = useCallback(
    async (programId: ProgramId, enabled: boolean) => {
      const nextSettings = await repository.setProgramEnabled(
        programId,
        enabled,
      );
      setSettings(nextSettings);
    },
    [repository],
  );

  return {
    changeProgramEnabled,
    settings,
    settingsError,
  };
}
