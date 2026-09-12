# Fuel Log

Fuel tracker for a fixed set of family vehicles. No login screen — each
vehicle has a permanent link, and that link is what you write to its NFC tag.

## How it works

- Each vehicle is a row in the `vehicles` table with a `slug`
  (e.g. `civic`) and a `name` (e.g. "Dad's Civic").
- Its page lives at `/v/<slug>` — that's the exact URL you write to the
  NFC tag for that vehicle. Tapping the tag opens straight to that
  vehicle's log, no login step at all.
- The homepage (`/`) also lists every vehicle, in case you ever want to
  check one from a phone without the tag.

There's no password and no admin panel by design — this is meant for a
small, fixed set of vehicles you set up once. Anyone with the link (or
the tag) can view and add fill-ups for that vehicle, the same as anyone
holding the physical key can drive the car.

## 1. Create a free Postgres database

Easiest option: [Supabase](https://supabase.com) (free tier).

1. Create a project.
2. Go to **Project Settings → Database → Connection string → URI**, choose
   "Transaction" pooling mode, copy it. This is your `DATABASE_URL`.
3. Go to **SQL Editor → New query**, paste the contents of `schema.sql`
   from this project, and run it.

## 2. Add your vehicles

Still in the SQL Editor, run one insert per vehicle (edit the slug and
name first):

```sql
insert into vehicles (slug, name) values ('civic', 'Dad''s Civic');
insert into vehicles (slug, name) values ('yaris', 'Mom''s Yaris');
```

Pick short, URL-safe slugs (lowercase letters, no spaces) — they become
part of the link.

## 3. Set environment variables

Copy `.env.example` to `.env.local` for local dev, and set the same
variable in your Vercel project (**Settings → Environment Variables**):

- `DATABASE_URL` — from step 1

## 4. Deploy

```bash
npm install
npx vercel deploy
```

Or connect the folder as a GitHub repo and import it in the Vercel
dashboard, same as your other projects.

## 5. Set up each NFC tag

For each vehicle, the tag's link is:

```
https://your-app.vercel.app/v/<slug>
```

e.g. `https://your-app.vercel.app/v/civic`. Use any NFC-writing app
(e.g. "NFC Tools" on iOS/Android) to write that exact URL as a **URL
record** onto a blank tag, then place it in that vehicle.

## Local development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.
