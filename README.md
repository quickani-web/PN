# Vidora — Video Link Directory

Public video-link catalogue. Listings show thumbnail, title, duration, views and category. Clicks open a stored external HTTPS destination. **No video hosting or streaming.**

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase PostgreSQL + `@supabase/supabase-js`
- Local Excel/CSV import (`ExcelJS` + `PapaParse`)
- Optional Cloudflare DNS/CDN

## Setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Copy env values:

```bash
cp .env.example .env.local
```

4. Install and run:

```bash
npm install
npm run seed:categories
npm run import:listings -- imports/sample.csv
npm run dev
```

## Import columns

Exact headers required:

`video_id`, `title`, `thumbnail_url`, `duration`, `views`, `category`, `destination_url`

- `video_id` must be unique across the whole database (duplicates are skipped)
- Category names must already exist (seed first)
- Destination and thumbnail URLs must be HTTPS
- Views must be numeric (`1200000`, not `1.2M`)
- Failures are written to `import-errors.txt`

## Public routes

| Route | Purpose |
|---|---|
| `/` | Catalogue homepage |
| `/categories` | Category directory |
| `/category/[slug]` | Category listings |
| `/search` | Title search + filters |
| `/video/[slug]` | Listing detail |
| `/api/redirect/[slug]` | Safe outbound redirect |
| `/sitemap.xml` / `/robots.txt` | SEO |

Filters: category, duration, sort (`newest` / `views` / `oldest` / `shortest`), pagination via URL query params.

## Deploy

1. Apply `supabase/schema.sql`
2. Seed categories, import workbook locally with service-role key
3. Deploy Next.js to a commercial-use-permitted host
4. Set env vars, attach domain + HTTPS
5. Submit sitemap to Search Console

Ad slots are placeholders — choose a provider that permits your content category. Affiliate relationships must be disclosed.
