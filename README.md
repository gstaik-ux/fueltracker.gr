# Fuel Log v3

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
