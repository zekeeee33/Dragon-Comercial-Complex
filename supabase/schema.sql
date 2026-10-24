-- Dragon Commercial Complex Leasing System
-- Run in the Supabase SQL Editor on a project with Supabase Auth and Storage enabled.
-- This script is intended to be safe to re-run. It creates a private document bucket.
--
-- Roles: admin, manager, accounting, operations, viewer.
-- The initial administrator is provisioned by the Auth-user trigger below.

create extension if not exists pgcrypto;

-- Keep updated_at consistent on mutable records.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profiles are created automatically for new Supabase Auth users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text unique,
  phone text,
  role text not null default 'viewer'
    check (role in ('admin', 'manager', 'accounting', 'operations', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    case
      when lower(coalesce(new.email, '')) = 'sceratoconcepts@gmail.com' then 'admin'
      else 'viewer'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Read the caller's role without recursive profile RLS checks.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = any (allowed_roles), false);
$$;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.has_any_role(text[]) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_any_role(text[]) to authenticated;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text not null,
  property_type text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  code text not null,
  building text,
  floor text,
  section text,
  unit_type text not null,
  floor_area_m2 numeric(12,2) not null default 0 check (floor_area_m2 >= 0),
  base_rent numeric(12,2) not null default 0 check (base_rent >= 0),
  rate_calculation_method text not null default 'fixed_monthly'
    check (rate_calculation_method in ('fixed_monthly', 'per_sqm', 'custom')),
  is_rentable boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, code)
);

-- Occupancy is derived from leases/reservations; do not store an editable availability label.
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_reference text not null unique,
  tenant_type text not null check (tenant_type in ('individual', 'business')),
  individual_name text,
  business_name text,
  trade_name text,
  representative_name text,
  contact_number text,
  email text,
  business_address text,
  tin text,
  emergency_contact text,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'blacklisted', 'pending_review')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (tenant_type = 'individual' and nullif(trim(individual_name), '') is not null)
    or
    (tenant_type = 'business' and nullif(trim(business_name), '') is not null)
  )
);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'active', 'expiring', 'expired', 'terminated', 'renewed')),
  monthly_rental_amount numeric(12,2) not null default 0 check (monthly_rental_amount >= 0),
  rate_calculation_method text not null default 'fixed_monthly'
    check (rate_calculation_method in ('fixed_monthly', 'per_sqm', 'custom')),
  billing_frequency text not null default 'monthly'
    check (billing_frequency in ('monthly', 'quarterly', 'annual', 'custom')),
  due_day integer not null default 5 check (due_day between 1 and 31),
  grace_period_days integer not null default 0 check (grace_period_days >= 0),
  security_deposit_amount numeric(12,2) not null default 0 check (security_deposit_amount >= 0),
  advance_rent_amount numeric(12,2) not null default 0 check (advance_rent_amount >= 0),
  escalation_terms text,
  utility_billing_arrangement text,
  penalty_terms text,
  special_provisions text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.lease_units (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (lease_id, unit_id)
);

-- Serialize assignments by unit before checking lease dates, preventing concurrent overlap inserts.
create or replace function public.prevent_overlapping_unit_leases()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_lease public.leases%rowtype;
begin
  select * into target_lease
  from public.leases
  where id = new.lease_id;

  if target_lease.status in ('pending_approval', 'active', 'expiring') then
    perform 1 from public.units where id = new.unit_id for update;

    if exists (
      select 1
      from public.lease_units lu
      join public.leases other_lease on other_lease.id = lu.lease_id
      where lu.unit_id = new.unit_id
        and lu.lease_id <> new.lease_id
        and other_lease.status in ('pending_approval', 'active', 'expiring')
        and target_lease.start_date <= other_lease.end_date
        and target_lease.end_date >= other_lease.start_date
    ) then
      raise exception 'Unit % already has an overlapping lease assignment.', new.unit_id
        using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lease_units_prevent_overlap on public.lease_units;
create trigger lease_units_prevent_overlap
before insert or update on public.lease_units
for each row execute function public.prevent_overlapping_unit_leases();

create or replace function public.prevent_lease_date_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  assigned_unit record;
begin
  if new.status not in ('pending_approval', 'active', 'expiring') then
    return new;
  end if;

  -- Lock assigned units in a stable order while checking changed dates/status.
  for assigned_unit in
    select u.id
    from public.lease_units lu
    join public.units u on u.id = lu.unit_id
    where lu.lease_id = new.id
    order by u.id
    for update of u
  loop
    if exists (
      select 1
      from public.lease_units other_lu
      join public.leases other_lease on other_lease.id = other_lu.lease_id
      where other_lu.unit_id = assigned_unit.id
        and other_lu.lease_id <> new.id
        and other_lease.status in ('pending_approval', 'active', 'expiring')
        and new.start_date <= other_lease.end_date
        and new.end_date >= other_lease.start_date
    ) then
      raise exception 'Lease dates overlap another assignment for unit %.', assigned_unit.id
        using errcode = '23505';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists leases_prevent_date_overlap on public.leases;
create trigger leases_prevent_date_overlap
before update of start_date, end_date, status on public.leases
for each row execute function public.prevent_lease_date_overlap();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  lease_id uuid references public.leases(id) on delete restrict,
  category text not null,
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  expiry_date date,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'expired')),
  replaced_document_id uuid references public.documents(id) on delete set null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tenant_id is not null or lease_id is not null)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_number text not null unique,
  invoice_type text not null check (invoice_type in ('rent', 'utilities', 'deposit', 'penalty', 'other')),
  billing_period text,
  issue_date date not null default current_date,
  due_date date not null,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  outstanding_amount numeric(12,2) not null default 0 check (outstanding_amount between 0 and total_amount),
  status text not null default 'open' check (status in ('draft', 'open', 'partial', 'paid', 'overdue', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  payment_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  reference_number text,
  status text not null default 'posted' check (status in ('pending', 'posted', 'reversed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  lease_id uuid references public.leases(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  deposit_type text not null default 'security' check (deposit_type in ('security', 'advance', 'other')),
  receipt_reference text,
  status text not null default 'held' check (status in ('held', 'released', 'forfeited')),
  held_date date not null default current_date,
  released_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'released' or released_date is not null)
);

create table if not exists public.utility_bills (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  lease_id uuid references public.leases(id) on delete restrict,
  billing_period text not null,
  electricity_amount numeric(12,2) not null default 0 check (electricity_amount >= 0),
  water_amount numeric(12,2) not null default 0 check (water_amount >= 0),
  total_amount numeric(12,2) generated always as (electricity_amount + water_amount) stored,
  status text not null default 'billed' check (status in ('draft', 'billed', 'partial', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, billing_period)
);

-- Extend utility bills to retain the meter readings and statement-of-account details.
alter table public.utility_bills
  add column if not exists tenant_id uuid references public.tenants(id) on delete restrict,
  add column if not exists bill_number text,
  add column if not exists stall_number text,
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists due_date date,
  add column if not exists electricity_present_reading numeric(14,3),
  add column if not exists electricity_previous_reading numeric(14,3),
  add column if not exists electricity_multiplier numeric(12,4),
  add column if not exists electricity_rate_per_unit numeric(12,4),
  add column if not exists electricity_vat_rate numeric(5,2),
  add column if not exists electricity_vat_amount numeric(12,2),
  add column if not exists water_present_reading numeric(14,3),
  add column if not exists water_previous_reading numeric(14,3),
  add column if not exists water_multiplier numeric(12,4),
  add column if not exists water_rate_per_unit numeric(12,4),
  add column if not exists water_vat_rate numeric(5,2),
  add column if not exists water_vat_amount numeric(12,2),
  add column if not exists late_fee_rate numeric(5,2),
  add column if not exists prepared_by text,
  add column if not exists received_by text,
  add column if not exists date_received date;

alter table public.utility_bills
  add column if not exists total_due numeric(12,2)
    generated always as (
      round(
        electricity_amount + water_amount
        + coalesce(electricity_vat_amount, 0)
        + coalesce(water_vat_amount, 0),
        2
      )
    ) stored,
  add column if not exists electricity_amount_after_due_date numeric(12,2)
    generated always as (
      round(
        (electricity_amount + coalesce(electricity_vat_amount, 0))
        * (1 + coalesce(late_fee_rate, 0) / 100),
        2
      )
    ) stored,
  add column if not exists water_amount_after_due_date numeric(12,2)
    generated always as (
      round(
        (water_amount + coalesce(water_vat_amount, 0))
        * (1 + coalesce(late_fee_rate, 0) / 100),
        2
      )
    ) stored,
  add column if not exists amount_after_due_date numeric(12,2)
    generated always as (
      round(
        (electricity_amount + coalesce(electricity_vat_amount, 0))
        * (1 + coalesce(late_fee_rate, 0) / 100),
        2
      )
      + round(
        (water_amount + coalesce(water_vat_amount, 0))
        * (1 + coalesce(late_fee_rate, 0) / 100),
        2
      )
    ) stored;

create unique index if not exists utility_bills_bill_number_uidx
  on public.utility_bills (bill_number)
  where bill_number is not null;

create or replace function public.calculate_utility_bill_amounts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.period_start is null) <> (new.period_end is null) then
    raise exception 'Both covered-period dates are required.'
      using errcode = '23514';
  end if;
  if new.period_start is not null and new.period_end < new.period_start then
    raise exception 'The covered-period end date cannot precede its start date.'
      using errcode = '23514';
  end if;
  if new.period_start is not null then
    new.billing_period := to_char(new.period_start, 'YYYY-MM');
  end if;

  if new.electricity_present_reading is not null
    or new.electricity_previous_reading is not null
    or new.electricity_multiplier is not null
    or new.electricity_rate_per_unit is not null
    or new.electricity_vat_rate is not null then
    if new.electricity_present_reading is null
      or new.electricity_previous_reading is null
      or new.electricity_multiplier is null
      or new.electricity_rate_per_unit is null
      or new.electricity_vat_rate is null then
      raise exception 'Complete all electricity readings and rate fields.'
        using errcode = '23514';
    end if;
    if new.electricity_present_reading < new.electricity_previous_reading
      or new.electricity_multiplier < 0
      or new.electricity_rate_per_unit < 0
      or new.electricity_vat_rate < 0
      or new.electricity_vat_rate > 100 then
      raise exception 'Electricity readings, multiplier, rate, and VAT rate must be valid non-negative values.'
        using errcode = '23514';
    end if;
    new.electricity_amount := round(
      (new.electricity_present_reading - new.electricity_previous_reading)
      * new.electricity_multiplier * new.electricity_rate_per_unit,
      2
    );
    new.electricity_vat_amount := round(
      new.electricity_amount * new.electricity_vat_rate / 100,
      2
    );
  end if;

  if new.water_present_reading is not null
    or new.water_previous_reading is not null
    or new.water_multiplier is not null
    or new.water_rate_per_unit is not null
    or new.water_vat_rate is not null then
    if new.water_present_reading is null
      or new.water_previous_reading is null
      or new.water_multiplier is null
      or new.water_rate_per_unit is null
      or new.water_vat_rate is null then
      raise exception 'Complete all water readings and rate fields.'
        using errcode = '23514';
    end if;
    if new.water_present_reading < new.water_previous_reading
      or new.water_multiplier < 0
      or new.water_rate_per_unit < 0
      or new.water_vat_rate < 0
      or new.water_vat_rate > 100 then
      raise exception 'Water readings, multiplier, rate, and VAT rate must be valid non-negative values.'
        using errcode = '23514';
    end if;
    new.water_amount := round(
      (new.water_present_reading - new.water_previous_reading)
      * new.water_multiplier * new.water_rate_per_unit,
      2
    );
    new.water_vat_amount := round(
      new.water_amount * new.water_vat_rate / 100,
      2
    );
  end if;

  if new.late_fee_rate is not null and (new.late_fee_rate < 0 or new.late_fee_rate > 100) then
    raise exception 'Late fee rate must be between 0 and 100 percent.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists calculate_utility_bill_amounts on public.utility_bills;
create trigger calculate_utility_bill_amounts
before insert or update on public.utility_bills
for each row execute function public.calculate_utility_bill_amounts();

create table if not exists public.escalations (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  scheduled_date date not null,
  old_rate numeric(12,2) not null check (old_rate >= 0),
  new_rate numeric(12,2) not null check (new_rate >= 0),
  escalation_percent numeric(5,2) check (escalation_percent >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'applied', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  lease_id uuid references public.leases(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  reported_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  scheduled_date date,
  completed_at timestamptz,
  estimated_cost numeric(12,2) check (estimated_cost is null or estimated_cost >= 0),
  actual_cost numeric(12,2) check (actual_cost is null or actual_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Attach update timestamp triggers (drop first to allow script re-runs).
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'properties', 'units', 'tenants', 'leases',
    'documents', 'invoices', 'payments', 'deposits',
    'utility_bills', 'escalations', 'maintenance_requests', 'system_settings'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

-- Useful search and relation indexes.
create index if not exists idx_units_property_id on public.units(property_id);
create index if not exists idx_tenants_status on public.tenants(status);
create index if not exists idx_leases_tenant_dates on public.leases(tenant_id, start_date, end_date);
create index if not exists idx_leases_status on public.leases(status);
create index if not exists idx_lease_units_unit_id on public.lease_units(unit_id);
create index if not exists idx_documents_tenant_id on public.documents(tenant_id);
create index if not exists idx_documents_lease_id on public.documents(lease_id);
create index if not exists idx_invoices_tenant_due_date on public.invoices(tenant_id, due_date);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_payments_invoice_id on public.payments(invoice_id);
create index if not exists idx_deposits_tenant_id on public.deposits(tenant_id);
create index if not exists idx_utility_bills_unit_period on public.utility_bills(unit_id, billing_period);
create index if not exists idx_escalations_lease_date on public.escalations(lease_id, scheduled_date);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_maintenance_status_priority on public.maintenance_requests(status, priority);
create index if not exists idx_maintenance_unit_id on public.maintenance_requests(unit_id);

-- Keep payment tenant linkage consistent with the invoice it pays.
create or replace function public.validate_payment_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.invoices i
    where i.id = new.invoice_id and i.tenant_id = new.tenant_id
  ) then
    raise exception 'Payment tenant must match the invoice tenant.';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_validate_tenant on public.payments;
create trigger payments_validate_tenant
before insert or update on public.payments
for each row execute function public.validate_payment_tenant();

-- Enable RLS on all application tables.
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;
alter table public.lease_units enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.deposits enable row level security;
alter table public.utility_bills enable row level security;
alter table public.escalations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.system_settings enable row level security;

-- Profiles: authenticated users may read profiles; only admins can change roles or profile records.
drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.has_any_role(array['admin']));

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles
for all to authenticated
using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

-- General operational read access. Mutations are limited by role.
drop policy if exists properties_read_staff on public.properties;
create policy properties_read_staff on public.properties for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting', 'operations', 'viewer']));
drop policy if exists properties_manage on public.properties;
create policy properties_manage on public.properties for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

drop policy if exists units_read_staff on public.units;
create policy units_read_staff on public.units for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting', 'operations', 'viewer']));
drop policy if exists units_manage on public.units;
create policy units_manage on public.units for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

drop policy if exists tenants_read_staff on public.tenants;
create policy tenants_read_staff on public.tenants for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting', 'operations']));
drop policy if exists tenants_manage on public.tenants;
create policy tenants_manage on public.tenants for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

drop policy if exists leases_read_staff on public.leases;
create policy leases_read_staff on public.leases for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting', 'operations']));
drop policy if exists leases_manage on public.leases;
create policy leases_manage on public.leases for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

drop policy if exists lease_units_read_staff on public.lease_units;
create policy lease_units_read_staff on public.lease_units for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting', 'operations']));
drop policy if exists lease_units_manage on public.lease_units;
create policy lease_units_manage on public.lease_units for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

-- Documents are restricted to management and accounting staff.
drop policy if exists documents_read_authorized on public.documents;
create policy documents_read_authorized on public.documents for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']));
drop policy if exists documents_manage_authorized on public.documents;
create policy documents_manage_authorized on public.documents for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

drop policy if exists invoices_read_finance on public.invoices;
create policy invoices_read_finance on public.invoices for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']));
drop policy if exists invoices_manage_finance on public.invoices;
create policy invoices_manage_finance on public.invoices for all to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']))
with check (public.has_any_role(array['admin', 'manager', 'accounting']));

drop policy if exists payments_read_finance on public.payments;
create policy payments_read_finance on public.payments for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']));
drop policy if exists payments_manage_finance on public.payments;
create policy payments_manage_finance on public.payments for all to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']))
with check (public.has_any_role(array['admin', 'manager', 'accounting']));

drop policy if exists deposits_read_finance on public.deposits;
create policy deposits_read_finance on public.deposits for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']));
drop policy if exists deposits_manage_finance on public.deposits;
create policy deposits_manage_finance on public.deposits for all to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']))
with check (public.has_any_role(array['admin', 'manager', 'accounting']));

drop policy if exists utility_bills_read_staff on public.utility_bills;
create policy utility_bills_read_staff on public.utility_bills for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting', 'operations']));
drop policy if exists utility_bills_manage on public.utility_bills;
create policy utility_bills_manage on public.utility_bills for all to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting', 'operations']))
with check (public.has_any_role(array['admin', 'manager', 'accounting', 'operations']));

drop policy if exists escalations_read_management on public.escalations;
create policy escalations_read_management on public.escalations for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']));
drop policy if exists escalations_manage on public.escalations;
create policy escalations_manage on public.escalations for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

drop policy if exists notifications_read_owner_or_admin on public.notifications;
create policy notifications_read_owner_or_admin on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or public.has_any_role(array['admin', 'manager']));
drop policy if exists notifications_update_owner_or_admin on public.notifications;
create policy notifications_update_owner_or_admin on public.notifications for update to authenticated
using (user_id = (select auth.uid()) or public.has_any_role(array['admin', 'manager']))
with check (user_id = (select auth.uid()) or public.has_any_role(array['admin', 'manager']));
drop policy if exists notifications_insert_management on public.notifications;
create policy notifications_insert_management on public.notifications for insert to authenticated
with check (public.has_any_role(array['admin', 'manager']));

drop policy if exists audit_logs_read_admin on public.audit_logs;
create policy audit_logs_read_admin on public.audit_logs for select to authenticated
using (public.has_any_role(array['admin']));
drop policy if exists audit_logs_insert_staff on public.audit_logs;
create policy audit_logs_insert_staff on public.audit_logs for insert to authenticated
with check (user_id = (select auth.uid()) or public.has_any_role(array['admin']));

drop policy if exists maintenance_read_staff on public.maintenance_requests;
create policy maintenance_read_staff on public.maintenance_requests for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'operations']));
drop policy if exists maintenance_manage_staff on public.maintenance_requests;
create policy maintenance_manage_staff on public.maintenance_requests for all to authenticated
using (public.has_any_role(array['admin', 'manager', 'operations']))
with check (public.has_any_role(array['admin', 'manager', 'operations']));

drop policy if exists system_settings_read_staff on public.system_settings;
create policy system_settings_read_staff on public.system_settings for select to authenticated
using (public.has_any_role(array['admin', 'manager']));
drop policy if exists system_settings_manage_admin on public.system_settings;
create policy system_settings_manage_admin on public.system_settings for all to authenticated
using (public.has_any_role(array['admin']))
with check (public.has_any_role(array['admin']));

-- Table grants make the client API usable; RLS policies above remain the access boundary.
grant select, insert, update, delete on
  public.profiles,
  public.properties,
  public.units,
  public.tenants,
  public.leases,
  public.lease_units,
  public.documents,
  public.invoices,
  public.payments,
  public.deposits,
  public.utility_bills,
  public.escalations,
  public.notifications,
  public.audit_logs,
  public.maintenance_requests,
  public.system_settings
to authenticated;

-- Private storage bucket. Direct insert avoids relying on storage.create_bucket(), which
-- is not available in some Supabase SQL environments.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tenant_documents_read_authorized on storage.objects;
create policy tenant_documents_read_authorized on storage.objects
for select to authenticated
using (
  bucket_id = 'tenant-documents'
  and public.has_any_role(array['admin', 'manager', 'accounting'])
);

drop policy if exists tenant_documents_upload_managers on storage.objects;
create policy tenant_documents_upload_managers on storage.objects
for insert to authenticated
with check (
  bucket_id = 'tenant-documents'
  and public.has_any_role(array['admin', 'manager'])
);

drop policy if exists tenant_documents_update_managers on storage.objects;
create policy tenant_documents_update_managers on storage.objects
for update to authenticated
using (
  bucket_id = 'tenant-documents'
  and public.has_any_role(array['admin', 'manager'])
)
with check (
  bucket_id = 'tenant-documents'
  and public.has_any_role(array['admin', 'manager'])
);

drop policy if exists tenant_documents_delete_managers on storage.objects;
create policy tenant_documents_delete_managers on storage.objects
for delete to authenticated
using (
  bucket_id = 'tenant-documents'
  and public.has_any_role(array['admin', 'manager'])
);

-- Save a lease and its unit assignments atomically from the browser client.
create or replace function public.save_lease_with_units(p_lease jsonb, p_unit_ids uuid[])
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_lease_id uuid;
begin
  if not public.has_any_role(array['admin', 'manager']) then
    raise exception 'Only managers and administrators can save leases.'
      using errcode = '42501';
  end if;

  if coalesce(array_length(p_unit_ids, 1), 0) = 0 then
    raise exception 'A lease must have at least one unit assigned.'
      using errcode = '23514';
  end if;

  insert into public.leases (
    id,
    contract_number,
    tenant_id,
    start_date,
    end_date,
    status,
    monthly_rental_amount,
    rate_calculation_method,
    billing_frequency,
    due_day,
    grace_period_days,
    security_deposit_amount,
    advance_rent_amount,
    escalation_terms,
    utility_billing_arrangement,
    penalty_terms,
    special_provisions,
    created_by
  )
  values (
    coalesce(nullif(p_lease ->> 'id', '')::uuid, gen_random_uuid()),
    p_lease ->> 'contract_number',
    (p_lease ->> 'tenant_id')::uuid,
    (p_lease ->> 'start_date')::date,
    (p_lease ->> 'end_date')::date,
    coalesce(p_lease ->> 'status', 'draft'),
    coalesce((p_lease ->> 'monthly_rental_amount')::numeric, 0),
    coalesce(p_lease ->> 'rate_calculation_method', 'fixed_monthly'),
    coalesce(p_lease ->> 'billing_frequency', 'monthly'),
    coalesce((p_lease ->> 'due_day')::integer, 5),
    coalesce((p_lease ->> 'grace_period_days')::integer, 0),
    coalesce((p_lease ->> 'security_deposit_amount')::numeric, 0),
    coalesce((p_lease ->> 'advance_rent_amount')::numeric, 0),
    nullif(p_lease ->> 'escalation_terms', ''),
    nullif(p_lease ->> 'utility_billing_arrangement', ''),
    nullif(p_lease ->> 'penalty_terms', ''),
    nullif(p_lease ->> 'special_provisions', ''),
    (select auth.uid())
  )
  on conflict (id) do update set
    contract_number = excluded.contract_number,
    tenant_id = excluded.tenant_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    status = excluded.status,
    monthly_rental_amount = excluded.monthly_rental_amount,
    rate_calculation_method = excluded.rate_calculation_method,
    billing_frequency = excluded.billing_frequency,
    due_day = excluded.due_day,
    grace_period_days = excluded.grace_period_days,
    security_deposit_amount = excluded.security_deposit_amount,
    advance_rent_amount = excluded.advance_rent_amount,
    escalation_terms = excluded.escalation_terms,
    utility_billing_arrangement = excluded.utility_billing_arrangement,
    penalty_terms = excluded.penalty_terms,
    special_provisions = excluded.special_provisions
  returning id into saved_lease_id;

  delete from public.lease_units where lease_id = saved_lease_id;
  insert into public.lease_units (lease_id, unit_id)
  select saved_lease_id, assigned_unit_id
  from (select distinct unnest(p_unit_ids) as assigned_unit_id) assignments;

  return saved_lease_id;
end;
$$;

revoke all on function public.save_lease_with_units(jsonb, uuid[]) from public, anon;
grant execute on function public.save_lease_with_units(jsonb, uuid[]) to authenticated;

-- Generate one rent invoice per active lease for a calendar month. The invoice
-- number is deterministic, making repeated runs safe and preventing duplicate bills.
create or replace function public.generate_monthly_rent_invoices(p_billing_period date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  lease_row public.leases%rowtype;
  period_start date := date_trunc('month', p_billing_period)::date;
  period_end date := (date_trunc('month', p_billing_period) + interval '1 month - 1 day')::date;
  generated_count integer := 0;
  invoice_due_date date;
  invoice_no text;
begin
  if not public.has_any_role(array['admin', 'manager', 'accounting']) then
    raise exception 'You are not authorized to generate rent invoices.'
      using errcode = '42501';
  end if;

  for lease_row in
    select l.*
    from public.leases l
    where l.status in ('active', 'expiring')
      and l.start_date <= period_end
      and l.end_date >= period_start
  loop
    invoice_due_date := period_start + least(
      lease_row.due_day,
      extract(day from period_end)::integer
    ) - 1;
    invoice_no := 'DCC-' || to_char(period_start, 'YYYYMM') || '-' || upper(substr(md5(lease_row.id::text), 1, 8));

    insert into public.invoices (
      lease_id, tenant_id, invoice_number, invoice_type, billing_period,
      issue_date, due_date, subtotal, total_amount, outstanding_amount, status
    )
    values (
      lease_row.id, lease_row.tenant_id, invoice_no, 'rent',
      to_char(period_start, 'YYYY-MM'), period_start, invoice_due_date,
      lease_row.monthly_rental_amount, lease_row.monthly_rental_amount,
      lease_row.monthly_rental_amount, 'open'
    )
    on conflict (invoice_number) do nothing;

    if found then generated_count := generated_count + 1; end if;
  end loop;
  return generated_count;
end;
$$;

revoke all on function public.generate_monthly_rent_invoices(date) from public, anon;
grant execute on function public.generate_monthly_rent_invoices(date) to authenticated;

-- Record a payment and update its invoice balance in one transaction.
create or replace function public.post_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date default current_date,
  p_reference_number text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  invoice_row public.invoices%rowtype;
  payment_id uuid;
  new_balance numeric(12,2);
begin
  if not public.has_any_role(array['admin', 'manager', 'accounting']) then
    raise exception 'You are not authorized to post invoice payments.'
      using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.'
      using errcode = '23514';
  end if;
  if nullif(trim(p_payment_method), '') is null then
    raise exception 'Payment method is required.'
      using errcode = '23514';
  end if;

  select * into invoice_row
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found.' using errcode = 'P0002';
  end if;
  if invoice_row.status = 'void' then
    raise exception 'Cannot post a payment to a void invoice.' using errcode = '23514';
  end if;
  if p_amount > invoice_row.outstanding_amount then
    raise exception 'Payment exceeds the outstanding invoice balance of %.', invoice_row.outstanding_amount
      using errcode = '23514';
  end if;

  insert into public.payments (invoice_id, tenant_id, payment_date, amount, payment_method, reference_number, created_by)
  values (invoice_row.id, invoice_row.tenant_id, coalesce(p_payment_date, current_date), p_amount, trim(p_payment_method), nullif(trim(p_reference_number), ''), (select auth.uid()))
  returning id into payment_id;

  new_balance := invoice_row.outstanding_amount - p_amount;
  update public.invoices
  set outstanding_amount = new_balance,
      status = case when new_balance = 0 then 'paid' else 'partial' end
  where id = invoice_row.id;

  return payment_id;
end;
$$;

revoke all on function public.post_invoice_payment(uuid, numeric, text, date, text) from public, anon;
grant execute on function public.post_invoice_payment(uuid, numeric, text, date, text) to authenticated;

-- Audit records capture changed field names, not their values, to avoid copying
-- personal/contact/tax data into the audit trail.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_data jsonb;
  after_data jsonb;
  entity_uuid uuid;
  changed_keys text[];
begin
  before_data := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after_data := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  entity_uuid := coalesce(
    nullif(after_data ->> 'id', '')::uuid,
    nullif(after_data ->> 'id', '')::uuid,
    nullif(before_data ->> 'id', '')::uuid,
    nullif(before_data ->> 'id', '')::uuid
  );

  select coalesce(array_agg(key order by key), array[]::text[])
  into changed_keys
  from (
    select coalesce(new_key.key, old_key.key) as key
    from jsonb_object_keys(after_data) as new_key(key)
    full join jsonb_object_keys(before_data) as old_key(key) using (key)
    where after_data -> coalesce(new_key.key, old_key.key)
      is distinct from before_data -> coalesce(new_key.key, old_key.key)
  ) changes;

  insert into public.audit_logs (user_id, entity_type, entity_id, action, details)
  values (
    (select auth.uid()),
    tg_table_name,
    entity_uuid,
    lower(tg_op),
    jsonb_build_object('changed_fields', changed_keys)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'properties', 'units', 'tenants', 'leases', 'lease_units', 'documents',
    'invoices', 'payments', 'deposits', 'utility_bills', 'escalations',
    'maintenance_requests', 'notifications', 'system_settings'
  ] loop
    execute format('drop trigger if exists audit_changes on public.%I', table_name);
    execute format(
      'create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      table_name
    );
  end loop;
end;
$$;

-- Promote the specified account if it already exists. If it does not exist yet,
-- handle_new_user() will create its profile with the admin role when it signs up.
update public.profiles
set role = 'admin',
    status = 'active',
    updated_at = now()
where lower(email) = 'sceratoconcepts@gmail.com';
