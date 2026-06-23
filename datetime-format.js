"use strict";

const {
  parseToDateTime,
  formatDateTime,
  buildJsonResult,
  isValidZone,
} = require("./lib/format");

module.exports = function (RED) {
  function DatetimeFormatNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Read configuration with sensible defaults (mirrors the editor defaults).
    node.inputProp = config.inputProp || "payload";
    node.inputPropType = config.inputPropType || "msg";
    node.inputUnit = config.inputUnit || "auto";
    node.tz = config.tz || "";
    node.locale = config.locale || "";
    node.formatType = config.formatType || "preset";
    node.preset = config.preset || "DATETIME_MED";
    node.tokenFormat = config.tokenFormat || "yyyy-LL-dd HH:mm:ss";
    node.outputProp = config.outputProp || "payload";
    node.outputPropType = config.outputPropType || "msg";
    node.asJson = config.asJson || false;

    node.on("input", function (msg, send, done) {
      // Backwards compatibility with Node-RED < 1.0 where send/done are absent.
      send = send || function () { node.send.apply(node, arguments); };
      done = done || function (err) { if (err) { node.error(err, msg); } };

      try {
        if (!isValidZone(node.tz)) {
          fail(node, done, msg, "Invalid timezone: " + node.tz);
          return;
        }

        RED.util.evaluateNodeProperty(
          node.inputProp,
          node.inputPropType,
          node,
          msg,
          function (err, rawValue) {
            if (err) {
              fail(node, done, msg, err);
              return;
            }

            const dt = parseToDateTime(rawValue, {
              unit: node.inputUnit,
              zone: node.tz,
            });

            if (!dt.isValid) {
              fail(
                node,
                done,
                msg,
                "Could not parse datetime: " + (dt.invalidReason || "invalid input")
              );
              return;
            }

            const fmtOpts = {
              formatType: node.formatType,
              preset: node.preset,
              token: node.tokenFormat,
              locale: node.locale,
            };
            const result = node.asJson
              ? buildJsonResult(dt, fmtOpts)
              : formatDateTime(dt, fmtOpts);
            const statusText = node.asJson ? result.formatted : result;

            writeOutput(node, msg, result, function (writeErr) {
              if (writeErr) {
                fail(node, done, msg, writeErr);
                return;
              }
              node.status({ fill: "green", shape: "dot", text: statusText });
              send(msg);
              done();
            });
          }
        );
      } catch (err) {
        fail(node, done, msg, err);
      }
    });

    node.on("close", function () {
      node.status({});
    });
  }

  /**
   * Write the formatted value to the configured destination (msg / flow / global).
   */
  function writeOutput(node, msg, value, cb) {
    if (node.outputPropType === "msg") {
      RED.util.setMessageProperty(msg, node.outputProp, value, true);
      cb();
      return;
    }
    const ctx =
      node.outputPropType === "flow"
        ? node.context().flow
        : node.context().global;
    ctx.set(node.outputProp, value, cb);
  }

  /**
   * Report an error in a way that is catchable by a Catch node and shows a red
   * status, without halting the flow. Reporting via node.error(msg) triggers
   * any wired Catch node; done() then marks message handling complete.
   */
  function fail(node, done, msg, err) {
    const message = err instanceof Error ? err.message : String(err);
    node.status({ fill: "red", shape: "ring", text: message });
    node.error(message, msg);
    done();
  }

  RED.nodes.registerType("datetime-format", DatetimeFormatNode);
};
