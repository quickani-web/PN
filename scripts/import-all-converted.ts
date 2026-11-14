import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";

const dir = path.join("imports", "converted");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".csv"))
  .map((f) => path.join(dir, f));

if (!files.length) {
  console.error("No converted CSV files found in imports/converted");
  process.exit(1);
}

console.log("Seeding categories first...");
let result = spawnSync("npx", ["tsx", "scripts/seed-categories.ts"], {
  stdio: "inherit",
  shell: true,
});
if (result.status !== 0) process.exit(result.status || 1);

for (const file of files) {
  console.log(`\nImporting ${file}...`);
  result = spawnSync("npx", ["tsx", "scripts/import-listings.ts", file], {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`Import failed for ${file}`);
    process.exit(result.status || 1);
  }
}

console.log("\nAll converted files imported.");
