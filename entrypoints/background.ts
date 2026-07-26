import { createCaptureCoordinator } from '../src/background/capture-coordinator.js';
import { isPointsTrackerMessage } from '../src/messaging.js';
import { SettingsRepository } from '../src/storage/settings-repository.js';
import { StateRepository } from '../src/storage/state-repository.js';
import { SessionRepository } from '../src/storage/session-repository.js';

const stateRepository = new StateRepository(chrome.storage.local);
const settingsRepository = new SettingsRepository(chrome.storage.local);
const sessionRepository = new SessionRepository(chrome.storage.session);
const coordinator = createCaptureCoordinator({
  browserApi: chrome,
  settingsRepository,
  stateRepository,
  sessionRepository,
});

const ready = Promise.all([
  settingsRepository.ensureSettings(),
  stateRepository.ensureState(),
]).then(() => stateRepository.recoverInterruptedCaptures());

chrome.runtime.onInstalled.addListener(() => {
  void ready;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isPointsTrackerMessage(message)) return false;

  ready
    .then(() => coordinator.handleMessage(message, sender))
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false, error: 'unexpected_error' }));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  coordinator.handleTabRemoved(tabId);
});
