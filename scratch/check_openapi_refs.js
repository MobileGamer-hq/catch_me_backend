const fs = require("fs");
const path = require("path");

const openapiPath = path.join(__dirname, "../openapi.json");
const spec = JSON.parse(fs.readFileSync(openapiPath, "utf8"));

const refs = [];

function findRefs(obj, currentPath = "") {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => findRefs(item, `${currentPath}[${index}]`));
    return;
  }

  for (const key of Object.keys(obj)) {
    if (key === "$ref" && typeof obj[key] === "string") {
      refs.push({ ref: obj[key], at: currentPath });
    } else {
      findRefs(obj[key], `${currentPath}.${key}`);
    }
  }
}

findRefs(spec);

console.log(`Found ${refs.length} $ref references across the OpenAPI spec.`);

const missingRefs = [];

for (const { ref, at } of refs) {
  if (!ref.startsWith("#/")) {
    missingRefs.push({ ref, at, reason: "External reference" });
    continue;
  }

  const parts = ref.replace("#/", "").split("/");
  let current = spec;
  let missing = false;

  for (const part of parts) {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else {
      missing = true;
      break;
    }
  }

  if (missing) {
    missingRefs.push({ ref, at });
  }
}

console.log(`\n--- Verification Results ---`);
if (missingRefs.length === 0) {
  console.log("✅ All $ref references resolve successfully!");
} else {
  console.error(`❌ Found ${missingRefs.length} unresolved references:`);
  missingRefs.forEach(({ ref, at }) => {
    console.error(`  - Missing: "${ref}" (referenced at: ${at})`);
  });
}
