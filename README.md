# My Home App

A local-first SvelteKit PWA for managing your home purchase, home loans, payment schedules, and household sharing. Data is encrypted in the browser before being backed up to Supabase, and the app can be deployed for free on Netlify.

## Features

- **Household sharing**: Create a household, generate invite links, and share full access with family members.
- **Home & loan tracking**: Store details about your home, builder, bank loan, EMI, and amortization.
- **Payment schedules**: Track builder milestone payments, bank EMIs, and custom reminders.
- **Apple Calendar integration**: Subscribe via `webcal://` or download `.ics` files.
- **Encrypted cloud backup**: Local-first IndexedDB storage with AES-GCM encrypted backups to Supabase.
- **PWA**: Install on iOS/Android home screen and use offline.

## Tech Stack

- SvelteKit 3 + TypeScript
- Skeleton UI + Tailwind CSS 4
- Dexie.js (IndexedDB)
- Supabase (auth, Postgres, storage)
- Netlify adapter

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the migration** in `supabase/migrations/001_schema.sql` via the Supabase SQL editor or CLI.
3. **Create a storage bucket** called `backups` (the migration also tries to do this).
4. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase URL, anon key, and service role key.
5. **Install dependencies**:
   ```bash
   npm install
   ```
6. **Run locally**:
   ```bash
   npm run dev
   ```
7. **Deploy to Netlify**:
   - Connect your Git repo to Netlify.
   - Set the environment variables from `.env` in the Netlify dashboard.
   - Deploy.

## Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Public | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Private | Service role key for public calendar feeds |
| `RESEND_API_KEY` | Private | For email reminders (optional) |
| `VAPID_PUBLIC_KEY` | Public | For browser push notifications (optional) |
| `VAPID_PRIVATE_KEY` | Private | For browser push notifications (optional) |

## Encryption Note

The household data encryption key is derived from a shared household passphrase using PBKDF2. All members must know this passphrase to decrypt the shared backup. If everyone forgets the passphrase, the backup is unrecoverable.

## Apple Calendar

In Settings, copy the `webcal://` URL and subscribe to it in Apple Calendar. The feed updates as you change schedules.
