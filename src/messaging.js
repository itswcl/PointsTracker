export const MESSAGE_TYPES = Object.freeze({
  PAGE_OBSERVED: 'points-tracker/page-observed',
  REFRESH_PROGRAM: 'points-tracker/refresh-program',
  REFRESH_ALL: 'points-tracker/refresh-all',
});

export function isPointsTrackerMessage(message) {
  return Boolean(
    message &&
      typeof message === 'object' &&
      Object.values(MESSAGE_TYPES).includes(message.type),
  );
}

