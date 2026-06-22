"use strict";

const should = require("should");
const helper = require("node-red-node-test-helper");
const datetimeNode = require("../datetime-format.js");

helper.init(require.resolve("node-red"));

// 2023-11-14T22:13:20Z
const MS = 1700000000000;
const S = 1700000000;

function norm(s) {
  return s.replace(/\s+/g, " ").trim();
}

describe("datetime-format node", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload().then(function () {
      helper.stopServer(done);
    });
  });

  function load(nodeConfig, cb) {
    const flow = [
      Object.assign(
        { id: "n1", type: "datetime-format", wires: [["n2"]] },
        nodeConfig
      ),
      { id: "n2", type: "helper" },
    ];
    helper.load(datetimeNode, flow, function () {
      cb(helper.getNode("n1"), helper.getNode("n2"));
    });
  }

  it("loads with the expected defaults", function (done) {
    load({ name: "fmt" }, function (n1) {
      try {
        n1.should.have.property("name", "fmt");
        n1.should.have.property("inputProp", "payload");
        n1.should.have.property("formatType", "preset");
        n1.should.have.property("preset", "DATETIME_MED");
        n1.should.have.property("outputProp", "payload");
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("formats epoch milliseconds to a token string in a fixed zone", function (done) {
    load(
      { tz: "UTC", formatType: "token", tokenFormat: "yyyy-LL-dd HH:mm:ss" },
      function (n1, n2) {
        n2.on("input", function (msg) {
          try {
            msg.payload.should.equal("2023-11-14 22:13:20");
            done();
          } catch (e) {
            done(e);
          }
        });
        n1.receive({ payload: MS });
      }
    );
  });

  it("auto-detects epoch seconds", function (done) {
    load(
      {
        tz: "UTC",
        inputUnit: "auto",
        formatType: "token",
        tokenFormat: "yyyy-LL-dd HH:mm:ss",
      },
      function (n1, n2) {
        n2.on("input", function (msg) {
          try {
            msg.payload.should.equal("2023-11-14 22:13:20");
            done();
          } catch (e) {
            done(e);
          }
        });
        n1.receive({ payload: S });
      }
    );
  });

  it("formats with a preset and locale", function (done) {
    load(
      { tz: "UTC", locale: "en-US", formatType: "preset", preset: "DATETIME_MED" },
      function (n1, n2) {
        n2.on("input", function (msg) {
          try {
            norm(msg.payload).should.equal("Nov 14, 2023, 10:13 PM");
            done();
          } catch (e) {
            done(e);
          }
        });
        n1.receive({ payload: MS });
      }
    );
  });

  it("applies the timezone override", function (done) {
    load(
      { tz: "Asia/Tokyo", formatType: "token", tokenFormat: "yyyy-LL-dd HH:mm:ss" },
      function (n1, n2) {
        n2.on("input", function (msg) {
          try {
            msg.payload.should.equal("2023-11-15 07:13:20");
            done();
          } catch (e) {
            done(e);
          }
        });
        n1.receive({ payload: MS });
      }
    );
  });

  it("reads from and writes to custom message properties", function (done) {
    load(
      {
        inputProp: "ts",
        inputPropType: "msg",
        outputProp: "human",
        outputPropType: "msg",
        tz: "UTC",
        formatType: "token",
        tokenFormat: "yyyy-LL-dd",
      },
      function (n1, n2) {
        n2.on("input", function (msg) {
          try {
            msg.human.should.equal("2023-11-14");
            msg.ts.should.equal(MS); // original input untouched
            msg.should.not.have.property("payload");
            done();
          } catch (e) {
            done(e);
          }
        });
        n1.receive({ ts: MS });
      }
    );
  });

  it("reports a catchable error and red status on invalid input", function (done) {
    load(
      { tz: "UTC", formatType: "token", tokenFormat: "yyyy-LL-dd" },
      function (n1) {
        n1.on("call:status", function (call) {
          try {
            call.firstArg.should.have.property("fill", "red");
            done();
          } catch (e) {
            done(e);
          }
        });
        n1.receive({ payload: "definitely not a date" });
      }
    );
  });

  it("reports an error on an invalid timezone", function (done) {
    load({ tz: "Mars/Phobos", formatType: "token", tokenFormat: "yyyy" }, function (
      n1
    ) {
      n1.on("call:status", function (call) {
        try {
          call.firstArg.should.have.property("fill", "red");
          done();
        } catch (e) {
          done(e);
        }
      });
      n1.receive({ payload: MS });
    });
  });
});
