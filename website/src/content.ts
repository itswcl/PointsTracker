export type SupportCategory = 'airline' | 'hotel' | 'card';

export interface SupportedProgram {
  category: SupportCategory;
  program: string;
  capture: string;
  url: string;
  host: string;
}

export const SUPPORTED_PROGRAMS: readonly SupportedProgram[] = [
  {
    category: 'airline',
    program: 'United MileagePlus',
    capture:
      'Miles, pooled miles, TravelBank, member number, and supported expiration details across three rows.',
    url: 'https://www.united.com/en/us/myunited',
    host: 'united.com',
  },
  {
    category: 'airline',
    program: 'Southwest Rapid Rewards',
    capture:
      'Points, member number, Flight Credit total, and earliest rendered credit expiration across two rows.',
    url: 'https://www.southwest.com/loyalty/myaccount/',
    host: 'southwest.com',
  },
  {
    category: 'airline',
    program: 'Cathay Asia Miles',
    capture: 'Miles, member number, and supported expiration date.',
    url: 'https://www.cathaypacific.com/',
    host: 'cathaypacific.com',
  },
  {
    category: 'airline',
    program: 'Air France Flying Blue',
    capture: 'Miles, member number, and supported expiration date.',
    url: 'https://wwws.airfrance.us/profile/flying-blue/miles-overview',
    host: 'airfrance.us',
  },
  {
    category: 'airline',
    program: 'Virgin Atlantic Flying Club',
    capture: 'Points and member number; no expiration date.',
    url: 'https://www.virginatlantic.com/flying-club/account/overview',
    host: 'virginatlantic.com',
  },
  {
    category: 'airline',
    program: 'Alaska Atmos Rewards',
    capture: 'Points and member number; no expiration date.',
    url: 'https://www.alaskaair.com/',
    host: 'alaskaair.com',
  },
  {
    category: 'airline',
    program: 'American AAdvantage',
    capture: 'Miles, member number, and supported expiration status.',
    url: 'https://www.aa.com/aadvantage-program/profile/account-summary',
    host: 'aa.com',
  },
  {
    category: 'airline',
    program: 'EVA Air Infinity MileageLands',
    capture:
      'Miles, member number, and nearest rendered expiring-mile tranche.',
    url: 'https://eservice.evaair.com/',
    host: 'evaair.com',
  },
  {
    category: 'airline',
    program: 'British Airways Club',
    capture: 'Avios, member number, and activity-based expiration detail.',
    url: 'https://www.britishairways.com/',
    host: 'britishairways.com',
  },
  {
    category: 'airline',
    program: 'ANA Mileage Club',
    capture: 'Miles, member number, and supported expiration month.',
    url: 'https://www.ana.co.jp/en/us/amc/',
    host: 'ana.co.jp',
  },
  {
    category: 'airline',
    program: 'Delta SkyMiles',
    capture: 'Miles and member number; no expiration date.',
    url: 'https://www.delta.com/myskymiles/overview',
    host: 'delta.com',
  },
  {
    category: 'hotel',
    program: 'World of Hyatt',
    capture:
      'Points and member number; this ledger displays no expiration date.',
    url: 'https://www.hyatt.com/profile/en-US/account-overview',
    host: 'hyatt.com',
  },
  {
    category: 'hotel',
    program: 'Hilton Honors',
    capture: 'Points, member number, and supported expiration date.',
    url: 'https://www.hilton.com/en/hilton-honors/guest/my-account/',
    host: 'hilton.com',
  },
  {
    category: 'hotel',
    program: 'Marriott Bonvoy',
    capture:
      'Points, member number, and expiration derived from qualifying activity.',
    url: 'https://www.marriott.com/loyalty/myAccount/activity.mi',
    host: 'marriott.com',
  },
  {
    category: 'hotel',
    program: 'IHG One Rewards',
    capture:
      'Points, member number, and supported elite expiration status.',
    url: 'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home',
    host: 'ihg.com',
  },
  {
    category: 'hotel',
    program: 'Wyndham Rewards',
    capture:
      'Points, member number, and supported activity-based status.',
    url: 'https://www.wyndhamhotels.com/wyndham-rewards/my-account/activity',
    host: 'wyndhamhotels.com',
  },
  {
    category: 'card',
    program: 'American Express Membership Rewards',
    capture: 'Rendered Available Points total only.',
    url: 'https://global.americanexpress.com/rewards',
    host: 'americanexpress.com',
  },
  {
    category: 'card',
    program: 'Capital One Miles',
    capture: 'Exact rendered whole-number Miles total only.',
    url: 'https://myaccounts.capitalone.com/accountSummary',
    host: 'capitalone.com',
  },
  {
    category: 'card',
    program: 'Chase Ultimate Rewards',
    capture:
      'Combined points total across rendered cards; no per-card details stored.',
    url: 'https://ultimaterewardspoints.chase.com/account-selector',
    host: 'chase.com',
  },
  {
    category: 'card',
    program: 'Citi ThankYou Rewards',
    capture: 'Rendered Total ThankYou Points value only.',
    url: 'https://online.citi.com/US/ag/dashboard/summary',
    host: 'citi.com',
  },
  {
    category: 'card',
    program: 'Bilt Rewards',
    capture: 'Exact rendered whole-number points balance only.',
    url: 'https://www.bilt.com/rewards/neighborhood',
    host: 'bilt.com',
  },
];

export const FAQ_ITEMS = [
  {
    question: 'The refresh button did not update my balance.',
    answer:
      'Make sure you are signed in on the official account page and let the page finish loading. If the page was already open when you installed or reloaded Points Tracker, reload that account page once and try the row’s round-arrow again.',
  },
  {
    question: 'Why did Chrome open a login page?',
    answer:
      'Points Tracker does not accept or store a password. It opens the official program site so you can complete the site’s normal sign-in, then watches only for supported rendered values.',
  },
  {
    question: 'What happens if a supported site changes?',
    answer:
      'Your last successful value stays in the ledger. Use the pencil icon for a manual update until the program-specific reader is adjusted in a future release.',
  },
  {
    question: 'Will uninstalling remove my ledger?',
    answer:
      'Yes. Chrome clears the extension’s local storage when the extension is removed. Export a JSON backup before replacing an unpacked installation, then import it after loading the new version.',
  },
] as const;
