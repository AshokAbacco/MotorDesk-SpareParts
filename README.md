# MotorDesk — Spare Parts ERP + Marketplace

Multi-tenant SaaS for car & bike spare-parts shops:

- **Vendor ERP** — dashboard, car/bike inventory, POS billing with GST, online orders, garages (B2B khata), P&L and GST reports
- **Customer marketplace** — search by vehicle / OEM / part name, compare shops, cart, checkout, order tracking
- **Admin panel** — approve vendors, master catalog with vehicle fitment, subscription plans, platform analytics

**Stack:** React 19 (Vite) · Tailwind CSS · Zustand · Axios · Lucide + React Icons · Node.js · Express 5 · Prisma 6 · PostgreSQL · Cloudflare R2 (images & invoice PDFs)

---

## 1. Run it locally

**Requirements:** Node.js 20+ and PostgreSQL 14+ (pgAdmin is fine).

```bash
# 1. Create an empty database called "motordesk" in pgAdmin (or: createdb motordesk)

# 2. Install everything
npm run install:all

# 3. Configure env files
#    server/.env  → set DATABASE_URL, JWT_SECRET, and the CF_* values
#    client/.env  → VITE_API_BASE_URL=http://localhost:5000/

# 4. Create tables + load demo data
cd server
npx prisma migrate dev        # applies prisma/migrations and generates the client
npm run seed
cd ..

# 5. Start API (5000) + web (5173) together
npm run dev
```

Open http://localhost:5173

| Role     | Email                    | Password       |
|----------|--------------------------|----------------|
| Admin    | admin@motordesk.in       | Password@123   |
| Vendor   | ravi@srautoparts.in      | Password@123   |
| Vendor   | imran@speedspares.in     | Password@123   |
| Vendor (pending approval) | suresh@bikezone.in | Password@123 |
| Customer | customer@motordesk.in    | Password@123   |

Useful: `npx prisma studio` (browse the DB) · `npm run build` (production build of the client).

---

## 2. Environment

**server/.env**

| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string (min 16 chars). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Allowed CORS origin(s), comma-separated |
| `CF_PUBLIC_BASE_URL` | Public R2 bucket URL (`https://pub-….r2.dev` or your custom domain) |
| `CF_ACCOUNT_ID` / `CF_ACCESS_KEY_ID` / `CF_SECRET_ACCESS_KEY` / `CF_BUCKET_NAME` | Cloudflare R2 API token + bucket |

If the `CF_*` values are empty the app still runs; only image upload and invoice sharing return *503 storage not configured*. Invoice PDF **download/print** works without R2.

**client/.env**

| Key | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Server root, e.g. `http://localhost:5000/` (the client appends `/api/v1`) |
| `VITE_APP_NAME` | Brand name shown in the UI |

Only `VITE_*` variables reach the browser — never put secrets in `client/.env`.

---

## 3. Folder structure

```
MotorDesk-SpareParts/
├── client/                         React (Vite)
│   └── src/
│       ├── landingPages/           Public side: home, auth, shop, cart, checkout, my orders
│       │   ├── routes/             LandingRoutes.jsx
│       │   ├── auth/               LoginPage, RegisterPage, components/, login.api.js, register.api.js
│       │   ├── home/               HomePage + HeroSection, VehicleSelector, FeaturedCategories
│       │   ├── shop/               ProductListPage, ProductDetailPage, components/, shop.api.js
│       │   ├── cart/               CartPage, CartDrawer/, cart.api.js
│       │   ├── checkout/           CheckoutPage, AddressForm, OrderSummary, checkout.api.js
│       │   ├── myOrders/           MyOrdersPage, OrderTracker, myOrders.api.js
│       │   ├── store/              authStore.js, shopCartStore.js
│       │   ├── components/         Navbar, Footer
│       │   └── layouts/            AuthLayout, ShopLayout
│       ├── dashboardPages/         Logged-in ERP (vendor + admin)
│       │   ├── routes/             DashboardRoutes, ProtectedRoute, RoleRoute
│       │   ├── home/               DashboardPage, StatsGrid, SalesChart, LowStockList, dashboard.api.js
│       │   ├── carPages/           CarInventoryPage, CarCatalogPage, components/, carInventory.api.js
│       │   ├── bikePages/          BikeInventoryPage, BikeCatalogPage, components/, bikeInventory.api.js
│       │   ├── pos/                PosPage, components/, pos.api.js, invoice.api.js
│       │   ├── orders/             OrdersPage, OrdersTable, OrderDetailsDrawer, StatusUpdater, orders.api.js
│       │   ├── garages/            GaragesPage, GarageList, GarageLedger, garages.api.js
│       │   ├── profile/            ProfilePage, ShopProfileForm, PnLSummary, GstReport, ExpenseForm, profile.api.js
│       │   ├── admin/              AdminDashboardPage, VendorsPage, ProductsPage, PlansPage/, components/, *.api.js
│       │   ├── store/              posCartStore.js, uiStore.js
│       │   ├── components/         Sidebar, Topbar, StatCard, StatusBadge, ViewToggle, inventory/ (shared car+bike logic)
│       │   └── layouts/            VendorLayout, AdminLayout
│       ├── shared/                 ui/, hooks/, utils/, axiosInstance.js
│       ├── App.jsx · main.jsx · index.css
│
└── server/                         Express + Prisma
    ├── prisma/                     schema.prisma, migrations/, seed/
    └── src/
        ├── config/                 env.js (validated), prisma.js, cors.js, r2.js
        ├── auth/ users/ vendors/ products/ vehicles/ inventory/ pos/ invoices/
        │   orders/ garages/ reports/ marketplace/ subscriptions/ admin/ uploads/
        │     └── <name>.routes.js · <name>.controller.js · <name>.service.js · <name>.validation.js
        ├── middlewares/            auth, role, tenant, validate, upload (memory → R2), error, notFound
        ├── utils/                  ApiError, ApiResponse, asyncHandler, jwt, hash, gst, invoiceNumber, money, pagination
        ├── constants/              roles, orderStatus, paymentModes
        ├── routes/index.js         mounts every module under /api/v1
        ├── app.js · server.js
```

Every API file sits in the feature folder that uses it; they all import the one base client in `shared/axiosInstance.js`. Car and bike pages share their logic through `dashboardPages/components/inventory/` so the two stay consistent.

---

## 4. Key design rules

- **Tenant isolation** — `tenant.middleware.js` resolves the logged-in vendor's shop into `req.vendorId`. Every vendor query filters by it; a vendor ID is never taken from the request body. Other shops' records return 404.
- **Vendors don't create products.** Admin owns the master catalog (with vehicle fitment); vendors add catalog items to their inventory with their own cost, price, MRP and stock.
- **GST** — selling prices are stored *excluding* GST, MRP *including*. Same state → CGST + SGST, different state → IGST (`utils/gst.js`). The POS screen shows totals from `/pos/quote`, so the screen always matches the saved invoice.
- **Stock safety** — every sale decrements stock with a conditional update (`stock >= qty`) inside a transaction, so two counters can't oversell.
- **Invoice numbers** — per-vendor, per-financial-year sequence (`INV-2627-000001`), generated atomically.
- **Marketplace orders** — a cart with parts from 3 shops becomes 3 orders. Status flow: PENDING → ACCEPTED → PACKED → SHIPPED → DELIVERED (cancel allowed until ACCEPTED). Delivery auto-creates the GST invoice.
- **Uploads** — multer `memoryStorage` → Cloudflare R2. Nothing is written to the server's disk.
- **P&L** — revenue excludes GST; COGS uses the cost price snapshotted on each invoice line; minus expenses = net profit.
- **Plans** — SKU limits enforced when adding inventory (free tier: 50).

---

## 5. API (`/api/v1`)

| Module | Endpoints |
|---|---|
| auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` |
| users | `GET/PATCH /users/me` · `PATCH /users/me/password` |
| vendors | `GET/PATCH /vendors/me` |
| products | `GET /products` (q, category, vehicleType/Brand/Model, year) · `GET /products/categories` · `GET /products/:id` · admin: `POST`, `PATCH /:id`, `PUT /:id/vehicles`, `DELETE /:id` |
| vehicles | `GET /vehicles` · `/vehicles/brands` · `/vehicles/models` · `/vehicles/years` · admin: `POST`, `POST /bulk`, `DELETE /:id` |
| inventory | `GET /inventory` (q, category, vehicleType, vehicleBrand, stockStatus) · `POST` · `PATCH /:id` (price) · `PATCH /:id/stock` · `DELETE /:id` |
| pos | `POST /pos/quote` · `POST /pos/checkout` |
| invoices | `GET /invoices` · `GET /:id` · `GET /:id/pdf` · `POST /:id/share` (→ R2) |
| orders | customer: `POST /orders`, `GET /orders/my`, `GET /orders/my/:id`, `PATCH /orders/my/:id/cancel` · vendor: `GET /orders/vendor`, `GET /orders/vendor/:id`, `PATCH /orders/vendor/:id/status` |
| garages | `GET/POST /garages` · `GET/PATCH/DELETE /:id` · `GET /:id/ledger` · `POST /:id/payments` |
| reports | `GET /reports/dashboard` · `/pnl` · `/gst` · `GET/POST /expenses` · `DELETE /expenses/:id` |
| marketplace | `GET /marketplace/products` · `GET /marketplace/products/:id` · `POST /marketplace/cart/validate` (public) |
| subscriptions | `GET /subscriptions/plans` · vendor: `GET /me`, `POST /subscribe` · admin: `GET /plans/all`, `POST/PATCH/DELETE /plans` |
| admin | `GET /admin/analytics` · `GET /admin/vendors` · `PATCH /admin/vendors/:id/status` |
| uploads | `POST /uploads/images` (multipart `images`, max 6 × 5 MB) · admin `DELETE /uploads/images` |

All responses: `{ success, message, data, meta? }`. Validation errors: `400 { errors: [{ field, message }] }`.

---

## 6. Before going to production

- Integrate a payment gateway (Razorpay) in `subscriptions.service.js` and marketplace checkout — plans currently activate immediately.
- Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CLIENT_URL` to your real domain.
- Run `npx prisma migrate deploy` on the server instead of `migrate dev`.
- Put the API behind HTTPS (Nginx / a load balancer); `trust proxy` is already enabled for correct rate-limiting.
- Consider SMS/WhatsApp OTP for customer login and email notifications for order status.
