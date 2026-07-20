export const PROGRAM_IDS = Object.freeze({
  UNITED: 'united',
  CATHAY: 'cathay',
  AIR_FRANCE: 'airfrance',
  VIRGIN_ATLANTIC: 'virginatlantic',
  ALASKA: 'alaska',
  AMERICAN: 'american',
  EVA_AIR: 'evaair',
  BRITISH_AIRWAYS: 'britishairways',
  ANA: 'ana',
  HYATT: 'hyatt',
  HILTON: 'hilton',
  MARRIOTT: 'marriott',
});

export const PROGRAM_CATEGORIES = Object.freeze({
  AIRLINE: 'airline',
  HOTEL: 'hotel',
});

export const PROGRAMS = Object.freeze({
  [PROGRAM_IDS.UNITED]: Object.freeze({
    id: PROGRAM_IDS.UNITED,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'United MileagePlus',
    displayName: 'UA',
    currencyName: 'miles',
    accountUrl: 'https://www.united.com/en/us/myunited',
    loginUrl: 'https://www.united.com/en/us/myunited',
    hosts: ['united.com', 'www.united.com'],
    defaultExpiration: Object.freeze({
      type: 'never',
      date: null,
      note: 'No expiration',
    }),
  }),
  [PROGRAM_IDS.CATHAY]: Object.freeze({
    id: PROGRAM_IDS.CATHAY,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'Cathay Asia Miles',
    displayName: 'Cathay',
    currencyName: 'miles',
    accountUrl:
      'https://www.cathaypacific.com/cx/en_HK/membership/my-account/miles-and-points/membership-summary.html?cxsource=MEMBER_PANEL_MY_ACCOUNT_2_1',
    loginUrl:
      'https://www.cathaypacific.com/cx/en_HK/membership/my-account/miles-and-points/membership-summary.html?cxsource=MEMBER_PANEL_MY_ACCOUNT_2_1',
    hosts: ['cathaypacific.com', 'www.cathaypacific.com'],
    defaultExpiration: Object.freeze({
      type: 'activity_based',
      date: null,
      note: 'Activity based',
    }),
  }),
  [PROGRAM_IDS.AIR_FRANCE]: Object.freeze({
    id: PROGRAM_IDS.AIR_FRANCE,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'Air France Flying Blue',
    displayName: 'Air France',
    currencyName: 'miles',
    accountUrl: 'https://wwws.airfrance.us/profile/flying-blue/miles-overview',
    loginUrl: 'https://wwws.airfrance.us/profile/flying-blue/miles-overview',
    hosts: ['wwws.airfrance.us'],
    defaultExpiration: Object.freeze({
      type: 'unknown',
      date: null,
      note: 'Exact date shown on the account page when available',
    }),
  }),
  [PROGRAM_IDS.VIRGIN_ATLANTIC]: Object.freeze({
    id: PROGRAM_IDS.VIRGIN_ATLANTIC,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'Virgin Atlantic Flying Club',
    displayName: 'Virgin Atlantic',
    currencyName: 'points',
    accountUrl: 'https://www.virginatlantic.com/en-US',
    loginUrl: 'https://www.virginatlantic.com/en-US',
    hosts: ['www.virginatlantic.com'],
    defaultExpiration: Object.freeze({
      type: 'never',
      date: null,
      note: 'No expiration',
    }),
  }),
  [PROGRAM_IDS.ALASKA]: Object.freeze({
    id: PROGRAM_IDS.ALASKA,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'Alaska Airlines Atmos Rewards',
    displayName: 'Alaska',
    currencyName: 'points',
    accountUrl: 'https://www.alaskaair.com/',
    loginUrl: 'https://www.alaskaair.com/',
    hosts: ['www.alaskaair.com'],
    defaultExpiration: Object.freeze({
      type: 'never',
      date: null,
      note: 'No expiration',
    }),
  }),
  [PROGRAM_IDS.AMERICAN]: Object.freeze({
    id: PROGRAM_IDS.AMERICAN,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'American AAdvantage',
    displayName: 'AA',
    currencyName: 'miles',
    accountUrl: 'https://www.aa.com/aadvantage-program/profile/account-summary',
    loginUrl: 'https://www.aa.com/aadvantage-program/profile/account-summary',
    hosts: ['www.aa.com'],
    defaultExpiration: Object.freeze({
      type: 'activity_based',
      date: null,
      note: 'Activity based unless an eligible cardholder exemption is shown',
    }),
  }),
  [PROGRAM_IDS.EVA_AIR]: Object.freeze({
    id: PROGRAM_IDS.EVA_AIR,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'EVA Air Infinity MileageLands',
    displayName: 'EVA',
    currencyName: 'miles',
    accountUrl: 'https://eservice.evaair.com/flyeva/eva/ffp/frequent-flyer.aspx',
    loginUrl: 'https://eservice.evaair.com/flyeva/eva/ffp/frequent-flyer.aspx',
    hosts: ['eservice.evaair.com'],
    defaultExpiration: Object.freeze({
      type: 'unknown',
      date: null,
      note: 'Exact expiring mileage tranches are shown on the account page',
    }),
  }),
  [PROGRAM_IDS.BRITISH_AIRWAYS]: Object.freeze({
    id: PROGRAM_IDS.BRITISH_AIRWAYS,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'British Airways Club',
    displayName: 'BA',
    currencyName: 'Avios',
    accountUrl:
      'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/executive-statements/',
    loginUrl:
      'https://www.britishairways.com/nx/b/customerhub/en/usa/your-account/executive-statements/',
    hosts: ['www.britishairways.com'],
    defaultExpiration: Object.freeze({
      type: 'activity_based',
      date: null,
      note: 'Expires after 36 months without qualifying activity',
    }),
  }),
  [PROGRAM_IDS.ANA]: Object.freeze({
    id: PROGRAM_IDS.ANA,
    category: PROGRAM_CATEGORIES.AIRLINE,
    name: 'ANA Mileage Club',
    displayName: 'ANA',
    currencyName: 'miles',
    accountUrl:
      'https://stmt.cam.ana.co.jp/psz/amcj/jsp/renew/mile/reference_e.jsp#month',
    loginUrl:
      'https://stmt.cam.ana.co.jp/psz/amcj/jsp/renew/mile/reference_e.jsp#month',
    hosts: ['stmt.cam.ana.co.jp'],
    defaultExpiration: Object.freeze({
      type: 'unknown',
      date: null,
      note: 'Expiry month shown for the latest activity when available',
    }),
  }),
  [PROGRAM_IDS.HYATT]: Object.freeze({
    id: PROGRAM_IDS.HYATT,
    category: PROGRAM_CATEGORIES.HOTEL,
    name: 'World of Hyatt',
    displayName: 'Hyatt',
    currencyName: 'points',
    accountUrl: 'https://www.hyatt.com/profile/en-US/account-overview',
    loginUrl: 'https://www.hyatt.com/profile/en-US/account-overview',
    hosts: ['www.hyatt.com'],
    defaultExpiration: Object.freeze({
      type: 'never',
      date: null,
      note: 'N/A for the cardholder profile configured in this local ledger',
    }),
  }),
  [PROGRAM_IDS.HILTON]: Object.freeze({
    id: PROGRAM_IDS.HILTON,
    category: PROGRAM_CATEGORIES.HOTEL,
    name: 'Hilton Honors',
    displayName: 'Hilton',
    currencyName: 'points',
    accountUrl: 'https://www.hilton.com/en/hilton-honors/guest/my-account/',
    loginUrl: 'https://www.hilton.com/en/hilton-honors/guest/my-account/',
    hosts: ['www.hilton.com'],
    defaultExpiration: Object.freeze({
      type: 'activity_based',
      date: null,
      inactivityMonths: 24,
      note: 'Expires after 24 consecutive months without eligible activity',
    }),
  }),
  [PROGRAM_IDS.MARRIOTT]: Object.freeze({
    id: PROGRAM_IDS.MARRIOTT,
    category: PROGRAM_CATEGORIES.HOTEL,
    name: 'Marriott Bonvoy',
    displayName: 'Marriott',
    currencyName: 'points',
    accountUrl: 'https://www.marriott.com/loyalty/myAccount/activity.mi',
    loginUrl: 'https://www.marriott.com/loyalty/myAccount/activity.mi',
    hosts: ['www.marriott.com'],
    defaultExpiration: Object.freeze({
      type: 'activity_based',
      date: null,
      inactivityMonths: 24,
      note: 'Expires after 24 consecutive months without qualifying activity',
    }),
  }),
});

export const PROGRAM_LIST = Object.freeze(Object.values(PROGRAMS));

export function getProgram(programId) {
  return PROGRAMS[programId] ?? null;
}

export function detectProgramFromUrl(rawUrl) {
  let hostname;

  try {
    hostname = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }

  return (
    PROGRAM_LIST.find((program) =>
      program.hosts.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`),
      ),
    ) ?? null
  );
}
