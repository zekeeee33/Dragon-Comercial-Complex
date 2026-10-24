-- Imports the renter schedule supplied for Dragon Commercial Complex.
--
-- Run supabase/schema.sql first. This file intentionally stages the source roster
-- rather than creating unit/lease assignments: some stall references overlap
-- (for example A3/A4/A6/A7) and the sheet has no lease start/end dates.
-- Stall references and missing rent values are retained exactly as supplied so
-- they can be reviewed before matching to the normalized tenants/units/leases.

create table if not exists public.current_renter_roster (
  id uuid primary key default gen_random_uuid(),
  source_row integer not null unique,
  stall_reference text,
  lessee_name text not null,
  monthly_rent_php numeric(12,2) check (monthly_rent_php is null or monthly_rent_php >= 0),
  matched_tenant_id uuid references public.tenants(id) on delete set null,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'matched', 'needs_clarification')),
  source_notes text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists current_renter_roster_set_updated_at on public.current_renter_roster;
create trigger current_renter_roster_set_updated_at
before update on public.current_renter_roster
for each row execute function public.set_updated_at();

create index if not exists idx_current_renter_roster_name
  on public.current_renter_roster (lower(lessee_name));
create index if not exists idx_current_renter_roster_review
  on public.current_renter_roster (review_status);

alter table public.current_renter_roster enable row level security;

drop policy if exists current_renter_roster_read_authorized on public.current_renter_roster;
create policy current_renter_roster_read_authorized
on public.current_renter_roster
for select to authenticated
using (public.has_any_role(array['admin', 'manager', 'accounting']));

drop policy if exists current_renter_roster_manage on public.current_renter_roster;
create policy current_renter_roster_manage
on public.current_renter_roster
for all to authenticated
using (public.has_any_role(array['admin', 'manager']))
with check (public.has_any_role(array['admin', 'manager']));

grant select, insert, update, delete on public.current_renter_roster to authenticated;

insert into public.current_renter_roster
  (source_row, stall_reference, lessee_name, monthly_rent_php, source_notes)
values
  (1,  '1',              'RYAN JAY APELACIO',                    20836.84, null),
  (2,  '2',              'MICHEL J. LHUILLIER FINANCIAL SERVICES', null,     'Rent shown as "-" in source list.'),
  (3,  '3',              'DAVAO A+ CREDIT CORPORATION',           22526.32, null),
  (4,  '4',              'KING CANIS',                            17739.47, null),
  (5,  '5',              'MORALES',                               null,     'Rent amount blank in source list.'),
  (6,  '6',              'MINUTE BURGER',                         19203.68, null),
  (7,  '7-11',            'DALTON PAWNSHOP',                       59131.58, null),
  (8,  '20',             'EYE CRAFTER',                            30640.51, null),
  (9,  '21',             'EYE CRAFTER',                            32172.53, null),
  (10, '26',             'PALAWAN PAWNSHOP',                       34887.60, null),
  (11, '28',             'ALUBAI BLANCO',                          30683.66, null),
  (12, '29',             'ALUBAI BLANCO 2',                        null,     'Rent amount blank in source list.'),
  (13, '32 33 34',       'CLAUDIO CABALLES',                       36042.00, null),
  (14, '38',             'RD PAWNSHOP, INC.',                      23461.20, null),
  (15, '39,40',          'DOC EDGAR L. DELIBO',                    22999.94, null),
  (16, '41-43,46-49',    'AR SALON SKIN AVENUE',                   63073.68, null),
  (17, '44,45',          'PH GLOBAL JET EXPRESS, INC.',            35470.22, null),
  (18, '50',             'DRAGON FROSTA',                          null,     'Rent amount blank in source list.'),
  (19, '70-71',          'HANAH PERPETUA HWANG',                   31162.34, null),
  (20, 'A-E',            'ROSE PHARMACY',                          95833.07, null),
  (21, 'F',              'CEBUANA LHUILLIER',                      20535.64, null),
  (22, 'A1',             'VIVI FACIAL ESSENCE',                    36605.26, null),
  (23, 'A3',             'LABA',                                   16894.74, null),
  (24, 'A4',             'CHOOKS TO GO',                           16894.74, null),
  (25, 'A 6,7,8,9',      'RANDY YAP',                              67579.00, 'Stall reference retained exactly as written.'),
  (26, 'A3,A4,A5',       'CASA DE LIYA',                           45052.63, 'Stall reference overlaps other source entries; verify before unit assignment.'),
  (27, 'A6',             'HOUSE OF BAGS',                          16894.74, 'Stall reference overlaps other source entries; verify before unit assignment.'),
  (28, 'A7',             'LUCHO SISIG EXPRESS',                    11263.16, 'Stall reference overlaps other source entries; verify before unit assignment.'),
  (29, 'A17 & A18',      'BIG BREW',                               33790.00, null),
  (30, 'A19',            'AR SALON',                               33790.00, null),
  (31, 'A20',            'AR SALON 2',                             null,     'Rent amount blank in source list.'),
  (32, 'A21',            'JICKOS',                                 16894.74, null),
  (33, 'A22,A23',        'THE CRAKER BARREL',                      33789.47, null),
  (34, 'A24',            'VAPEMART',                               15589.48, null),
  (35, null,             'DRAGON MART',                            null,     'Stall reference and rent amount blank in source list.'),
  (36, null,             'DRAGON FAMILY KTV',                      null,     'Stall reference and rent amount blank in source list.'),
  (37, null,             'PASTIL N'' MORE',                        5631.58,  'Stall reference blank in source list.'),
  (38, null,             'ALONG THE WAY',                          null,     'Stall reference and rent amount blank in source list.')
on conflict (source_row) do update
set stall_reference = excluded.stall_reference,
    lessee_name = excluded.lessee_name,
    monthly_rent_php = excluded.monthly_rent_php,
    source_notes = excluded.source_notes,
    imported_at = now();
