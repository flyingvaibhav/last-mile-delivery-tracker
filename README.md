# Last-Mile Delivery Tracker - Smart Logistics SaaS

A modern, high-performance logistics and shipment dispatch platform for customers, delivery agents, and administrators. Built with Next.js (App Router), Tailwind CSS, MongoDB, Clerk Authentication, and Nodemailer.

---

## Technical Stack

* **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4 + Lucide Icons + custom dark-first components (interactive timelines, receipt price estimates, and animated route previews).
* **Backend**: Next.js API endpoints.
* **Authentication**: Clerk Authentication (social sign-on, metadata role gating, and SVIX webhook synchronization).
* **Database**: MongoDB & Mongoose Object Data Modeling.
* **Email Service**: Nodemailer SMTP alerts (Gmail/Resend).

---

## Key Features

1. **Role-Based Portals**: Gated layouts with customized navigation headers and dashboards for **Customers**, **Delivery Agents**, and **Admins**.
2. **Automated Pricing Engine**: Billed weight is determined dynamically as the higher of actual weight and volumetric size ($L \times B \times H \div 5000$). Rates resolve automatically by analyzing pickup and drop postal pincodes against intra-zone and inter-zone tariffs.
3. **Dispatch & Assignments**: Automated routing assigns unassigned bookings to the nearest available agent based on operating zones. Manual overrides are available on the Admin panel.
4. **Reschedule & Fail Safe**: Failed deliveries automatically trigger email alerts, permitting customers to pick a new date. The package then reverts to "Pending" and re-enters the assignment flow.

---

## Getting Started

### 1. Prerequisites
Ensure you have **Node.js v18+** and a running **MongoDB** instance.

### 2. Install Dependencies
Clone the repository, change to the project directory, and install:
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` (or copy `.env.example`) in the root:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/last_mile_delivery

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Delivery Tracker" <your-email@gmail.com>
```

### 4. Seed and Test Pricing
Run the built-in pricing engine validation test to verify Mongoose schemas and pricing mathematics:
```bash
npm run test:pricing
```

---

## Project Structure

```
last-mile-delivery-tracker/
├── docs/                  # Architecture and system design docs
├── public/                # Static assets
├── scripts/               # Dev/validation scripts (pricing tests)
├── src/
│   ├── app/               # Next.js App Router pages and API routes
│   ├── components/        # Shared React UI components
│   ├── lib/               # Database, models, pricing, email utilities
│   ├── types/             # Shared TypeScript types
│   └── proxy.ts           # Auth & role-based route protection (Next.js 16)
├── .env.example           # Environment variable template
└── README.md
```

---

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

---

## Clerk Authentication Setup

This application relies on Clerk for user identity and role assignment.

### Step 1: Set Custom Role Claims
For Clerk middleware to inspect role claims, you must configure Clerk to output the user's role metadata in session tokens.
1. Open the [Clerk Dashboard](https://dashboard.clerk.com/).
2. Navigate to **Session Templates** &rarr; **Edit (Default)**.
3. Add the following custom claim mapping:
   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```

### Step 2: Configure SVIX Webhooks
To keep the MongoDB `User` and `Agent` collections in sync with Clerk profiles:
1. Navigate to **Webhooks** in Clerk.
2. Click **Add Endpoint** and point it to: `https://<your-domain>/api/clerk/webhook` (or use Ngrok locally).
3. Subscribe to the following events: `user.created`, `user.updated`, `user.deleted`.
4. Copy the webhook signing secret and save it as `CLERK_WEBHOOK_SECRET` in your `.env.local`.

---

## MongoDB Schema Definitions

* **Users** (`User`): Mirrors Clerk accounts. Tracks `clerkId`, `name`, `email`, `role` (`customer` | `agent` | `admin`), and phone details.
* **Zones** (`Zone`): Represents geographic sectors. Tracks unique names.
* **Areas** (`Area`): Maps postal codes or cities to a specific zone. Tracks `pincodeOrName` (unique index) and `zoneId` references.
* **RateCards** (`RateCard`): Tariffs matrix. Tracks unique combinations of `orderType` (`B2B` | `B2C`), `zoneFrom`, and `zoneTo`, defining `baseCharge` and `ratePerKg`.
* **CODSurcharges** (`CODSurcharge`): Surcharges for cash on delivery. Keyed by `orderType` defining `surchargeAmount`.
* **Orders** (`Order`): Shipment logs. Tracks pickup/drop addresses, package size, actual weight, calculated volumetric weight, billed weight, charge, status, and assigned agent.
* **OrderStatusHistories** (`OrderStatusHistory`): Immutable append-only audit log storing every status shift, timestamps, and updating actors.
* **Agents** (`Agent`): Logistics metadata. Tracks `clerkId`, `currentZoneId` (active region), and `availabilityStatus` (`available` | `busy` | `offline`).

---

## API Documentation

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/zones` | Retrieve all zones and mapped pincodes | Authenticated |
| **POST** | `/api/zones` | Manage zones and area pincode mappings | Admin |
| **GET** | `/api/rates` | Fetch rate card matrix and COD surcharges | Authenticated |
| **POST** | `/api/rates` | Upsert zone tariff cards and COD surcharges | Admin |
| **GET** | `/api/orders` | Fetch orders list (role-filtered query) | Authenticated |
| **POST** | `/api/orders` | Calculate price preview or submit shipment booking | Authenticated |
| **GET** | `/api/orders/[id]` | Fetch detailed order tracking and audit history | Authenticated |
| **PATCH** | `/api/orders/[id]` | Transition delivery states or reschedule failed attempts | Authenticated |
| **POST** | `/api/orders/[id]/assign` | Execute manual or zone-matching auto-assignment | Admin |
| **GET** | `/api/users` | List all users and active agent status | Admin |
| **PATCH** | `/api/users` | Promote or demote user roles in Clerk and MongoDB | Admin |
| **PATCH** | `/api/agents` | Update agent status and operating zone location | Agent/Admin |

---

## Rate Calculation Engine

The tariff for any shipment is resolved in five distinct steps:

1. **Zone Resolution**: Pincodes matching the pickup and delivery addresses are checked in the `Areas` collection to locate the correct source (`zoneFrom`) and destination (`zoneTo`) zones.
2. **Volumetric Weight Calculation**:
   $$\text{Volumetric Weight (kg)} = \frac{L \times B \times H \text{ (cm)}}{5000}$$
3. **Billed Weight Determination**:
   $$\text{Billed Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
4. **Tariff Calculation**: The active `RateCard` matching the cargo category (`B2B` | `B2C`) and the solved zone route is fetched:
5. **Vehicle Multiplier**: The cargo shipment cost is scaled based on the vehicle class selected:
   * **2-Wheeler (Scooter)**: 1.0x multiplier (Max 20 kg)
   * **Three-Wheeler (Auto)**: 1.5x multiplier (Max 150 kg)
   * **Tata Ace (8-Ft)**: 2.5x multiplier (Max 750 kg)
   * **Pickup (14-Ft)**: 4.0x multiplier (Max 1.5 Ton)
6. **COD Surcharge**: If `paymentType` is `"COD"`, the payment surcharge is loaded from the DB and appended to the final total.
   $$\text{Final Billing Charge} = \left[ (\text{Base Charge} + (\text{Billed Weight} \times \text{Rate Per Kg})) \times \text{Vehicle Multiplier} \right] + \text{COD Surcharge}$$

---

## Demo Mode Sandbox Integration

The application includes an isolated, self-contained **Demo Mode** sandbox, allowing visitors to test Customer, Agent, and Admin roles instantly without Clerk sign-ups.

### How it Works
1. **Authentication Bypass**: Clicking "Try Live Demo" on the login screen sets a secure `demo_session` cookie containing `{ role, sessionId }`. The Next.js Clerk middleware recognizes this cookie and permits immediate access to the dashboard routes.
2. **Sandbox Isolation**: To support multiple concurrent visitors, all records created in demo mode are flagged with `{ isDemo: true, sessionId: "sess-uuid" }`. Database queries inside the application are scoped to this context, preventing visitors from polluting each other's sandboxes or the production environment.
3. **Simulated Email Logs**: Instead of sending actual emails via SMTP, notifications are stored in a `DemoNotification` collection and displayed in a sliding log drawer in the UI header.
4. **Demo Rate Limits**: Sandbox sessions are capped at 20 orders maximum to prevent spam and server abuse.

### Demo Controls Banner
When in Demo Mode, a prominent amber banner is displayed at the top of the viewport:
* **Role Switcher**: Shift instantly between Customer, Delivery Agent, and Admin perspectives. The app dynamically re-seeds the required permissions and re-routes layouts.
* **Reset Data**: Click to wipe the current sandbox session's modifications and re-seed original sample orders, zones, rates, and history back to a fresh state.
* **Email Log**: Toggle a drawer to inspect outgoing transactional HTML alerts triggered by order status changes.
* **Exit Demo**: Deletes the `demo_session` cookie and redirects the browser back to the Clerk login screen.

