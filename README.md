# ຮ້ານບຸບເຟ້ ຫອມແຊບ · Restaurant Expense Manager

ລະບົບຈັດການລາຍຮັບ-ລາຍຈ່າຍຮ້ານອາຫານແບບຄົບວົງຈອນ (bilingual ລາວ / English).
A production-ready restaurant expense & revenue management web app.

Built with **React + Vite + TypeScript + TailwindCSS + shadcn/ui + Supabase**.

---

## ✨ Features / ຄຸນສົມບັດ

- 📊 **Dashboard** — daily / monthly / yearly revenue, expense & profit KPIs + trend, pie & bar charts
- 🥩 **Raw Material Purchase** & 🥤 **Drink Purchase** — full CRUD, search, filter, export (CSV / Excel / PDF)
- 🚚 **Supplier Management** — contacts, active status
- 🧾 **Other Expenses** — 9 built-in categories + unlimited custom categories + repair module
- 💰 **Revenue** — food & drink, daily / monthly / yearly summaries
- 📉 **Expense Summary** & 📈 **Profit Summary** — charts, comparison, growth %
- 📄 **Reports** — 6 report types, Print / PDF / Excel / CSV
- 👥 **User Management** — owner creates users, assigns roles, resets passwords (via secure Edge Function)
- 🔔 **Notifications** — expense-over-target / budget / low-profit alerts
- 🔍 **Global Search** — ⌘K / Ctrl+K instant search across all data
- ⚙️ **Settings** — restaurant name, logo, currency (LAK), language, backup & restore
- 🌗 **Dark / Light mode**, 🌐 **Lao + English**, responsive & mobile-first, Apple-style minimal UI

## 🔐 Roles / ສິດການໃຊ້ງານ

| Capability | Owner | Employee |
|---|:---:|:---:|
| Login | ✅ | ✅ |
| Add / edit own records | ✅ | ✅ |
| Delete records & reports | ✅ | ❌ |
| Financial dashboard & summaries | ✅ | only if `finance access` granted |
| Manage users | ✅ | ❌ |
| Settings | ✅ | ❌ |

Access is enforced both in the UI (route guards) **and** in the database (PostgreSQL Row Level Security).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | TailwindCSS, shadcn/ui, lucide-react |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Routing | React Router |
| Backend / DB / Auth / Storage | Supabase (PostgreSQL) |
| Export | SheetJS (xlsx), jsPDF |
| Hosting | Netlify |

---

## 🚀 Quick Start / ເລີ່ມໃຊ້ງານ

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    then fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run dev server
npm run dev            # http://localhost:5173

# 4. Production build
npm run build
npm run preview
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full Supabase + GitHub + Netlify setup.

---

## 📁 Folder Structure

```
homsaep-expense-app/
├─ public/                 # logo, static assets
├─ supabase/
│  ├─ migrations/          # 0001 schema · 0002 RLS · 0003 seed
│  ├─ functions/admin-users/  # Edge Function (create user / reset password)
│  └─ schema.sql           # all migrations combined (quick paste)
├─ src/
│  ├─ components/
│  │  ├─ ui/               # shadcn primitives (button, card, dialog, ...)
│  │  ├─ layout/           # Sidebar, Topbar, AppLayout, nav config
│  │  ├─ common/           # DataTable, StatCard, PageHeader, ConfirmDialog, GlobalSearch
│  │  └─ charts/           # Recharts wrappers
│  ├─ contexts/            # AuthContext, ThemeContext
│  ├─ hooks/               # useSettings, useNotifications
│  ├─ i18n/                # translations (lo/en) + provider
│  ├─ lib/                 # supabase client, metrics, export, utils
│  ├─ pages/               # 13 feature modules
│  └─ types/               # database types
├─ netlify.toml
└─ .env.example
```

---

## 🗄️ Database Tables

`roles`, `profiles`, `suppliers`, `raw_material_categories`, `raw_materials`,
`raw_material_purchases`, `drink_categories`, `drinks`, `drink_purchases`,
`expense_categories`, `expenses`, `repairs`, `revenues`, `reports`, `settings`, `activity_logs`

All money totals (`total_price`, `total_cost`) are **generated columns** computed by PostgreSQL.

---

## 🔒 Security

- **Row Level Security** enabled on every table with owner / employee / creator policies.
- Employees can edit only their own records and cannot delete anything or view finance pages unless granted.
- User creation & password reset run through a **service-role Edge Function** that verifies the caller is an active owner — the service key never touches the browser.
- All inputs validated with React Hook Form; Supabase client uses parameterized queries (no SQL injection); React escapes output (no XSS).

## 📜 License

Private — © ຮ້ານບຸບເຟ້ ຫອມແຊບ
