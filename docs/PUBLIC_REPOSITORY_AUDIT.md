# Public Repository Audit

This file records privacy and secret-scan evidence gathered before making the Points Tracker repository public.

## Preliminary scan — July 19, 2026

Scope:

- Current tracked and untracked project files, excluding `.git`, `node_modules`, and generated `dist` output
- Every commit reachable from the repository's branches and tags
- High-confidence private-key, cloud-key, GitHub-token, Slack-token, Google-key, live Stripe-key, bearer-token, JWT, credential-assignment, and URL-embedded credential patterns
- Machine-specific absolute paths and local filesystem or extension-origin references
- Suspicious credential, key-store, certificate, and environment filenames
- Tracked generated or ignored paths such as `.DS_Store`, `node_modules`, `dist`, coverage output, and ZIP packages

Result:

- No credentials, private keys, authentication tokens, machine-specific paths, suspicious credential files, or tracked generated artifacts were found.
- The only broad-pattern match in reachable history was a deliberately synthetic password-field rejection fixture in `tests/storage/backup.test.js`. It tests that imported backups reject unexpected credential-like fields; it does not contain a real credential.
- The current fixture uses a one-character placeholder so future scans do not mistake the synthetic value for a credential.

This preliminary scan was repeated after the logo and license decisions were implemented. The final result is recorded below.

## Final pre-public scan

Completed July 19, 2026, after replacing program logos with recognizable text labels and adding the MIT License.

Result:

- No credentials, private keys, authentication tokens, account identifiers, machine-specific paths, suspicious credential files, or tracked generated artifacts were found in the final working tree.
- No high-confidence secret patterns were found in any commit reachable from the repository's branches or tags.
- A broader credential-assignment scan again identified only commit `a40d133`'s synthetic password-field rejection fixture in `tests/storage/backup.test.js`. Manual review confirmed that the value is test data and that the parser rejects the field.
- The removed program-logo assets and `simple-icons` dependency are absent from the application and dependency graph.
