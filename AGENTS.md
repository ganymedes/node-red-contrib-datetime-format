# AGENTS.md

> **Always load this file at the start of every session before working in this
> repository.**

## Standing rules

1. **Always load `AGENTS.md`** (this file) before doing anything in this repo.
2. **Keep `README.md` in sync with the codebase.** Whenever you add, remove or
   change a config field, input/output behaviour, preset, default value, or the
   public API of `lib/format.js`, update `README.md` in the **same change**.
   Never let the docs drift from the code.
3. **Tests track code.** Whenever runtime code changes (`lib/format.js`,
   `datetime-format.js`, or behaviour in `datetime-format.html`), add or update
   the tests in `test/` in the **same change**.
4. **Run `npm test` before every commit** and only commit when it passes.
5. **Follow coding best practices.** Keep the pure-function (`lib/format.js`) /
   thin-wrapper (`datetime-format.js`) architecture, use clear naming, and make
   small, focused changes.
6. **Security first.** Validate and sanitise external input, avoid unsafe
   patterns, and apply secure-by-default thinking whenever writing or changing
   code.
7. **Git commits go to `main` directly** (this repo uses no feature branches) —
   but **only when the user explicitly asks** for a commit.
8. **Never auto-commit, push, or sync to git — the user does this, no
   exceptions.** Even with a green test suite, stop after making the changes and
   let the user run git, unless they explicitly tell you to commit in that
   request.
9. **Bump the version yourself in EVERY code change — no exceptions.** npm
   refuses to republish the same version, so the assistant runs
   `npm version patch --no-git-tag-version` (or `minor`/`major` per semver) as
   part of the same change, updating `package.json` + `package-lock.json`.
   **Never** tell the user to run `npm version` — that is the assistant's job.
   The user then just commits + pushes to `main`; CI publishes the new version
   automatically (see Publishing). So from the user's side, push = release.
10. **Give the user a commit note** after every completed code change — a short
    4–6 word summary they can paste straight into their commit message (since
    the user runs all commits themselves, see rules 7–8). The version bump from
    rule 9 must already be included in that same change.

## What this project is

`node-red-contrib-datetime-format` is a single custom [Node-RED](https://nodered.org/)
node (`datetime-format`) that formats datetime values (epoch ms/seconds, ISO
8601 strings, or `Date` objects) into human-readable strings with a configurable
timezone, locale and format. Formatting is done with [Luxon](https://moment.github.io/luxon/).

## File map

| File                         | Purpose                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `package.json`               | npm + Node-RED manifest. `node-red.nodes` registers the node file.   |
| `datetime-format.js`         | Runtime: registers the node, reads config, wires the input handler.  |
| `datetime-format.html`       | Editor: edit dialog, defaults, and help text.                        |
| `lib/format.js`              | **Pure** parse/format helpers (`parseToDateTime`, `formatDateTime`, `isValidZone`). No Node-RED dependency. |
| `test/format_spec.js`        | Unit tests for `lib/format.js`.                                      |
| `test/datetime-format_spec.js` | Node tests via `node-red-node-test-helper`.                        |
| `README.md`                  | User-facing docs — **keep in sync** (see standing rules).            |

## Architecture convention

Keep formatting/parsing logic as **pure functions in `lib/format.js`** so it can
be unit-tested without a runtime. `datetime-format.js` stays a thin wrapper:
read config → call `lib/format` → write output. New behaviour goes into the
library first, with the node only wiring it up.

Defaults are declared in **two** places that must agree: the `defaults` block in
`datetime-format.html` and the `config.x || default` fallbacks in
`datetime-format.js`. Change both together.

## Conventions

- Node config field names are shared verbatim between the `.html` `defaults` and
  the `.js` constructor — keep them identical.
- Errors are surfaced via `node.error(message, msg)` (so a *Catch* node can
  handle them) plus a red `node.status`; the flow must not be halted.
- Use the `(msg, send, done)` input signature; always call `done()`.

## Commands

```bash
npm install      # luxon + dev deps
npm test         # mocha "test/**/*_spec.js"
```

### Manual test inside Node-RED

```bash
cd ~/.node-red
npm install /path/to/this/repo
# restart Node-RED, then wire: inject (timestamp) → datetime format → debug
```

### Quick smoke test (no Node-RED runtime)

```bash
node -e "const {parseToDateTime,formatDateTime}=require('./lib/format'); \
  const dt=parseToDateTime(1700000000000,{unit:'auto',zone:'Europe/Zurich'}); \
  console.log(formatDateTime(dt,{formatType:'token',token:'yyyy-LL-dd HH:mm:ss',locale:'de-CH'}))"
```

## Publishing (npm + Flow Library)

Getting a release out is **two separate steps** — publishing to npm is not enough
to make the node show up in *Manage Palette → Install*.

1. **Publish to npm** — automated by the *Publish to npm* GitHub Action
   (`.github/workflows/publish.yml`), which fires on every push to `main`,
   re-runs the tests, and publishes via **OIDC trusted publishing** whenever
   package.json's version is new (a guard skips republishing an existing
   version). No npm token to store or renew; provenance is automatic. (One-time
   setup: a trusted-publisher entry for this repo + `publish.yml` on the
   package's npmjs.com settings page.) Division of labour (standing rules 7–9):
   - the **assistant** has already bumped the version in the same change
     (`npm version patch --no-git-tag-version`, rule 9) and run `npm test`,
   - the **user** commits + pushes to `main` — the workflow then tests and
     publishes the new version. Pushing a version-bumped commit = a release.
   Manual fallback if CI is unavailable: `npm publish --otp=<code>` (needs 2FA).
2. **Re-submit to the Flow Library — after EVERY release.** The Node-RED Flow
   Library **stopped auto-indexing npm in 2020** and does **not** reliably
   refresh listed packages on its own. After each new version is published, sign
   in to <https://flows.nodered.org> with GitHub, open
   <https://flows.nodered.org/add/node>, and re-submit
   `node-red-contrib-datetime-format`. This refreshes the displayed version and
   **regenerates the scorecard** — the library only re-runs the scorecard when it
   detects a *new* version, so re-submitting the same version is a no-op (and an
   out-of-date scorecard, e.g. "Supported Node-RED Version: Missing", is just a
   stale card, not a package problem).

> ⚠️ **Reminder:** after every commit that bumps the version (i.e. every
> published release), manually re-submit the node at the Flow Library. **Whenever
> this URL is given, always quote it together with the package name** so the user
> can paste both — i.e. re-submit **`node-red-contrib-datetime-format`** at
> <https://flows.nodered.org/add/node>. There is no API to automate this.

To test a published version immediately **without** waiting on the library,
install straight from npm in the Node-RED user dir:
`cd /data && npm install node-red-contrib-datetime-format`, then restart Node-RED.

## Tests must stay deterministic

Always pin `tz` and `locale` in tests. Compare preset output with whitespace
normalised (`replace(/\s+/g, ' ')`) because modern ICU inserts a narrow
no-break space (U+202F) before AM/PM. Token output has no such spaces and can be
compared exactly.
