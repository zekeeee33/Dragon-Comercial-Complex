# Dragon Commercial Complex Leasing System

## Run locally

1. Copy `.env.example` to `.env` and set the Supabase project URL and publishable/anon key.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). If you already installed an earlier version, rerun the updated file to add the utility statement fields and the shared dashboard notes table/policies, along with operational tables, policies, and RPCs.
3. Run [`supabase/import_current_renters.sql`](./supabase/import_current_renters.sql) to load the supplied renter schedule into a reviewable staging table. The import preserves the original grouped stall labels and unknown rent values; it does not create lease assignments.
4. Create or confirm `sceratoconcepts@gmail.com` and `dragoncomplex8@gmail.com` in Supabase Auth. Run [`supabase/promote_admin_dragoncomplex8.sql`](./supabase/promote_admin_dragoncomplex8.sql) to promote the existing Dragon Complex account immediately. The main schema also assigns both accounts the administrator role automatically for future provisioning.

5. Install dependencies and start the dev server:

   ```sh
   npm install
   npm run dev
   ```

## Deploy to Vercel

1. In the Vercel project, open **Settings → Environment Variables**.
2. Add `VITE_SUPABASE_URL` using the Supabase project URL and `VITE_SUPABASE_ANON_KEY` using the project's anon/publishable client key. Set them for the Production environment (and Preview/Development too if those deployments need Supabase).
3. Redeploy after saving the variables. Vite embeds `VITE_` variables at build time, so adding them does not update an already-built deployment.

Never put a Supabase `service_role` key in a `VITE_` variable or in frontend code. Configure the deployed website URL in Supabase Auth's allowed redirect URLs if authentication redirects are used.

## Implemented

- Supabase email/password sign-in and password reset.
- Live property, unit, tenant, lease, invoice, payment, utility, deposit, escalation, maintenance, document, notification, audit, settings, and profile data.
- Electricity/water statements matching the supplied printed account form, including readings, consumption, multipliers, rates, VAT, late surcharge, combined totals, and print layout.
- Supabase-backed create/edit/delete workflows with role-based UI and database RLS.
- Lease/unit writes are atomic through `save_lease_with_units`; overlapping active or pending lease assignments are rejected.
- Monthly rent invoice generation is idempotent, and payment posting updates the payment and invoice balance transactionally.
- Private tenant document uploads and short-lived signed download links.
- Dashboard property, occupancy, receivable, and collection details derive from database records visible to the signed-in account.
- Simple, graph-free dashboard details with shared notes that all signed-in roles can create, view, edit, and delete.
- CSV reports for invoices, payments, tenants, and units.

The user must run the schema in their own Supabase project before these workflows can be used. Actual project connectivity and RLS behavior must be verified with the configured project and signed-in roles.
