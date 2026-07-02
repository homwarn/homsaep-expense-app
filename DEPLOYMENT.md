# Deployment Guide · ຄູ່ມືການຕິດຕັ້ງ

ຄູ່ມືນີ້ພາທ່ານຕັ້ງຄ່າ **Supabase → GitHub → Netlify** ຈົນໃຊ້ງານໄດ້ຈິງ.
This guide walks you from an empty machine to a live app.

---

## 1️⃣ Supabase (Database + Auth + Storage)

### 1.1 Create the project
1. Go to <https://supabase.com> → **New project**.
2. Choose a name, a strong database password, and the region closest to Laos (e.g. Singapore).
3. Wait ~2 minutes for provisioning.

### 1.2 Run the database schema
1. Open **SQL Editor** in the Supabase dashboard.
2. Copy the entire contents of **`supabase/schema.sql`** (this combines the 3 migration files) and **Run**.
   - Alternatively run each file in order: `0001_init_schema.sql`, `0002_rls_policies.sql`, `0003_seed.sql`.
3. This creates all 16 tables, foreign keys, Row Level Security policies, triggers and seed data.

### 1.3 Create the Storage bucket (for logo)
1. **Storage → New bucket** → name it **`assets`** → make it **Public**.

### 1.4 Get your API keys
1. **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key — you'll use them in `.env.local` and Netlify.

### 1.5 Create the first Owner account
Auth users cannot self-register in this app, so create the first owner manually:
1. **Authentication → Users → Add user** → enter email + password → **Create user**.
2. The `handle_new_user` trigger auto-creates a profile with role `employee`.
3. In **SQL Editor**, promote that user to owner:
   ```sql
   update public.profiles set role = 'owner', is_active = true
   where email = 'YOUR_OWNER_EMAIL';
   ```
4. From now on, the owner creates all other users inside the app (User Management page).

### 1.6 Deploy the Edge Function (user management)
The **User Management** module (create user / reset password) needs a service-role function.

Install the Supabase CLI, then:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-users
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase — no extra secrets needed.

> If you skip this step, everything works **except** creating users / resetting passwords from the UI.

---

## 2️⃣ GitHub

```bash
cd homsaep-expense-app
git init
git add .
git commit -m "Initial commit: Hom Saep expense manager"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/homsaep-expense-app.git
git push -u origin main
```

`.env.local` is git-ignored, so your keys stay private. ✅

---

## 3️⃣ Netlify (Hosting)

### Option A — Dashboard (recommended)
1. <https://app.netlify.com> → **Add new site → Import an existing project**.
2. Connect GitHub and pick `homsaep-expense-app`.
3. Build settings are auto-detected from **`netlify.toml`**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site configuration → Environment variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key |
5. **Deploy site**. Every `git push` to `main` now redeploys automatically.

### Option B — CLI
```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

The included `netlify.toml` also adds an SPA redirect so React Router routes work on refresh.

---

## 4️⃣ Post-deploy checklist

- [ ] Log in with the owner account.
- [ ] Open **Settings** → set restaurant name, currency, upload logo, set expense targets.
- [ ] **User Management** → create employee accounts, grant finance access if needed.
- [ ] Add a few suppliers, purchases and revenue entries → confirm the Dashboard KPIs update.
- [ ] Toggle dark mode and switch language (⌘K also opens global search).
- [ ] Try **Backup** in Settings to download a JSON snapshot.

---

## 🔄 Updating the database later
Add a new file under `supabase/migrations/` (e.g. `0004_xxx.sql`) and run it in the SQL Editor, keeping migrations in order. Regenerate TypeScript types anytime with:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

## 🆘 Troubleshooting
| Symptom | Fix |
|---|---|
| Blank page / "Missing Supabase env vars" | Env vars not set in Netlify, or missing `.env.local` locally |
| Can log in but Dashboard is empty | Add revenue/expense data; check the account has finance access |
| 404 on refresh | Ensure `netlify.toml` redirect is deployed |
| Cannot create users | Deploy the `admin-users` Edge Function (step 1.6) |
| RLS "permission denied" | Confirm the schema ran fully and the user's profile `is_active = true` |
