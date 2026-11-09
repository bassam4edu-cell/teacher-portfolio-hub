// Safe SQL transport for the existing administrative Lovable connector.
// Do not execute against production until the schema is approved and installed.
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Usage: node scripts/build-admin-query.mjs ready-package.json output.sql");
const packageText = JSON.stringify(JSON.parse(readFileSync(input, "utf8")));
if (Buffer.byteLength(packageText) > 100 * 1024 * 1024) throw new Error("Package exceeds 100 MiB");
let tag;
do {
  tag = "$package_" + randomBytes(16).toString("hex") + "$";
} while (packageText.includes(tag));
writeFileSync(
  output,
  `select public.portfolio_admin_import(${tag}${packageText}${tag}::jsonb);\n`,
  { flag: "wx", mode: 0o600 },
);
console.log(`Prepared administrative import query in ${output}; no query has been executed.`);
