const fs = require("fs");
const path = require("path");

function stringifyYaml(obj, indent = 0) {
  const spaces = " ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "boolean" || typeof obj === "number") {
    return String(obj);
  }

  if (typeof obj === "string") {
    // If multiline or has special YAML characters, safely escape with JSON quote
    if (
      obj.includes("\n") ||
      obj.includes(":") ||
      obj.includes("#") ||
      obj.includes('"') ||
      obj.includes("'") ||
      obj.startsWith(" ") ||
      obj.endsWith(" ") ||
      obj === "" ||
      /^[0-9]/.test(obj) ||
      ["true", "false", "null", "yes", "no", "on", "off"].includes(obj.toLowerCase())
    ) {
      return JSON.stringify(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj
      .map((item) => {
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          const keys = Object.keys(item);
          if (keys.length === 0) return `${spaces}- {}`;
          const firstKey = keys[0];
          const firstVal = item[firstKey];
          const restKeys = keys.slice(1);

          let firstLine = "";
          if (typeof firstVal === "object" && firstVal !== null) {
            firstLine = `${spaces}- ${firstKey}:\n${stringifyYaml(firstVal, indent + 4)}`;
          } else {
            firstLine = `${spaces}- ${firstKey}: ${stringifyYaml(firstVal, 0)}`;
          }

          const restLines = restKeys
            .map((k) => {
              const v = item[k];
              if (typeof v === "object" && v !== null) {
                return `${spaces}  ${k}:\n${stringifyYaml(v, indent + 4)}`;
              } else {
                return `${spaces}  ${k}: ${stringifyYaml(v, 0)}`;
              }
            })
            .join("\n");

          return restLines ? `${firstLine}\n${restLines}` : firstLine;
        } else if (Array.isArray(item)) {
          return `${spaces}-\n${stringifyYaml(item, indent + 2)}`;
        } else {
          return `${spaces}- ${stringifyYaml(item, 0)}`;
        }
      })
      .join("\n");
  }

  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    return keys
      .map((key) => {
        const val = obj[key];
        const formattedKey = /^[a-zA-Z0-9_.-]+$/.test(key) ? key : JSON.stringify(key);

        if (typeof val === "object" && val !== null) {
          if (Array.isArray(val) && val.length === 0) {
            return `${spaces}${formattedKey}: []`;
          }
          if (!Array.isArray(val) && Object.keys(val).length === 0) {
            return `${spaces}${formattedKey}: {}`;
          }
          return `${spaces}${formattedKey}:\n${stringifyYaml(val, indent + 2)}`;
        } else {
          return `${spaces}${formattedKey}: ${stringifyYaml(val, 0)}`;
        }
      })
      .join("\n");
  }

  return String(obj);
}

const openapiJsonPath = path.join(__dirname, "../openapi.json");
const openapiData = JSON.parse(fs.readFileSync(openapiJsonPath, "utf8"));

const yamlContent = stringifyYaml(openapiData);

fs.writeFileSync(path.join(__dirname, "../openapi.yaml"), yamlContent, "utf8");
fs.writeFileSync(path.join(__dirname, "../documentation/openapi.yaml"), yamlContent, "utf8");

console.log("✅ Successfully converted openapi.json to openapi.yaml and documentation/openapi.yaml");
