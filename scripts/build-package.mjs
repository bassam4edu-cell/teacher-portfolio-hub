// Preserve original bytes; prepare a portable evidence package without API keys.
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, extname, basename } from "node:path";
import { createHash, randomUUID } from "node:crypto";
const [manifestPath, outputPath] = process.argv.slice(2);
if (!manifestPath || !outputPath) {
  console.error("Usage: node scripts/build-package.mjs manifest.json output.json");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const { files = [], ...input } = manifest;
if (
  !["create", "update", "attach", "archive", "restore", "settings", "progress"].includes(
    input.operation,
  )
)
  throw new Error("Unsupported operation");
const mime = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};
if (files.length > 30) throw new Error("Maximum 30 attachments per package");
const attachments = files.map((file) => {
  const path = resolve(dirname(resolve(manifestPath)), file);
  const type = mime[extname(path).toLowerCase()];
  if (!type) throw new Error("Only JPEG, PNG, WebP, PDF are supported");
  const size = statSync(path).size;
  if (size < 1 || size > 20 * 1024 * 1024) throw new Error("Maximum file size is 20 MiB");
  const bytes = readFileSync(path);
  return {
    name: basename(path),
    mime: type,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    base64: bytes.toString("base64"),
  };
});
const pack = {
  ...input,
  schema_version: 1,
  request_id: input.request_id ?? randomUUID(),
  ...(attachments.length ? { attachments } : {}),
};
const output = JSON.stringify(pack, null, 2);
if (Buffer.byteLength(output) > 100 * 1024 * 1024)
  throw new Error("Package exceeds 100 MiB; split into attach operations");
writeFileSync(outputPath, output, { flag: "wx", mode: 0o600 });
console.log(
  `Prepared ${attachments.length} unchanged originals in ${outputPath}. This command does not upload or import anything.`,
);
