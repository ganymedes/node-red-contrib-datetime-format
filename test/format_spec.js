"use strict";

const should = require("should");
const { DateTime } = require("luxon");
const {
  parseToDateTime,
  formatDateTime,
  buildJsonResult,
  isValidZone,
} = require("../lib/format");

// 2023-11-14T22:13:20Z — a well-known epoch value.
const MS = 1700000000000;
const S = 1700000000;

// Collapse all whitespace so assertions are robust against the narrow
// no-break space (U+202F) modern ICU inserts before AM/PM.
function norm(s) {
  return s.replace(/\s+/g, " ").trim();
}

describe("lib/format", function () {
  describe("parseToDateTime", function () {
    it("parses epoch milliseconds in a given zone", function () {
      const dt = parseToDateTime(MS, { unit: "ms", zone: "UTC" });
      dt.isValid.should.be.true();
      dt.toFormat("yyyy-LL-dd HH:mm:ss").should.equal("2023-11-14 22:13:20");
    });

    it("auto-detects seconds vs milliseconds", function () {
      parseToDateTime(S, { unit: "auto", zone: "UTC" })
        .toFormat("yyyy-LL-dd HH:mm:ss")
        .should.equal("2023-11-14 22:13:20");
      parseToDateTime(MS, { unit: "auto", zone: "UTC" })
        .toFormat("yyyy-LL-dd HH:mm:ss")
        .should.equal("2023-11-14 22:13:20");
    });

    it("honours a forced unit overriding the heuristic", function () {
      // The seconds value forced as milliseconds is a 1970 date.
      parseToDateTime(S, { unit: "ms", zone: "UTC" }).year.should.equal(1970);
    });

    it("parses numeric strings as epoch", function () {
      parseToDateTime(String(MS), { unit: "auto", zone: "UTC" })
        .toFormat("yyyy-LL-dd")
        .should.equal("2023-11-14");
    });

    it("parses ISO 8601 strings", function () {
      parseToDateTime("2026-06-22T14:30:00Z", { zone: "UTC" })
        .toFormat("yyyy-LL-dd HH:mm:ss")
        .should.equal("2026-06-22 14:30:00");
    });

    it("parses Date objects", function () {
      parseToDateTime(new Date(MS), { zone: "UTC" })
        .toFormat("yyyy-LL-dd HH:mm:ss")
        .should.equal("2023-11-14 22:13:20");
    });

    it("converts to the requested zone", function () {
      parseToDateTime(MS, { unit: "ms", zone: "Asia/Tokyo" })
        .toFormat("yyyy-LL-dd HH:mm:ss")
        .should.equal("2023-11-15 07:13:20");
    });

    it("returns an invalid DateTime for unparseable input", function () {
      parseToDateTime("not a date", {}).isValid.should.be.false();
      parseToDateTime({}, {}).isValid.should.be.false();
      parseToDateTime(null, {}).isValid.should.be.false();
      parseToDateTime(undefined, {}).isValid.should.be.false();
      parseToDateTime(true, {}).isValid.should.be.false();
    });
  });

  describe("formatDateTime", function () {
    const dt = DateTime.fromMillis(MS, { zone: "UTC" });

    it("formats with a custom token string", function () {
      formatDateTime(dt, {
        formatType: "token",
        token: "yyyy-LL-dd HH:mm:ss",
      }).should.equal("2023-11-14 22:13:20");
    });

    it("formats with a named preset", function () {
      norm(
        formatDateTime(dt, {
          formatType: "preset",
          preset: "DATETIME_MED",
          locale: "en-US",
        })
      ).should.equal("Nov 14, 2023, 10:13 PM");
    });

    it("falls back to DATETIME_MED for an unknown preset", function () {
      norm(
        formatDateTime(dt, {
          formatType: "preset",
          preset: "NOPE",
          locale: "en-US",
        })
      ).should.equal("Nov 14, 2023, 10:13 PM");
    });

    it("supports the seconds-bearing preset variants", function () {
      norm(
        formatDateTime(dt, {
          formatType: "preset",
          preset: "DATETIME_MED_WITH_SECONDS",
          locale: "en-US",
        })
      ).should.equal("Nov 14, 2023, 10:13:20 PM");
    });

    it("respects the locale", function () {
      formatDateTime(dt, {
        formatType: "preset",
        preset: "DATE_SHORT",
        locale: "de",
      }).should.equal("14.11.2023");
      formatDateTime(dt, {
        formatType: "preset",
        preset: "DATE_SHORT",
        locale: "en-US",
      }).should.equal("11/14/2023");
    });
  });

  describe("buildJsonResult", function () {
    const dt = DateTime.fromMillis(MS, { zone: "UTC" });

    it("returns the rich object with all representations", function () {
      const result = buildJsonResult(dt, {
        formatType: "preset",
        preset: "DATETIME_MED",
        locale: "en-US",
      });
      result.should.have.property("epoch", 1700000000000);
      result.should.have.property("seconds", 1700000000);
      result.should.have.property("iso", "2023-11-14T22:13:20.000Z");
      result.should.have.property("zone", "UTC");
      result.should.have.property("locale", "en-US");
      norm(result.formatted).should.equal("Nov 14, 2023, 10:13 PM");
    });

    it("formats with custom tokens when requested", function () {
      buildJsonResult(dt, {
        formatType: "token",
        token: "yyyy-LL-dd HH:mm:ss",
      }).formatted.should.equal("2023-11-14 22:13:20");
    });
  });

  describe("isValidZone", function () {
    it("treats blank/undefined as valid (system local)", function () {
      isValidZone("").should.be.true();
      isValidZone("   ").should.be.true();
      isValidZone(undefined).should.be.true();
    });

    it("accepts valid IANA zones", function () {
      isValidZone("Europe/Zurich").should.be.true();
      isValidZone("UTC").should.be.true();
    });

    it("rejects invalid zones", function () {
      isValidZone("Mars/Phobos").should.be.false();
    });
  });
});
