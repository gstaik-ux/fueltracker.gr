# Fuel Log v2

Per-vehicle fuel and maintenance tracker. Each vehicle has a permanent link
(what the NFC tags point to) with no login. The homepage, which lists every
vehicle, is protected by a single admin password.

## What's new in this version

- Admin password gate on `/` only - `/v/<slug>` pages stay completely open
- Cost-first, two-step logging flow with smart estimates:
  - Liters estimated from cost ÷ last known price per liter (or a price you type in on the spot)
  - Odometer estimated from the car's own known L/100km when left blank
  - If a fill-up is marked "full" and you enter the odometer, liters gets calculated from the real distance since the last full tank - more accurate than any price guess
- Trip mode toggle + a quick pre-trip checklist (tires, oil, lights, etc. - this checklist is intentionally not saved anywhere, it's just an in-the-moment reminder)
- "Full tank?" toggle, with a live "% of tank" hint if you set a tank capacity
- Edit and delete on every fill-up, both with confirmation
- A separate Service/Maintenance log per vehicle (oil, tires, filters, washer fluid, or just "Σέρβις" for vehicles where everything's done together) with a reminder banner when an oil change looks overdue
- Per-vehicle accent color, background color, and icon (car or bike)

## 1. Database

Run `schema.sql` in Supabase's SQL Editor. If you already have the older
version of this app running, use the "UPGRADING" block at the bottom of that
file instead of the whole thing.

Then add your vehicles (edit the example inserts at the bottom of
`schema.sql` with your real slugs, names, colors, icon, and tank capacity).

## 2. Environment variables

Copy `.env.example` to `.env.local` for local dev, and set the same three in
your Vercel project (Settings → Environment Variables):

- `DATABASE_URL` — your Supabase connection string
- `JWT_SECRET` — any long random string (`openssl rand -hex 32`)
- `ADMIN_PASSWORD` — the code you'll type at `/` to see the vehicle list

## 3. Deploy

Push to GitHub, import into Vercel (or reuse your existing project - just
push these files over the old ones), set the env vars above, deploy.

## 4. Point your NFC tags

Each tag's link is:

```
https://your-app.vercel.app/v/<slug>
```

If you're upgrading from the old version, note that this port used new
slugs for two vehicles - update the physical tags if the slugs changed
(check what you inserted in `schema.sql`).

## Local development

```bash
npm install
npm run dev
```
