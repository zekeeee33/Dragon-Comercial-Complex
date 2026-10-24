# Dragon Commercial Complex Leasing System

## Run locally

1. Copy `.env.example` to `.env` and set the Supabase project URL and publishable/anon key.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). If you already installed an earlier version, rerun the updated file to add the utility statement readings, tax/surcharge calculations, print fields, and existing operational tables, policies, and RPCs.
3. Run [`supabase/import_current_renters.sql`](./supabase/import_current_renters.sql) to load the supplied renter schedule into a reviewable staging table. The import preserves the original grouped stall labels and unknown rent values; it does not create lease assignments.
4. Create or confirm `sceratoconcepts@gmail.com` in Supabase Auth. The schema assigns that account the administrator role automatically, whether it exists before or after schema setup.

5. Install dependencies and start the dev server:

   ```sh
   npm install
   npm run dev
   ```

## Implemented

- Supabase email/password sign-in and password reset.
- Live property, unit, tenant, lease, invoice, payment, utility, deposit, escalation, maintenance, document, notification, audit, settings, and profile data.
- Electricity/water statements matching the supplied printed account form, including readings, consumption, multipliers, rates, VAT, late surcharge, combined totals, and print layout.
- Supabase-backed create/edit/delete workflows with role-based UI and database RLS.
- Lease/unit writes are atomic through `save_lease_with_units`; overlapping active or pending lease assignments are rejected.
- Monthly rent invoice generation is idempotent, and payment posting updates the payment and invoice balance transactionally.
- Private tenant document uploads and short-lived signed download links.
- Dashboard property, occupancy, receivable, collection, and aging metrics derive from database records visible to the signed-in account.
- CSV reports for invoices, payments, tenants, and units.

The user must run the schema in their own Supabase project before these workflows can be used. Actual project connectivity and RLS behavior must be verified with the configured project and signed-in roles.
