const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const openapiJsonPath = path.join(rootDir, "openapi.json");
const docOpenapiJsonPath = path.join(rootDir, "documentation/openapi.json");
const openapiYamlPath = path.join(rootDir, "openapi.yaml");
const docOpenapiYamlPath = path.join(rootDir, "documentation/openapi.yaml");

const spec = JSON.parse(fs.readFileSync(openapiJsonPath, "utf8"));

// 1. Fix MultiBatchResponse references to use PostItem and EventItem
if (spec.components?.schemas?.MultiBatchResponse?.properties?.data?.properties) {
  spec.components.schemas.MultiBatchResponse.properties.data.properties.posts.items = {
    $ref: "#/components/schemas/PostItem",
  };
  spec.components.schemas.MultiBatchResponse.properties.data.properties.events.items = {
    $ref: "#/components/schemas/EventItem",
  };
  spec.components.schemas.MultiBatchResponse.properties.data.properties.games.items = {
    $ref: "#/components/schemas/EventItem",
  };
}

// 2. Also add Post and Event aliases into components.schemas to guarantee any external or legacy references resolve
if (!spec.components.schemas.Post && spec.components.schemas.PostItem) {
  spec.components.schemas.Post = { ...spec.components.schemas.PostItem };
}

if (!spec.components.schemas.Event && spec.components.schemas.EventItem) {
  spec.components.schemas.Event = { ...spec.components.schemas.EventItem };
}

// Save JSON files
const formattedJson = JSON.stringify(spec, null, 2);
fs.writeFileSync(openapiJsonPath, formattedJson, "utf8");
fs.writeFileSync(docOpenapiJsonPath, formattedJson, "utf8");

// Convert to YAML
function stringifyYaml(obj, indent = 0) {
  const spaces = " ".repeat(indent);

  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "boolean" || typeof obj === "number") return String(obj);

  if (typeof obj === "string") {
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

const yamlContent = stringifyYaml(spec);
fs.writeFileSync(openapiYamlPath, yamlContent, "utf8");
fs.writeFileSync(docOpenapiYamlPath, yamlContent, "utf8");

console.log("✅ Fixed all references and regenerated JSON and YAML specs.");
