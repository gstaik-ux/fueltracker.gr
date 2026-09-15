# Carall v3

The full vehicle tracker - fuel, service history, trip mode with live
expenses, insurance/ΚΤΕΟ document tracking with photos, and an admin-only
full backup. Each vehicle has a permanent link (what the NFC tags point to)
with no login required; the homepage listing every vehicle is behind a
single admin password.

## What's new in this version

- **5-tab navigation** per vehicle: Αρχική (overview + stacked, filterable
  spend chart + full history), Έγγραφα (plate/VIN, insurance, ΚΤΕΟ - each
  with a photo), Καύσιμο (the fill-up flow), Συντήρηση (maintenance log),
  Εκδρομή (trip mode)
- **Trip mode**: a pre-trip checklist plus live expense logging (tolls,
  food, other) while you're actually on the road
- **Notification bell** in the header - color-coded oil/insurance/ΚΤΕΟ
  reminders (green >30 days, yellow 16-30, red ≤15 or overdue), tap one to
  jump straight to the right tab
- **Swipe left to delete** any history row
- **Admin-only full backup** - one JSON file with every vehicle's complete
  history, separate from the app's regular use

## 1. Database

Run the **UPGRADE** block near the top of `schema.sql` in Supabase's SQL
Editor - it's all `if not exists` / `add column if not exists`, safe to run
once against your existing data. It adds: plate number, VIN, insurance
date, ΚΤΕΟ date, insurance/ΚΤΕΟ photo storage, and a trip-expense flag on
service entries.

## Custom home-screen icon per vehicle

Each vehicle can have its own custom home-screen icon - but this is set
from the **admin homepage only** (behind the admin password), not from the
vehicle's own page. Tap the small icon next to a vehicle's name in the
list to upload or change it. This is deliberate: vehicle pages themselves
are open, no-login links (what the NFC tags point to), so putting the
upload control there would let anyone with that link change the icon -
keeping it admin-only avoids that.

Adding a specific vehicle to your phone's home screen (Share → Add to Home
Screen) then uses that vehicle's own uploaded image; any vehicle without
one falls back to the plain Carall logo.

For best results, upload a roughly square image - it's cropped to fill a
square icon.

## Document privacy

Insurance/ΚΤΕΟ **photos and PDFs** are gated behind a password - a
**separate password per vehicle**, set once by whoever manages that
vehicle, not shared with the admin login and not reusable across vehicles.

- **No session, no cookie, ever.** The password is required fresh for
  every single view, download, or upload - there's no "remember this
  device" convenience at all. Each request is verified independently
  against the database.
- The password is **hashed with bcrypt** - never stored in plain text.
- **Automatic rotation, not a fixed lifetime.** Whoever sets the password
  also picks 3, 6, or 9 months. Once that many months pass since it was
  set, the password is automatically cleared - lazily, the next time
  anything checks it, no cron job needed - and the "set password" card
  reappears so a new one can be chosen. This covers both a forgotten
  password and a family that just wants to rotate it periodically.
- It can only be **set once** while active - there's no edit path in the
  UI, and the API route itself refuses a second attempt even if called
  directly, for as long as a password is currently set. If it truly needs
  clearing before its scheduled rotation, run this in Supabase's SQL
  Editor for that one vehicle:
  `update vehicles set docs_password_hash = null, docs_reset_months = null, docs_password_set_at = null where slug = 'yourslug';`
- Uploading a document still requires the password in that same request -
  it's checked in the same photo-upload endpoint, not bypassed.
- Everything else on a vehicle's page (dates, fuel log, service history)
  stays exactly as open as before - only the actual uploaded file content
  requires this.
- The document content itself is never included in the page's initial
  load - it's only ever returned by a route that takes the password
  directly in that request and verifies it before responding, so there's
  nothing to find in page source or dev tools without it.

## 2. Environment variables

Same three as before - `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PASSWORD`. No
new ones needed; photos are stored directly in the database as base64 (a
handful of document photos is nowhere near Supabase's free-tier 500MB
limit, so no separate file storage setup is required).

## 3. Deploy

Push to GitHub, Vercel picks it up automatically the same way as before.

## 4. What to check after deploying

- Open a vehicle - you should land on **Αρχική** with a quick "Καλημέρα"/
  "Καλησπέρα" greeting before it settles to the vehicle name
- Try **Έγγραφα**: set an insurance date a few days out, confirm the color
  changes correctly, and upload a photo
- Try **Εκδρομή**: turn it on, log a toll or food expense, confirm it shows
  up back on **Αρχική** with a small plane badge
- Tap the bell (top right) - if any vehicle has an overdue reminder built
  into its data already, it should show there with the right color
- From the **admin homepage** (password-protected `/`), try "Λήψη πλήρους
  αντιγράφου (JSON)" - confirm it downloads a file with your real data

## Local development

```bash
npm install
npm run dev
```
