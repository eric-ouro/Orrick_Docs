import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "dist");

const entries = [
  "index.html",
  "app.js",
  "styles.css",
  "config.js",
  "data",
  "sources"
];

await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

for (const entry of entries) {
  await cp(join(root, entry), join(outDir, entry), { recursive: true });
}

await cp(join(root, "public"), outDir, { recursive: true });
