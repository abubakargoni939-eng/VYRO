# VYRO Live v1

This version turns the VYRO demo into a real social MVP using Supabase Auth + Postgres.

## 1. Create a Supabase project
Create a new project at https://supabase.com/.

## 2. Create the database
In Supabase, open **SQL Editor**, paste all of `supabase.sql`, and run it.

## 3. Get the API values
Open **Project Settings → API**. Copy:
- Project URL
- Publishable/anon key (the public client key)

Do NOT use or publish the `service_role` secret.

## 4. Connect VYRO
Open `public/config.js` and replace the two placeholders:
`SUPABASE_URL`
`SUPABASE_ANON_KEY`

## 5. Run locally
`npm install`
`npm start`
Then open `http://localhost:3000`.

## 6. Deploy to Render
Create a Web Service from this folder/repository.
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node

For the first version, the Supabase values can remain in `public/config.js` because the anon/publishable key is designed for browser use. Database security comes from the Row Level Security policies in `supabase.sql`.

Next planned features: image/video storage, comments UI, follows, notifications, messaging, challenges, translation, rewards, and monetization.
