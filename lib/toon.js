"use strict";

/**
 * TOON (Token-Oriented Object Notation) Encoder
 * 
 * High-efficiency, zero-dependency serialization format engineered to reduce
 * LLM token consumption by stripping structural overhead (braces, quotes, repeated keys).
 */

function isObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function escapeValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes("\n")) {
    return `"${str.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  if (str.includes(",")) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * Encodes an array of objects into TOON tabular format:
 *   name[count]{col1,col2}:
 *   val1,val2
 */
function encodeArray(name, arr, depth = 0) {
  if (arr.length === 0) {
    return `${"  ".repeat(depth)}${name}[0]:`;
  }

  const allAreObjects = arr.every(isObject);
  if (allAreObjects) {
    // Collect all keys across elements maintaining insertion order
    const keys = Array.from(new Set(arr.flatMap((item) => Object.keys(item))));
    const header = `${"  ".repeat(depth)}${name}[${arr.length}]{${keys.join(",")}}:`;
    const rows = arr.map((item) => {
      const lineValues = keys.map((k) => escapeValue(item[k]));
      return `${"  ".repeat(depth)}${lineValues.join(",")}`;
    });
    return [header, ...rows].join("\n");
  }

  // Primitive array
  const header = `${"  ".repeat(depth)}${name}[${arr.length}]:`;
  const items = arr.map((item) => `${"  ".repeat(depth + 1)}- ${escapeValue(item)}`);
  return [header, ...items].join("\n");
}

/**
 * Encodes an object or array into TOON string representation.
 * 
 * @param {any} data Data to serialize
 * @param {string} [rootName="data"] Name of root node
 * @returns {string} TOON formatted string
 */
function encodeToon(data, rootName = "data") {
  if (Array.isArray(data)) {
    return encodeArray(rootName, data, 0);
  }

  if (!isObject(data)) {
    return `${rootName}: ${escapeValue(data)}`;
  }

  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      lines.push(encodeArray(key, value, 0));
    } else if (isObject(value)) {
      lines.push(`${key}:`);
      const subToon = encodeToon(value, key);
      const indented = subToon
        .split("\n")
        .map((line) => "  " + line)
        .join("\n");
      lines.push(indented);
    } else {
      lines.push(`${key}: ${escapeValue(value)}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  encodeToon,
  escapeValue
};
