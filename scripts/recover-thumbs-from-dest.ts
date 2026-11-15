/**
 * For listings with dead/hotlinked thumbs, open destination_url in Chrome,
 * grab og:image, download into Supabase Storage, update videos.thumbnail_url.
 *
 *   npx tsx scripts/recover-thumbs-from-dest.ts
 *   npx tsx scripts/recover-thumbs-from-dest.ts --limit=200 --tabs=3
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import {
  downloadAndStoreThumb,
  ensureThumbBucket,
  isStoredThumbUrl,
} from "./lib/thumb-storage";

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function argNum(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function withAgeCookies(page: Page) {
  const domains = [".pornhub.org", ".pornhub.com"];
  const names = [
    "age_verified",
    "accessAgeDisclaimerPH",
    "accessAgeDisclaimerUK",
    "accessPH",
  ];
  const cookies = domains.flatMap((domain) =>
    names.map((name) => ({
      name,
      value: "1",
      domain,
      path: "/",
    })),
  );
  cookies.push(
    { name: "platform", value: "pc", domain: ".pornhub.org", path: "/" },
    { name: "platform", value: "pc", domain: ".pornhub.com", path: "/" },
  );
  await page.setCookie(...cookies);
}

async function readOgImage(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const og =
      document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
      null;
    if (og?.startsWith("http")) return og;

    const html = document.documentElement.innerHTML;
    const m =
      html.match(/"image_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i) ||
      html.match(/"defaultThumb"\s*:\s*"([^"]+)"/i);
    if (!m?.[1]) return null;
    return m[1].replace(/\\\//g, "/");
  });
}

async function extractThumb(page: Page, destUrl: string): Promise<string | null> {
  await page.goto(destUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });

  // Age gate button if still shown
  try {
    const handle = await page.$("button");
    if (handle) {
      const clicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll("button")];
        const btn = buttons.find((b) =>
          /18 or older|i am 18|enter/i.test(b.textContent || ""),
        );
        if (!btn) return false;
        (btn as HTMLButtonElement).click();
        return true;
      });
      if (clicked) {
        await page
          .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15_000 })
          .catch(() => {});
      }
    }
  } catch {
    // ignore race with navigation
  }

  let thumb: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      thumb = await readOgImage(page);
      if (thumb) break;
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!thumb || !thumb.startsWith("http")) return null;
  return thumb;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const limit = argNum("limit", 0);
  const tabs = argNum("tabs", 3);
  const pageSize = 100;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await ensureThumbBucket(supabase);

  const browser: Browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1280,720",
    ],
  });

  const pages: Page[] = [];
  for (let i = 0; i < tabs; i++) {
    const p = await browser.newPage();
    await p.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await p.setRequestInterception(true);
    p.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await withAgeCookies(p);
    pages.push(p);
  }

  let saved = 0;
  let failed = 0;
  let skipped = 0;
  let scanned = 0;
  let lastId = "00000000-0000-0000-0000-000000000000";

  console.log(`Recover via destination pages. tabs=${tabs} limit=${limit || "all"}`);

  const isPix = (thumb: string) =>
    thumb.includes("pix-cdn77.") || thumb.includes("pix-fl.");

  try {
    for (;;) {
      if (limit && saved + failed >= limit) break;

      // Keyset by id — avoids ilike+ORDER BY views timeouts on large tables
      const { data, error } = await supabase
        .from("videos")
        .select("id,video_id,destination_url,thumbnail_url,views")
        .gt("id", lastId)
        .order("id", { ascending: true })
        .limit(pageSize);

      if (error) throw error;
      if (!data?.length) break;
      lastId = data[data.length - 1].id;

      const todo = data.filter(
        (row) =>
          isPix(row.thumbnail_url || "") &&
          row.destination_url?.startsWith("https://") &&
          !isStoredThumbUrl(row.thumbnail_url, url),
      );
      skipped += data.length - todo.length;

      for (let i = 0; i < todo.length; i += tabs) {
        if (limit && saved + failed >= limit) break;
        const chunk = todo.slice(i, i + tabs);

        await Promise.all(
          chunk.map(async (row, idx) => {
            const page = pages[idx];
            try {
              const fresh = await extractThumb(page, row.destination_url);
              if (!fresh) {
                failed += 1;
                if (failed <= 20 || failed % 100 === 0) {
                  console.log(`no-thumb ${row.video_id}`);
                }
                return;
              }

              const stored = await downloadAndStoreThumb(
                supabase,
                url,
                row.video_id,
                fresh,
              );
              if (!stored.ok) {
                failed += 1;
                console.log(`store-fail ${row.video_id}: ${stored.error}`);
                return;
              }

              const { error: upErr } = await supabase
                .from("videos")
                .update({ thumbnail_url: stored.publicUrl })
                .eq("id", row.id);
              if (upErr) {
                failed += 1;
                console.log(`db ${row.video_id}: ${upErr.message}`);
                return;
              }
              saved += 1;
            } catch (e) {
              failed += 1;
              const msg = e instanceof Error ? e.message : String(e);
              if (failed <= 25 || failed % 100 === 0) {
                console.log(`err ${row.video_id}: ${msg.slice(0, 120)}`);
              }
            }
          }),
        );
      }

      scanned += data.length;
      console.log(JSON.stringify({ scanned, saved, failed, skipped, lastId }));
      if (data.length < pageSize) break;
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ done: true, scanned, saved, failed, skipped }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
