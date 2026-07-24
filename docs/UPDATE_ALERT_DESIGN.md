# Update availability alert

## Understanding summary

- Points Tracker should automatically check whether a newer GitHub release is available.
- The check runs when the popup opens and no more than once every 24 hours.
- A newer release produces a compact, non-blocking update banner.
- The user remains in control of downloading and installing an update.
- Update checking must not send loyalty data, credentials, cookies, or analytics.
- GitHub failures must not interfere with the local ledger.
- Background polling, automatic downloads, and automatic installation are out of scope.

## Assumptions

- GitHub Releases remains the distribution source for unpacked ZIP installations.
- Release tags use numeric semantic versions such as `v1.3.0`.
- A small local cache containing the check time and latest version is acceptable.
- Chrome Web Store installations may use Chrome's native automatic updates later.

## Final design

The popup reads an update cache containing only `checkedAt` and
`latestVersion`. If the cache is less than 24 hours old, it compares the cached
version with `chrome.runtime.getManifest().version`. Otherwise, it requests the
latest public release from the GitHub API with a short timeout, validates the
response, updates the cache, and performs a strict numeric
`major.minor.patch` comparison.

When a newer version exists, the popup displays:

> Version X.Y.Z is available — Update

The **Update** link always opens the repository's fixed
`https://github.com/itswcl/PointsTracker/releases/latest` URL. A URL returned by
the API is never opened directly. The existing **Check updates** footer link
remains available.

The manifest grants exact-host access to `https://api.github.com/*`. GitHub is
not added to the content-script match list. Requests contain no account data,
credentials, cookies, or analytics. Network errors, rate limits, timeouts,
invalid release tags, and malformed responses fail silently.

The README and privacy documentation disclose the anonymous release check and
the non-personal local cache.

## Testing

- Numeric version comparison, including multi-digit version components
- Fresh and expired 24-hour cache behavior
- Newer, current, and older release versions
- Malformed GitHub responses, invalid tags, timeouts, and network failures
- Conditional banner rendering and its fixed trusted update URL
- Exact GitHub API host permission without a GitHub content-script match
- Full `npm run check` validation

## Decision log

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| Check when the popup opens, at most daily | Manual-only check; background alarm | Timely without background polling or repeated requests |
| Use GitHub's public latest-release API | Static version file; Chrome Web Store only | Works with the current GitHub ZIP distribution and needs no credentials |
| Add the exact `api.github.com` host permission | Optional permission | Provides the requested automatic behavior with the narrowest required host |
| Show a persistent inline banner | Browser notification; modal dialog | Visible but non-disruptive |
| Open the fixed latest-release page | Automatic download; API-provided URL | Keeps installation user-controlled and prevents untrusted navigation |
| Fail silently | Error banner or retries | Update availability must never interfere with the ledger |

