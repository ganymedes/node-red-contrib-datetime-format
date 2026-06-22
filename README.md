# node-red-contrib-datetime-format

A [Node-RED](https://nodered.org/) node that formats datetime values — the
epoch timestamps, ISO strings and `Date` objects that flow through Node-RED —
into **human-readable** strings, with a configurable **timezone**, **locale**
and **output format**.

Powered by [Luxon](https://moment.github.io/luxon/).

## Features

- **Flexible input** — reads from any `msg`/`flow`/`global` property (default
  `msg.payload`) and auto-detects the value type:
  - epoch **milliseconds** or **seconds** (auto-detected, or forced),
  - **ISO 8601** strings (e.g. `2026-06-22T14:30:00Z`),
  - JavaScript `Date` objects.
- **Configurable timezone** — any IANA name (e.g. `Europe/Zurich`,
  `Asia/Tokyo`). Blank uses the server's local timezone.
- **Configurable locale** — any BCP 47 locale (e.g. `de-CH`) for localised
  month/day names and ordering.
- **Two formatting modes**:
  - **Presets** — named formats such as `DATETIME_MED` (e.g. *Jun 22, 2026,
    2:30 PM*),
  - **Custom tokens** — Luxon format strings such as `yyyy-LL-dd HH:mm:ss`.
- **Configurable output** — writes to any `msg`/`flow`/`global` property
  (default `msg.payload`), leaving everything else untouched.
- **Robust errors** — unparseable input or an invalid timezone raises a
  catchable error (use a *Catch* node) and shows a red status; the flow keeps
  running.

## Installation

From your Node-RED user directory (typically `~/.node-red`):

```bash
npm install node-red-contrib-datetime-format
```

Or, to install this checkout locally for development:

```bash
cd ~/.node-red
npm install /path/to/this/repo
```

Then restart Node-RED. The **datetime format** node appears in the *function*
category of the palette.

## Usage

Wire it after any node that emits a datetime. For example:

```
[ inject (timestamp) ] → [ datetime format ] → [ debug ]
```

### Configuration

| Field          | Description                                                                                 | Default                |
| -------------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| **Input**      | Property to read the datetime from (`msg` / `flow` / `global`).                             | `msg.payload`          |
| **Epoch unit** | How to interpret numeric input: `Auto-detect`, `Milliseconds`, or `Seconds`.               | `Auto-detect`          |
| **Timezone**   | IANA timezone name. Blank = server local time.                                              | *(blank → local)*      |
| **Locale**     | BCP 47 locale for names/ordering. Blank = system default.                                   | *(blank → default)*    |
| **Format**     | `Preset` (named format) or `Custom tokens` (Luxon format string).                          | `Preset`               |
| **Preset**     | The named preset to use (shown when *Format* = Preset).                                      | `DATETIME_MED`         |
| **Tokens**     | The Luxon token string (shown when *Format* = Custom tokens).                                | `yyyy-LL-dd HH:mm:ss`  |
| **Output**     | Property to write the formatted string to (`msg` / `flow` / `global`).                      | `msg.payload`          |

### Input

The input value (default `msg.payload`) may be:

| Type            | Example                          | Notes                                                |
| --------------- | -------------------------------- | ---------------------------------------------------- |
| epoch ms        | `1700000000000`                  | 13+ digits → milliseconds in auto mode               |
| epoch seconds   | `1700000000`                     | ≤ 10 digits → seconds in auto mode                   |
| numeric string  | `"1700000000000"`                | parsed as epoch                                      |
| ISO 8601 string | `"2026-06-22T14:30:00+02:00"`    | offset honoured, then converted to the target zone   |
| `Date` object   | `new Date()`                     |                                                      |

### Output

The formatted string is written to the configured **Output** property. With the
defaults, `msg.payload` is replaced by the formatted string.

### Presets

| Preset                      | Example (en-US, `Europe/Zurich`)                  |
| --------------------------- | ------------------------------------------------- |
| `DATE_SHORT`                | 6/22/2026                                         |
| `DATE_MED`                  | Jun 22, 2026                                      |
| `DATE_MED_WITH_WEEKDAY`     | Mon, Jun 22, 2026                                 |
| `DATE_FULL`                 | June 22, 2026                                     |
| `DATE_HUGE`                 | Monday, June 22, 2026                             |
| `TIME_SIMPLE`               | 2:30 PM                                           |
| `TIME_WITH_SECONDS`         | 2:30:45 PM                                        |
| `TIME_24_SIMPLE`            | 14:30                                             |
| `TIME_24_WITH_SECONDS`      | 14:30:45                                          |
| `DATETIME_SHORT`            | 6/22/2026, 2:30 PM                                |
| `DATETIME_MED`              | Jun 22, 2026, 2:30 PM                             |
| `DATETIME_MED_WITH_WEEKDAY` | Mon, Jun 22, 2026, 2:30 PM                        |
| `DATETIME_FULL`             | June 22, 2026 at 2:30 PM GMT+2                     |
| `DATETIME_HUGE`             | Monday, June 22, 2026 at 2:30:45 PM GMT+2         |

### Custom tokens

Select **Custom tokens** and supply a Luxon format string. A few common tokens:

| Token  | Meaning                | Example |
| ------ | ---------------------- | ------- |
| `yyyy` | 4-digit year           | 2026    |
| `LL`   | 2-digit month          | 06      |
| `LLLL` | full month name        | June    |
| `dd`   | 2-digit day            | 22      |
| `HH`   | 2-digit hour (24h)     | 14      |
| `hh`   | 2-digit hour (12h)     | 02      |
| `mm`   | minutes                | 30      |
| `ss`   | seconds                | 45      |
| `a`    | AM/PM                  | PM      |
| `ZZZZ` | timezone abbreviation  | CEST    |

See the full [Luxon token table](https://moment.github.io/luxon/#/formatting?id=table-of-tokens).

## Examples

| Input (`msg.payload`)   | Timezone        | Format / Tokens          | Output (`msg.payload`)        |
| ----------------------- | --------------- | ------------------------ | ----------------------------- |
| `1700000000000`         | `UTC`           | `yyyy-LL-dd HH:mm:ss`    | `2023-11-14 22:13:20`         |
| `1700000000000`         | `Asia/Tokyo`    | `yyyy-LL-dd HH:mm:ss`    | `2023-11-15 07:13:20`         |
| `1700000000000`         | `UTC` (en-US)   | Preset `DATETIME_MED`    | `Nov 14, 2023, 10:13 PM`      |
| `"2026-06-22T14:30:00Z"`| `Europe/Zurich` | `dd.LL.yyyy HH:mm`       | `22.06.2026 16:30`            |

## Development

```bash
npm install      # install luxon + dev dependencies
npm test         # run the mocha test suite
```

The runtime is split into:

- [`lib/format.js`](lib/format.js) — pure parse/format helpers (no Node-RED
  dependency, directly unit-tested),
- [`datetime-format.js`](datetime-format.js) — the thin Node-RED runtime
  wrapper,
- [`datetime-format.html`](datetime-format.html) — the editor UI and help.

Tests live in [`test/`](test/) and use
[`node-red-node-test-helper`](https://github.com/node-red/node-red-node-test-helper).

## License

[MIT](LICENSE)
