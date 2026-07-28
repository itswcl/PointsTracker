import {
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  FAQ_ITEMS,
  SUPPORTED_PROGRAMS,
  type SupportCategory,
} from './content.js';

const BASE_URL = import.meta.env.BASE_URL;
const RELEASE_DOWNLOAD =
  'https://github.com/itswcl/PointsTracker/releases/latest/download/points-tracker-chrome.zip';
const CURRENT_YEAR = new Date().getFullYear();

function sitePath(path = ''): string {
  return `${BASE_URL}${path}`;
}

function assetPath(filename: string): string {
  return sitePath(`assets/${filename}`);
}

function useRevealElements(): void {
  useEffect(() => {
    const elements = [...document.querySelectorAll('.reveal')];
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M8 11l4 4 4-4M5 19h14" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.7 2.9 8.2 7 10 4.1-1.8 7-5.3 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16v12H4zM8 3v3M16 3v3" />
      <path d="M8 11h8M8 15h5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

interface HeaderProps {
  page: 'guide' | 'privacy';
}

function Header({ page }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setIsOpen(false);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const home = sitePath();
  return (
    <header className="site-header">
      <div className="site-shell nav-row">
        <a className="brand" href={home} aria-label="Points Tracker home">
          <img
            src={assetPath('icon-128.png')}
            alt=""
            width="38"
            height="38"
          />
          <span>Points Tracker</span>
        </a>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls="primary-navigation"
          aria-label="Open navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <nav aria-label="Primary">
          <ul
            className={`nav-links${isOpen ? ' is-open' : ''}`}
            id="primary-navigation"
            onClick={() => setIsOpen(false)}
          >
            <li>
              <a href={sitePath('#first-refresh')}>First refresh</a>
            </li>
            {page === 'guide' ? (
              <li>
                <a href="#features">Features</a>
              </li>
            ) : null}
            <li>
              <a href={sitePath('#supported')}>Supported sites</a>
            </li>
            <li>
              <a href={sitePath('#privacy')}>Privacy</a>
            </li>
            <li>
              <a className="nav-download" href={RELEASE_DOWNLOAD}>
                Download
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function Footer({ guideLink = false }: { guideLink?: boolean }) {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-row">
        <span>© {CURRENT_YEAR} Points Tracker · MIT License</span>
        <nav className="footer-links" aria-label="Footer">
          {guideLink ? <a href={sitePath()}>Guide</a> : null}
          {!guideLink ? (
            <a href={sitePath('#privacy')}>Privacy</a>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}

function PageFrame({
  page,
  children,
  guideLink = false,
}: PropsWithChildren<HeaderProps & { guideLink?: boolean }>) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Header page={page} />
      {children}
      <Footer guideLink={guideLink} />
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="site-shell">
        <div className="hero-grid">
          <div className="reveal">
            <p className="eyebrow">Local-only Chrome extension · v1.7.0</p>
            <h1>Every balance. One private ledger.</h1>
            <p className="hero-copy">
              See airline miles, hotel points, card rewards, member numbers,
              and expiration details in one calm view—stored only in your
              current Chrome profile.
            </p>
            <div className="hero-actions">
              <a className="button button--primary" href={RELEASE_DOWNLOAD}>
                Download for Chrome
                <DownloadIcon />
              </a>
              <a className="button button--secondary" href="#first-refresh">
                Fetch your first program
              </a>
            </div>
            <p className="privacy-chip">
              <ShieldIcon />
              No accounts, credentials, analytics, backend, or data uploads.
            </p>
          </div>

          <figure className="ledger-frame reveal">
            <img
              src={assetPath('points-tracker-demo.png')}
              alt="Points Tracker extension showing fictional credit-card, airline, and hotel balances in three columns"
              width="1600"
              height="1200"
            />
            <figcaption>
              <span>Three ledgers. One compact popup.</span>
              <span>All values and member numbers are synthetic.</span>
            </figcaption>
          </figure>
        </div>

        <div className="route-strip reveal" aria-label="Product facts">
          <div className="route-grid">
            <div className="route-stat">
              <strong>27</strong>
              <span>ledger rows</span>
            </div>
            <div className="route-stat">
              <strong>24</strong>
              <span>rewards programs</span>
            </div>
            <div className="route-stat">
              <strong>0</strong>
              <span>data uploads</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FIRST_USE_STEPS: readonly {
  title: string;
  content: ReactNode;
  signal?: boolean;
}[] = [
  {
    title: 'Download and unzip',
    content: (
      <>
        Download the latest ZIP, then double-click it on Mac or choose{' '}
        <strong>Extract All</strong> on Windows. Keep the unzipped folder after
        installation.
      </>
    ),
  },
  {
    title: 'Load it into Chrome',
    content: (
      <>
        Open <strong>chrome://extensions</strong>, turn on{' '}
        <strong>Developer mode</strong>, choose <strong>Load unpacked</strong>,
        and select the unzipped <strong>points-tracker-chrome</strong> folder.
      </>
    ),
  },
  {
    title: 'Pin Points Tracker',
    content:
      'Open Chrome’s puzzle-piece menu and pin Points Tracker so the ledger is always one click away.',
  },
  {
    title: 'Click refresh beside a program',
    signal: true,
    content:
      'Look for the round-arrow icon on the same row as United, Hilton, Chase, or any other program. This is the important first-use step.',
  },
  {
    title: 'Sign in on the official site',
    content:
      'Complete the program’s normal sign-in. The extension watches for up to three minutes, saves the supported values locally, and keeps your last good value if capture cannot finish.',
  },
];

function FirstRefresh() {
  return (
    <section className="section" id="first-refresh">
      <div className="site-shell">
        <p className="section-kicker reveal">The first five minutes</p>
        <h2 className="section-heading reveal">
          Install once. Refresh each program once.
        </h2>
        <p className="section-intro reveal">
          Points Tracker never asks for a login. Its refresh button opens the
          program’s official site, where you sign in normally. The extension
          then reads only the supported values displayed on that page.
        </p>

        <div className="first-use">
          <ol className="steps">
            {FIRST_USE_STEPS.map((step) => (
              <li
                className={`step${step.signal ? ' step--signal' : ''} reveal`}
                key={step.title}
              >
                <h3>{step.title}</h3>
                <p>{step.content}</p>
              </li>
            ))}
          </ol>

          <aside
            className="refresh-card reveal"
            aria-labelledby="refresh-title"
          >
            <span className="refresh-card__label">
              <RefreshIcon />
              The button to remember
            </span>
            <h3 id="refresh-title">Round arrow = fetch now</h3>
            <p>
              Use the small round-arrow on any row. Each refresh stays tied to
              that program’s official account page.
            </p>
            <figure className="refresh-shot">
              <div className="refresh-shot__image">
                <img
                  src={assetPath('points-tracker-refresh.png')}
                  alt="Synthetic Points Tracker rows with the round-arrow refresh control highlighted"
                  width="610"
                  height="230"
                  loading="lazy"
                />
              </div>
            </figure>
            <div className="tip">
              <span className="tip-mark">i</span>
              <span>
                <strong>Already had the account page open?</strong> Reload that
                page once after installing or reloading the extension so its
                private local reader can attach.
              </span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    number: '01 / Refresh',
    title: 'Open the right page',
    copy:
      'A row’s refresh icon opens its official account page and waits for supported values after you complete normal sign-in.',
  },
  {
    number: '02 / Edit',
    title: 'Keep a manual fallback',
    copy:
      'If a rewards site changes, use the pencil to keep a current balance. Passive visits leave it alone, and refresh asks before replacing it.',
  },
  {
    number: '03 / Backup',
    title: 'Carry your own data',
    copy:
      'Export and import a local JSON backup before replacing an unpacked installation. The file stays under your control.',
  },
] as const;

function Features() {
  return (
    <section className="section" id="features">
      <div className="site-shell">
        <aside
          className="release-update reveal"
          aria-labelledby="release-update-title"
        >
          <div className="release-update__stamp" aria-hidden="true">
            <span>What’s new</span>
            <strong>1.7.0</strong>
          </div>
          <div className="release-update__copy">
            <h2 id="release-update-title">
              Three more programs. Safer manual values.
            </h2>
            <ul>
              <li>
                Added KrisFlyer, Choice Privileges, and Leading Hotels of the
                World.
              </li>
              <li>
                Passive account-page visits preserve manual values. Refresh
                asks before replacing one and keeps it if capture fails.
              </li>
              <li>
                Zero-balance rows now show <strong>N/A</strong> expiration, and
                Capital One capture handles signed Miles totals.
              </li>
            </ul>
          </div>
        </aside>

        <p className="section-kicker reveal">Built for ordinary use</p>
        <h2 className="section-heading reveal">
          Useful controls. No account system.
        </h2>
        <p className="section-intro reveal">
          The extension does not replace the official rewards websites. It
          gives you one private snapshot, plus a manual fallback when a site
          changes.
        </p>

        <div className="feature-grid reveal">
          {FEATURES.map((feature) => (
            <article className="feature" key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>

        <div className="settings-visual reveal">
          <div className="settings-visual__image">
            <img
              src={assetPath('points-tracker-settings.png')}
              alt="Points Tracker settings screen showing fictional program visibility choices"
              width="800"
              height="600"
              loading="lazy"
            />
          </div>
          <div className="settings-visual__copy">
            <div>
              <p className="section-kicker">Make it yours</p>
              <h3>Show only the programs you use.</h3>
              <p>
                Turn rows off from Settings without deleting their saved
                values. Re-enable a program later and it returns to the ledger.
              </p>
            </div>
            <small>Screenshot uses a synthetic local demo state.</small>
          </div>
        </div>
      </div>
    </section>
  );
}

const FILTERS: readonly {
  id: 'all' | SupportCategory;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'airline', label: 'Airline' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'card', label: 'Cards' },
];

const CATEGORY_LABELS: Readonly<Record<SupportCategory, string>> = {
  airline: 'Airline',
  hotel: 'Hotel',
  card: 'Card',
};

function SupportedSites() {
  const [filter, setFilter] = useState<'all' | SupportCategory>('all');
  const visiblePrograms =
    filter === 'all'
      ? SUPPORTED_PROGRAMS
      : SUPPORTED_PROGRAMS.filter((program) => program.category === filter);

  return (
    <section className="section" id="supported">
      <div className="site-shell">
        <div className="support-head reveal">
          <div>
            <p className="section-kicker">Coverage in v1.7.0</p>
            <h2 className="section-heading">Supported account sites</h2>
          </div>
          <div className="filters" aria-label="Filter supported programs">
            {FILTERS.map((candidate) => (
              <button
                className="filter-button"
                type="button"
                aria-pressed={filter === candidate.id}
                onClick={() => setFilter(candidate.id)}
                key={candidate.id}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap reveal">
          <table className="support-table">
            <caption>
              Rewards programs and official account sites supported by Points
              Tracker version 1.7.0
            </caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Program</th>
                <th scope="col">Automatic capture</th>
                <th scope="col">Official account site</th>
              </tr>
            </thead>
            <tbody>
              {visiblePrograms.map((program) => (
                <tr key={program.program}>
                  <td>
                    <span className="category-tag">
                      {CATEGORY_LABELS[program.category]}
                    </span>
                  </td>
                  <td>{program.program}</td>
                  <td>{program.capture}</td>
                  <td>
                    <a href={program.url}>{program.host}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-note reveal">
          Automatic capture reads allowlisted values rendered on these official
          sites after normal sign-in. Account pages can change; the pencil icon
          remains the manual fallback. Company names identify compatibility
          only—Points Tracker is independent and not endorsed by these
          programs.
        </p>
      </div>
    </section>
  );
}

function PrivacyPanel() {
  return (
    <section className="section" id="privacy">
      <div className="site-shell privacy-panel reveal">
        <div>
          <p className="section-kicker">Privacy is the architecture</p>
          <h2>Your ledger stays yours.</h2>
          <p>
            No sign-up, no cloud account, and no analytics. Program values are
            stored in <strong>chrome.storage.local</strong> inside the current
            Chrome profile.
          </p>
          <a className="text-link" href={sitePath('privacy.html')}>
            Read the complete privacy page →
          </a>
        </div>
        <ul className="privacy-list">
          <li>
            <ShieldIcon />
            <span>
              <strong>No credentials</strong>
              Passwords, cookies, tokens, member names, and card details are
              never requested or stored.
            </span>
          </li>
          <li>
            <LedgerIcon />
            <span>
              <strong>Program-level values only</strong>
              Supported balances, applicable member numbers and expiration
              records, display settings, and update-check metadata.
            </span>
          </li>
          <li>
            <ClockIcon />
            <span>
              <strong>One anonymous release check</strong>
              GitHub’s public release API is checked no more than once every 24
              hours. No rewards data is included.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section className="section" id="faq">
      <div className="site-shell faq-grid">
        <div className="reveal">
          <p className="section-kicker">Common questions</p>
          <h2 className="section-heading">
            When the first refresh needs help.
          </h2>
        </div>
        <div className="faq-list reveal">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCallToAction() {
  return (
    <section className="final-cta">
      <div className="final-cta__inner reveal">
        <p className="section-kicker">Ready when you are</p>
        <h2>Start with one refresh.</h2>
        <a className="button button--primary" href={RELEASE_DOWNLOAD}>
          Download Points Tracker
        </a>
      </div>
    </section>
  );
}

export function GuidePage() {
  useRevealElements();

  return (
    <PageFrame page="guide">
      <main id="main">
        <Hero />
        <FirstRefresh />
        <Features />
        <SupportedSites />
        <PrivacyPanel />
        <FAQ />
        <FinalCallToAction />
      </main>
    </PageFrame>
  );
}

const PRIVACY_TOC = [
  ['summary', 'Plain-language summary'],
  ['stored', 'What is stored'],
  ['never', 'What is never collected'],
  ['network', 'Network activity'],
  ['permissions', 'Chrome permissions'],
  ['retention', 'Retention and deletion'],
  ['backups', 'Local backups'],
  ['changes', 'Changes and contact'],
] as const;

export function PrivacyPage() {
  useRevealElements();

  return (
    <PageFrame page="privacy" guideLink>
      <main id="main">
        <header className="page-hero">
          <div className="site-shell">
            <p className="eyebrow">Points Tracker privacy</p>
            <h1>Local by design, not by promise.</h1>
            <p className="page-hero__lede">
              Points Tracker is a single-user Chrome extension with no backend,
              cloud account, analytics, or advertising. Rewards data stays in
              the current Chrome profile unless you explicitly export a local
              backup.
            </p>
            <div className="privacy-summary" aria-label="Privacy summary">
              <div>
                <strong>0</strong>
                <span>credentials requested</span>
              </div>
              <div>
                <strong>0</strong>
                <span>rewards data uploads</span>
              </div>
              <div>
                <strong>1</strong>
                <span>local Chrome profile</span>
              </div>
            </div>
            <div className="page-meta">
              <span>Effective July 28, 2026</span>
              <span>Applies to version 1.7.0</span>
            </div>
          </div>
        </header>

        <div className="site-shell privacy-layout">
          <nav aria-label="Privacy page sections">
            <ul className="privacy-toc">
              {PRIVACY_TOC.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="privacy-copy">
            <section id="summary">
              <p className="section-kicker">01 / Summary</p>
              <h2>Plain-language privacy summary</h2>
              <p>
                Points Tracker reads a narrow set of supported values that are
                already displayed on official rewards account pages after you
                sign in normally. It stores those values locally so the
                extension can show one compact ledger.
              </p>
              <p>
                The project has no server and does not send loyalty data to the
                developer or any analytics provider. It does not sell, share,
                or monetize personal information.
              </p>
            </section>

            <section id="stored">
              <p className="section-kicker">02 / Local data</p>
              <h2>What the extension stores</h2>
              <p>
                The following information is stored with{' '}
                <strong>chrome.storage.local</strong> in the current Chrome
                profile:
              </p>
              <ul>
                <li>Program-level rewards balances.</li>
                <li>
                  Loyalty member numbers where the supported row uses one.
                </li>
                <li>
                  Supported expiration dates, months, amounts, or status notes.
                </li>
                <li>Manual values you enter with the pencil control.</li>
                <li>Which program rows you choose to show or hide.</li>
                <li>
                  A non-personal timestamp and public version number used to
                  avoid checking for updates more than once every 24 hours.
                </li>
              </ul>
              <p>
                Credit-card rows store only the supported program-level total.
                Chase stores a combined total rather than per-card balances.
                Southwest Flight Credits stores a combined credit amount and
                the earliest supported rendered expiration, not individual
                credit details.
              </p>
            </section>

            <section id="never">
              <p className="section-kicker">03 / Excluded data</p>
              <h2>What is never requested or stored</h2>
              <ul>
                <li>Usernames or passwords.</li>
                <li>Cookies, authentication tokens, or session credentials.</li>
                <li>Member names, mailing addresses, or profile details.</li>
                <li>
                  Card numbers, card details, or individual card balances.
                </li>
                <li>
                  Transaction history or individual Flight Credit details.
                </li>
                <li>Raw account-page HTML or screenshots.</li>
                <li>Browsing history.</li>
                <li>Advertising identifiers, analytics, or telemetry.</li>
              </ul>
            </section>

            <section id="network">
              <p className="section-kicker">04 / Connections</p>
              <h2>Network activity</h2>
              <h3>Official rewards sites</h3>
              <p>
                When you click a row’s refresh icon, Points Tracker opens that
                program’s official account page. After you complete the site’s
                normal sign-in, an allowlisted page reader looks only for the
                supported rendered values. The extension does not intercept
                network traffic or copy authentication material.
              </p>
              <h3>GitHub release check</h3>
              <p>
                The extension may make an anonymous request to GitHub’s public
                latest-release API no more than once every 24 hours. The
                request includes no loyalty data. Update checks fail silently
                and never download or install software automatically.
              </p>
              <h3>This website</h3>
              <p>
                This static React website is hosted by GitHub Pages. It has no
                forms, cookies, analytics scripts, advertising, database, or
                backend. Opening download or program links takes you to the
                linked third-party site, which applies its own privacy
                practices.
              </p>
            </section>

            <section className="permission-list" id="permissions">
              <p className="section-kicker">05 / Permissions</p>
              <h2>Chrome permissions</h2>
              <p>
                Points Tracker requests the Chrome <code>storage</code>{' '}
                permission to keep its ledger locally. It also requests exact
                host access for the supported official account sites and{' '}
                <code>api.github.com</code> for the public release check.
              </p>
              <p>
                It does not request cookie, password, history,{' '}
                <code>webRequest</code>, debugger, or broad all-sites access.
                Current supported hosts are listed on the{' '}
                <a href={sitePath('#supported')}>supported-sites table</a> and
                in the project’s public manifest.
              </p>
            </section>

            <section id="retention">
              <p className="section-kicker">06 / Control</p>
              <h2>Retention and deletion</h2>
              <p>
                Local extension data remains in the current Chrome profile
                until you replace it, import another valid backup, or remove
                the extension. Clearing ordinary browser cache or history does
                not remove <strong>chrome.storage.local</strong> data.
                Uninstalling the extension does.
              </p>
              <p>
                Hiding a program row in Settings does not delete its saved
                value. Re-enabling that row restores it to the ledger.
              </p>
            </section>

            <section id="backups">
              <p className="section-kicker">07 / Backups</p>
              <h2>Local export and import</h2>
              <p>
                Export creates a plain JSON file on your device containing the
                supported ledger values, applicable member numbers and
                expiration records. The backup is not encrypted. Treat it as a
                private personal document and store it accordingly.
              </p>
              <p>
                Import validates the current versioned schema and rejects
                unexpected fields. No backup file is uploaded by the extension.
              </p>
            </section>

            <section id="changes">
              <p className="section-kicker">08 / Changes and contact</p>
              <h2>Policy changes and questions</h2>
              <p>
                Material privacy changes will be documented in the public
                repository and reflected on this page. The effective date above
                identifies the current version of this notice.
              </p>
              <p>
                For privacy questions or a suspected issue, open a public issue
                through the project repository’s issue tracker. Do not include
                account numbers, credentials, screenshots of private account
                pages, or other sensitive information.
              </p>
              <p>
                Points Tracker is an independent open-source project and is not
                affiliated with or endorsed by any supported airline, hotel,
                card issuer, or loyalty program.
              </p>
            </section>
          </article>
        </div>
      </main>
    </PageFrame>
  );
}
