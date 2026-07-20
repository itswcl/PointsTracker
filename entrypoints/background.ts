import { createCaptureCoordinator } from '../src/background/capture-coordinator.js';
import { isPointsTrackerMessage } from '../src/messaging.js';
import { StateRepository } from '../src/storage/state-repository.js';
import { SessionRepository } from '../src/storage/session-repository.js';

const stateRepository = new StateRepository(chrome.storage.local);
const sessionRepository = new SessionRepository(chrome.storage.session);
const coordinator = createCaptureCoordinator({
  browserApi: chrome,
  stateRepository,
  sessionRepository,
});

void stateRepository.ensureState();

chrome.runtime.onInstalled.addListener(() => {
  void stateRepository.ensureState();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isPointsTrackerMessage(message)) return false;

  coordinator
    .handleMessage(message, sender)
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false, error: 'unexpected_error' }));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  coordinator.handleTabRemoved(tabId);
});
