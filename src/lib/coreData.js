import { supabase } from './supabase';

const coreTables = [
  'properties',
  'units',
  'tenants',
  'leases',
  'lease_units',
  'invoices',
  'payments',
  'deposits',
  'utility_bills',
  'escalations',
  'maintenance_requests',
  'documents',
  'notifications',
  'audit_logs',
  'system_settings',
  'dashboard_notes',
  'profiles',
];

export function createEmptyCoreData() {
  return {
    ...Object.fromEntries(coreTables.map((table) => [table, []])),
    profile: null,
  };
}

export async function loadCoreData(userId) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw new Error(`Unable to load your profile: ${profileError.message}`);

  const tables = coreTables;
  const results = await Promise.all(tables.map((table) => {
    const query = supabase.from(table).select('*');
    const orderColumn = table === 'system_settings'
      ? 'setting_key'
      : table === 'dashboard_notes'
        ? 'updated_at'
        : 'created_at';
    return query.order(orderColumn, { ascending: false });
  }));
  const failedIndex = results.findIndex(({ error }) => error);
  if (failedIndex !== -1) {
    throw new Error(`Unable to load ${tables[failedIndex]}: ${results[failedIndex].error.message}`);
  }

  const data = createEmptyCoreData();
  tables.forEach((table, index) => {
    data[table] = results[index].data ?? [];
  });
  return { ...data, profile };
}

export async function saveRecord(table, record) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { id, ...values } = record;
  let request = supabase.from(table);
  if (table === 'system_settings') {
    request = request.upsert(values, { onConflict: 'setting_key' });
  } else {
    request = id ? request.update(values).eq('id', id) : request.insert(values);
  }
  const { data, error } = await request.select().single();
  if (error) throw error;
  return data;
}

export async function saveLeaseWithUnits(lease, unitIds) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('save_lease_with_units', {
    p_lease: lease,
    p_unit_ids: unitIds,
  });
  if (error) throw error;
  return data;
}

export async function deleteRecord(table, id) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function generateMonthlyRentInvoices(period) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('generate_monthly_rent_invoices', {
    p_billing_period: `${period}-01`,
  });
  if (error) throw error;
  return data;
}

export async function postInvoicePayment(payment) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('post_invoice_payment', {
    p_invoice_id: payment.invoice_id,
    p_amount: Number(payment.amount),
    p_payment_method: payment.payment_method,
    p_payment_date: payment.payment_date || null,
    p_reference_number: payment.reference_number || null,
  });
  if (error) throw error;
  return data;
}
