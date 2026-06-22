"use strict";

/**
 * Pure datetime parsing / formatting helpers built on Luxon.
 *
 * These functions have NO dependency on the Node-RED runtime so they can be
 * unit-tested directly. The Node-RED node (../datetime-format.js) is a thin
 * wrapper around them.
 */

const { DateTime } = require("luxon");

/**
 * Named Luxon presets exposed in the editor. The values are the preset format
 * objects Luxon understands via DateTime#toLocaleString.
 */
const PRESETS = {
  DATE_SHORT: DateTime.DATE_SHORT,
  DATE_MED: DateTime.DATE_MED,
  DATE_MED_WITH_WEEKDAY: DateTime.DATE_MED_WITH_WEEKDAY,
  DATE_FULL: DateTime.DATE_FULL,
  DATE_HUGE: DateTime.DATE_HUGE,
  TIME_SIMPLE: DateTime.TIME_SIMPLE,
  TIME_WITH_SECONDS: DateTime.TIME_WITH_SECONDS,
  TIME_24_SIMPLE: DateTime.TIME_24_SIMPLE,
  TIME_24_WITH_SECONDS: DateTime.TIME_24_WITH_SECONDS,
  DATETIME_SHORT: DateTime.DATETIME_SHORT,
  DATETIME_MED: DateTime.DATETIME_MED,
  DATETIME_MED_WITH_WEEKDAY: DateTime.DATETIME_MED_WITH_WEEKDAY,
  DATETIME_FULL: DateTime.DATETIME_FULL,
  DATETIME_HUGE: DateTime.DATETIME_HUGE,
};

const DEFAULT_TOKEN = "yyyy-LL-dd HH:mm:ss";

/**
 * Returns true if `tz` is a usable IANA zone name. A blank/empty value is
 * considered valid and means "use the system local zone".
 *
 * @param {string} [tz]
 * @returns {boolean}
 */
function isValidZone(tz) {
  if (tz === undefined || tz === null || String(tz).trim() === "") {
    return true;
  }
  return DateTime.local().setZone(String(tz).trim()).isValid;
}

/**
 * Normalise a (possibly blank) zone value into something the Luxon `zone`
 * option accepts. Blank => undefined (system local).
 *
 * @param {string} [tz]
 * @returns {string|undefined}
 */
function normaliseZone(tz) {
  if (tz === undefined || tz === null) return undefined;
  const trimmed = String(tz).trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Parse an arbitrary "datetime-ish" value into a Luxon DateTime, displayed in
 * the requested zone.
 *
 * Accepts:
 *   - JS Date objects
 *   - epoch numbers / numeric strings (ms or seconds, auto-detected)
 *   - ISO 8601 strings (with RFC2822 / native Date fallback)
 *
 * The returned DateTime may be invalid (check `.isValid`) when the input could
 * not be understood — the caller decides how to surface that.
 *
 * @param {*} raw
 * @param {{ unit?: ('auto'|'ms'|'s'), zone?: string }} [opts]
 * @returns {import("luxon").DateTime}
 */
function parseToDateTime(raw, opts) {
  const unit = (opts && opts.unit) || "auto";
  const zone = normaliseZone(opts && opts.zone);
  const luxonOpts = zone ? { zone } : {};

  // Already a Date instance.
  if (raw instanceof Date) {
    return DateTime.fromJSDate(raw, luxonOpts);
  }

  // Numbers and numeric strings are treated as epoch values.
  const asNumber = toEpochNumber(raw);
  if (asNumber !== null) {
    return fromEpoch(asNumber, unit, luxonOpts);
  }

  // Everything else: try to parse as a string.
  if (typeof raw === "string") {
    const str = raw.trim();
    let dt = DateTime.fromISO(str, luxonOpts);
    if (dt.isValid) return dt;

    dt = DateTime.fromRFC2822(str, luxonOpts);
    if (dt.isValid) return dt;

    // Last resort: hand it to the native Date parser.
    const native = new Date(str);
    if (!isNaN(native.getTime())) {
      return DateTime.fromJSDate(native, luxonOpts);
    }
    return dt; // invalid DateTime, carries an invalidReason
  }

  // Unsupported type (boolean, object, null, undefined, ...).
  return DateTime.invalid("unparseable input", "unsupported value type");
}

/**
 * Coerce a value to an epoch number if it sensibly represents one, otherwise
 * return null. Real numbers pass through; purely numeric strings are parsed.
 *
 * @param {*} raw
 * @returns {number|null}
 */
function toEpochNumber(raw) {
  if (typeof raw === "number" && isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const str = raw.trim();
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      const n = Number(str);
      return isFinite(n) ? n : null;
    }
  }
  return null;
}

/**
 * Build a DateTime from an epoch value, choosing ms vs seconds.
 *
 * @param {number} value
 * @param {'auto'|'ms'|'s'} unit
 * @param {object} luxonOpts
 * @returns {import("luxon").DateTime}
 */
function fromEpoch(value, unit, luxonOpts) {
  let resolved = unit;
  if (unit === "auto") {
    // <= 10 integer digits => seconds (covers dates up to year ~5138),
    // otherwise milliseconds.
    const digits = Math.trunc(Math.abs(value)).toString().length;
    resolved = digits <= 10 ? "s" : "ms";
  }
  return resolved === "s"
    ? DateTime.fromSeconds(value, luxonOpts)
    : DateTime.fromMillis(value, luxonOpts);
}

/**
 * Format a Luxon DateTime into a human-readable string.
 *
 * @param {import("luxon").DateTime} dt
 * @param {{ formatType?: ('preset'|'token'), preset?: string, token?: string, locale?: string }} [opts]
 * @returns {string}
 */
function formatDateTime(dt, opts) {
  const formatType = (opts && opts.formatType) || "preset";
  const preset = (opts && opts.preset) || "DATETIME_MED";
  const token = (opts && opts.token) || DEFAULT_TOKEN;
  const locale = opts && opts.locale ? String(opts.locale).trim() : "";

  let d = dt;
  if (locale) {
    d = d.setLocale(locale);
  }

  if (formatType === "token") {
    return d.toFormat(token);
  }

  const fmt = PRESETS[preset] || DateTime.DATETIME_MED;
  return d.toLocaleString(fmt);
}

module.exports = {
  PRESETS,
  DEFAULT_TOKEN,
  isValidZone,
  normaliseZone,
  parseToDateTime,
  formatDateTime,
};
