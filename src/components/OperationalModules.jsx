import { useMemo, useState } from 'react';
import {
  Bell,
  ClipboardList,
  Download,
  FileText,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Upload,
  ExternalLink,
  X,
  Pencil,
} from 'lucide-react';
import { deleteRecord, generateMonthlyRentInvoices, postInvoicePayment, saveRecord } from '../lib/coreData';
import { supabase } from '../lib/supabase';
import { UtilityBills } from './UtilityBills';

const inputClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200';
const fields = {
  invoices: [
    ['invoice_number', 'Invoice number', 'text', true],
    ['lease_id', 'Lease', 'relation', true, 'leases'],
    ['tenant_id', 'Tenant', 'relation', true, 'tenants'],
    ['invoice_type', 'Invoice type', 'select', true, [['rent', 'Rent'], ['utilities', 'Utilities'], ['deposit', 'Deposit'], ['penalty', 'Penalty'], ['other', 'Other']]],
    ['billing_period', 'Billing period (YYYY-MM)', 'month', false],
    ['issue_date', 'Issue date', 'date', true],
    ['due_date', 'Due date', 'date', true],
    ['subtotal', 'Subtotal (PHP)', 'number', true],
    ['tax_amount', 'Tax amount (PHP)', 'number', true],
    ['total_amount', 'Total amount (PHP)', 'number', true],
    ['outstanding_amount', 'Outstanding amount (PHP)', 'number', true],
    ['status', 'Status', 'select', true, [['draft', 'Draft'], ['open', 'Open'], ['partial', 'Partial'], ['paid', 'Paid'], ['overdue', 'Overdue'], ['void', 'Void']]],
  ],
  deposits: [
    ['tenant_id', 'Tenant', 'relation', true, 'tenants'],
    ['lease_id', 'Lease', 'relation', false, 'leases'],
    ['amount', 'Amount (PHP)', 'number', true],
    ['deposit_type', 'Deposit type', 'select', true, [['security', 'Security'], ['advance', 'Advance'], ['other', 'Other']]],
    ['receipt_reference', 'Receipt reference', 'text'],
    ['status', 'Status', 'select', true, [['held', 'Held'], ['released', 'Released'], ['forfeited', 'Forfeited']]],
    ['held_date', 'Held date', 'date', true],
    ['released_date', 'Released date', 'date'],
  ],
  escalations: [
    ['lease_id', 'Lease', 'relation', true, 'leases'],
    ['scheduled_date', 'Scheduled date', 'date', true],
    ['old_rate', 'Current rate (PHP)', 'number', true],
    ['new_rate', 'New rate (PHP)', 'number', true],
    ['escalation_percent', 'Increase (%)', 'number'],
    ['status', 'Status', 'select', true, [['scheduled', 'Scheduled'], ['applied', 'Applied'], ['cancelled', 'Cancelled']]],
  ],
  maintenance_requests: [
    ['title', 'Request title', 'text', true],
    ['property_id', 'Property', 'relation', false, 'properties'],
    ['unit_id', 'Unit', 'relation', false, 'units'],
    ['description', 'Description', 'textarea'],
    ['priority', 'Priority', 'select', true, [['low', 'Low'], ['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent']]],
    ['status', 'Status', 'select', true, [['open', 'Open'], ['in_progress', 'In progress'], ['on_hold', 'On hold'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]],
    ['assigned_to', 'Assigned user', 'relation', false, 'profiles'],
    ['scheduled_date', 'Scheduled date', 'date'],
    ['estimated_cost', 'Estimated cost (PHP)', 'number'],
    ['actual_cost', 'Actual cost (PHP)', 'number'],
  ],
  notifications: [
    ['user_id', 'Recipient', 'relation', true, 'profiles'],
    ['tenant_id', 'Tenant', 'relation', false, 'tenants'],
    ['lease_id', 'Lease', 'relation', false, 'leases'],
    ['title', 'Title', 'text', true],
    ['message', 'Message', 'textarea', true],
    ['channel', 'Channel', 'select', true, [['in_app', 'In app'], ['email', 'Email'], ['sms', 'SMS']]],
    ['is_read', 'Already read', 'checkbox'],
  ],
  profiles: [
    ['full_name', 'Full name', 'text', true],
    ['email', 'Email', 'email', true],
    ['phone', 'Phone', 'tel'],
    ['role', 'Role', 'select', true, [['admin', 'Admin'], ['manager', 'Manager'], ['accounting', 'Accounting'], ['operations', 'Operations'], ['viewer', 'Viewer']]],
    ['status', 'Status', 'select', true, [['active', 'Active'], ['inactive', 'Inactive'], ['suspended', 'Suspended']]],
  ],
  system_settings: [
    ['setting_key', 'Setting key', 'text', true],
    ['description', 'Description', 'text'],
    ['setting_value', 'Value (JSON)', 'textarea', true],
  ],
  units: [
    ['base_rent', 'Base rent (PHP)', 'number', true],
    ['rate_calculation_method', 'Rate method', 'select', true, [['fixed_monthly', 'Fixed monthly'], ['per_sqm', 'Per sqm'], ['custom', 'Custom']]],
  ],
};

const moduleConfig = {
  'Rental Rates': { table: 'units', title: 'Rental rates', columns: ['unit', 'property', 'area', 'base_rent', 'method'], roles: ['admin', 'manager'] },
  'Billing & Invoices': { table: 'invoices', title: 'Billing & invoices', columns: ['invoice_number', 'tenant', 'period', 'total', 'balance', 'due_date', 'status'], roles: ['admin', 'manager', 'accounting'], canCreate: true },
  'Electricity & Water': { table: 'utility_bills', title: 'Electricity & water statements', columns: ['bill_number', 'tenant', 'unit', 'period', 'due_date', 'total_due', 'amount_after_due_date', 'status'], roles: ['admin', 'manager', 'accounting', 'operations'], canCreate: true },
  'Payments & Collections': { table: 'payments', title: 'Payments & collections', columns: ['tenant', 'invoice', 'date', 'amount', 'method', 'reference'], roles: ['admin', 'manager', 'accounting'], canCreate: true, payment: true },
  Deposits: { table: 'deposits', title: 'Deposits', columns: ['tenant', 'lease', 'type', 'amount', 'status', 'held_date'], roles: ['admin', 'manager', 'accounting'], canCreate: true },
  'Escalations & Renewals': { table: 'escalations', title: 'Escalations & renewals', columns: ['lease', 'date', 'old_rate', 'new_rate', 'percent', 'status'], roles: ['admin', 'manager', 'accounting'], canCreate: true },
  Maintenance: { table: 'maintenance_requests', title: 'Maintenance requests', columns: ['title', 'property', 'unit', 'priority', 'status', 'scheduled_date', 'actual_cost'], roles: ['admin', 'manager', 'operations'], canCreate: true },
  Notifications: { table: 'notifications', title: 'Notifications', columns: ['title', 'recipient', 'channel', 'read', 'created_at'], roles: ['admin', 'manager'], canCreate: true },
  'Audit Logs': { table: 'audit_logs', title: 'Audit logs', columns: ['created_at', 'user', 'entity_type', 'action', 'entity_id', 'details'], roles: ['admin'] },
  'User Management': { table: 'profiles', title: 'User management', columns: ['full_name', 'email', 'role', 'status', 'updated_at'], roles: ['admin'], canCreate: false },
  'System Settings': { table: 'system_settings', title: 'System settings', columns: ['setting_key', 'description', 'setting_value', 'updated_at'], roles: ['admin', 'manager'], canCreate: true },
};

function displayValue(column, row, data) {
  if (column === 'tenant') return tenantName(data.tenants.find((item) => item.id === (row.tenant_id ?? data.invoices.find((invoice) => invoice.id === row.invoice_id)?.tenant_id)));
  if (column === 'recipient') return data.profiles.find((item) => item.id === row.user_id)?.email ?? '—';
  if (column === 'lease') return data.leases.find((item) => item.id === (row.lease_id ?? data.invoices.find((invoice) => invoice.id === row.invoice_id)?.lease_id))?.contract_number ?? '—';
  if (column === 'invoice') return data.invoices.find((item) => item.id === row.invoice_id)?.invoice_number ?? '—';
  if (column === 'property') return data.properties.find((item) => item.id === (row.property_id ?? data.units.find((unit) => unit.id === row.unit_id)?.property_id))?.name ?? '—';
  if (column === 'unit') return data.units.find((item) => item.id === (row.unit_id ?? row.id))?.code ?? '—';
  if (column === 'area') return `${row.floor_area_m2 ?? 0} m²`;
  if (column === 'base_rent') return php(row.base_rent);
  if (column === 'method') return (row.payment_method ?? row.rate_calculation_method)?.replaceAll('_', ' ') ?? '—';
  if (column === 'period') return row.billing_period ?? '—';
  if (column === 'total') return php(row.total_amount);
  if (column === 'balance') return php(row.outstanding_amount);
  if (column === 'electricity') return php(row.electricity_amount);
  if (column === 'water') return php(row.water_amount);
  if (column === 'amount') return php(row.amount);
  if (column === 'date') return row.payment_date ?? '—';
  if (column === 'reference') return row.reference_number ?? '—';
  if (column === 'type') return row.deposit_type ?? '—';
  if (column === 'old_rate') return php(row.old_rate);
  if (column === 'new_rate') return php(row.new_rate);
  if (column === 'percent') return row.escalation_percent == null ? '—' : `${row.escalation_percent}%`;
  if (column === 'priority' || column === 'status' || column === 'action') return String(row[column] ?? '—').replaceAll('_', ' ');
  if (column === 'read') return row.is_read ? 'Read' : 'Unread';
  if (column === 'created_at' || column === 'updated_at' || column === 'scheduled_date' || column === 'due_date' || column === 'held_date') {
    return row[column] ? new Date(row[column]).toLocaleString('en-PH') : '—';
  }
  if (column === 'user') return data.profiles.find((item) => item.id === row.user_id)?.email ?? 'System';
  if (column === 'entity_id') return row.entity_id ?? '—';
  if (column === 'details' || column === 'setting_value') return JSON.stringify(row[column] ?? '');
  return row[column] ?? '—';
}

function tenantName(tenant) {
  return tenant?.business_name || tenant?.individual_name || '—';
}

function php(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number(value || 0));
}

function optionRows(source, data) {
  const rows = data[source] ?? [];
  return rows.map((row) => {
    if (source === 'tenants') return [row.id, `${row.tenant_reference} · ${tenantName(row)}`];
    if (source === 'leases') return [row.id, `${row.contract_number} · ${tenantName(data.tenants.find((tenant) => tenant.id === row.tenant_id))}`];
    if (source === 'units') return [row.id, `${row.code} · ${data.properties.find((property) => property.id === row.property_id)?.name ?? ''}`];
    if (source === 'properties') return [row.id, row.name];
    return [row.id, row.full_name || row.email];
  });
}

function EditDialog({ table, record, data, userId, onClose, onSaved }) {
  const currentFields = fields[table];
  const blank = Object.fromEntries(currentFields.map(([name, , type]) => [name, type === 'checkbox' ? false : '']));
  const [values, setValues] = useState(() => ({ ...blank, ...record }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = Object.fromEntries(currentFields.map(([name]) => [name, values[name]]));
      if (record) payload.id = record.id;
      if (table === 'invoices') {
        ['subtotal', 'tax_amount', 'total_amount', 'outstanding_amount'].forEach((key) => { payload[key] = Number(payload[key]); });
      }
      if (table === 'utility_bills') {
        payload.electricity_amount = Number(payload.electricity_amount);
        payload.water_amount = Number(payload.water_amount);
      }
      if (table === 'deposits') payload.amount = Number(payload.amount);
      if (table === 'escalations') {
        payload.old_rate = Number(payload.old_rate);
        payload.new_rate = Number(payload.new_rate);
        if (payload.escalation_percent !== '') payload.escalation_percent = Number(payload.escalation_percent);
        else payload.escalation_percent = null;
      }
      if (table === 'maintenance_requests') {
        ['estimated_cost', 'actual_cost'].forEach((key) => { payload[key] = payload[key] === '' ? null : Number(payload[key]); });
        if (!record) payload.reported_by = userId;
        if (payload.status === 'completed') payload.completed_at = new Date().toISOString();
      }
      if (table === 'notifications' && !record) payload.user_id = payload.user_id || userId;
      if (table === 'profiles') payload.id = record.id;
      if (table === 'system_settings') {
        try {
          payload.setting_value = JSON.parse(payload.setting_value);
        } catch {
          throw new Error('Value must be valid JSON, e.g. {"currency":"PHP"}.');
        }
        payload.updated_by = userId;
      }
      await saveRecord(table, payload);
      await onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save this record.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="operational-dialog-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex justify-between gap-4"><div><h2 id="operational-dialog-title" className="text-xl font-semibold text-slate-950">{record ? 'Edit' : 'Create'} record</h2><p className="mt-1 text-sm text-slate-500">Saved to Supabase.</p></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        {error ? <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {currentFields.map(([name, label, type, required, choices]) => (
            <div key={name} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
              {type === 'checkbox' ? (
                <label className="flex h-10 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(values[name])} onChange={(event) => setValues((old) => ({ ...old, [name]: event.target.checked }))} />{label}</label>
              ) : <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor={`op-${name}`}>{label}{required ? ' *' : ''}</label>}
              {type === 'relation' ? (
                <select id={`op-${name}`} required={required} className={inputClass} value={values[name] ?? ''} onChange={(event) => setValues((old) => ({ ...old, [name]: event.target.value || null }))}><option value="">Select…</option>{optionRows(choices, data).map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>
              ) : type === 'select' ? (
                <select id={`op-${name}`} required={required} className={inputClass} value={values[name] ?? ''} onChange={(event) => setValues((old) => ({ ...old, [name]: event.target.value }))}>{choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
              ) : type === 'textarea' ? (
                <textarea id={`op-${name}`} required={required} rows="3" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-600" value={name === 'setting_value' && typeof values[name] !== 'string' ? JSON.stringify(values[name], null, 2) : values[name] ?? ''} onChange={(event) => setValues((old) => ({ ...old, [name]: event.target.value }))} />
              ) : type !== 'checkbox' ? (
                <input id={`op-${name}`} type={type === 'number' ? 'number' : type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} required={required} disabled={table === 'profiles' && name === 'email'} className={`${inputClass} disabled:bg-slate-100`} value={values[name] ?? ''} onChange={(event) => setValues((old) => ({ ...old, [name]: event.target.value }))} />
              ) : null}
            </div>
          ))}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button></div>
        </form>
      </section>
    </div>
  );
}

function PaymentDialog({ data, onClose, onSaved }) {
  const openInvoices = data.invoices.filter((invoice) => invoice.outstanding_amount > 0 && invoice.status !== 'void');
  const [values, setValues] = useState(() => ({ invoice_id: '', amount: '', payment_method: 'bank_transfer', payment_date: new Date().toISOString().slice(0, 10), reference_number: '' }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await postInvoicePayment(values);
      await onSaved();
      onClose();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Payment could not be posted.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex justify-between"><h2 className="text-xl font-semibold">Post invoice payment</h2><button type="button" aria-label="Close" onClick={onClose}><X className="h-4 w-4" /></button></div>
        {error ? <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <label className="mb-1 block text-xs font-medium">Invoice</label>
        <select required className={`${inputClass} mb-4`} value={values.invoice_id} onChange={(event) => setValues((old) => ({ ...old, invoice_id: event.target.value }))}><option value="">Select invoice…</option>{openInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · balance {php(invoice.outstanding_amount)}</option>)}</select>
        <label className="mb-1 block text-xs font-medium">Amount (PHP)</label><input required min="0.01" step="0.01" type="number" className={`${inputClass} mb-4`} value={values.amount} onChange={(event) => setValues((old) => ({ ...old, amount: event.target.value }))} />
        <label className="mb-1 block text-xs font-medium">Payment method</label><select className={`${inputClass} mb-4`} value={values.payment_method} onChange={(event) => setValues((old) => ({ ...old, payment_method: event.target.value }))}>{[['cash','Cash'],['bank_transfer','Bank transfer'],['gcash','GCash'],['check','Check'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium">Payment date</label><input required type="date" className={inputClass} value={values.payment_date} onChange={(event) => setValues((old) => ({ ...old, payment_date: event.target.value }))} /></div><div><label className="mb-1 block text-xs font-medium">Reference</label><input className={inputClass} value={values.reference_number} onChange={(event) => setValues((old) => ({ ...old, reference_number: event.target.value }))} /></div></div>
        <p className="mt-3 text-xs text-slate-500">Posting is transactional: the payment and invoice balance are updated together.</p>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={busy || !openInvoices.length} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Posting…' : 'Post payment'}</button></div>
      </form>
    </div>
  );
}

function DocumentModule({ data, userId, canManage, onRefresh }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [category, setCategory] = useState('other');
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !supabase) return;
    setError('');
    if (!tenantId) {
      setError('Select the tenant this document belongs to.');
      return;
    }
    const allowed = /\.(pdf|jpe?g|png|webp|docx?)$/i.test(file.name);
    if (!allowed || file.size > 10 * 1024 * 1024) {
      setError('Choose a PDF, image, DOC, or DOCX file no larger than 10 MB.');
      return;
    }
    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${tenantId}/${crypto.randomUUID()}-${safeName}`;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    try {
      const { error: storageError } = await supabase.storage.from('tenant-documents').upload(path, file, { upsert: false, contentType: mimeTypes[extension] });
      if (storageError) throw storageError;
      try {
        const { error: metadataError } = await supabase.from('documents').insert({
          tenant_id: tenantId,
          category,
          original_filename: file.name,
          storage_path: path,
          mime_type: file.type || 'application/octet-stream',
          file_size_bytes: file.size,
          uploaded_by: userId,
        });
        if (metadataError) throw metadataError;
      } catch (metadataError) {
        const { error: cleanupError } = await supabase.storage.from('tenant-documents').remove([path]);
        if (cleanupError) throw new Error(`${metadataError.message}; cleanup failed: ${cleanupError.message}`);
        throw metadataError;
      }
      await onRefresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }
  async function openDocument(documentRow) {
    if (!supabase) return;
    const downloadWindow = window.open('', '_blank');
    if (!downloadWindow) {
      setError('Allow pop-ups to open secure documents.');
      return;
    }
    try {
      const { data: signed, error: signedError } = await supabase.storage.from('tenant-documents').createSignedUrl(documentRow.storage_path, 60);
      if (signedError) throw signedError;
      downloadWindow.opener = null;
      downloadWindow.location.href = signed.signedUrl;
    } catch (signedError) {
      downloadWindow.close();
      setError(signedError instanceof Error ? signedError.message : 'Unable to create a secure document link.');
    }
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <ModuleHeader title="Secure documents" icon={FileText} action={canManage ? <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">{busy ? 'Uploading…' : <><Upload className="h-4 w-4" />Upload document</>}<input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={upload} disabled={busy} /></label> : null} />
      <p className="mb-4 text-sm text-slate-600">Private bucket uploads, database metadata, and 60-second signed download links. Maximum upload size: 10 MB.</p>
      {canManage ? <div className="mb-4 flex flex-wrap gap-3"><select aria-label="Document tenant" value={tenantId} onChange={(event) => setTenantId(event.target.value)} className={`${inputClass} max-w-sm`}><option value="">Select tenant before upload…</option>{data.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenantName(tenant)}</option>)}</select><select aria-label="Document category" value={category} onChange={(event) => setCategory(event.target.value)} className={`${inputClass} max-w-xs`}>{[['lease','Lease agreement'],['business_permit','Business permit'],['identification','Identification'],['registration','Registration'],['amendment','Contract amendment'],['notice','Notice'],['receipt','Payment receipt'],['other','Other']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div> : null}
      {error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2 pr-4">File</th><th className="py-2 pr-4">Category</th><th className="py-2 pr-4">Verification</th><th className="py-2 pr-4">Uploaded</th><th /></tr></thead><tbody>{data.documents.filter((doc) => !doc.is_deleted).map((doc) => <tr key={doc.id} className="border-b border-slate-100"><td className="py-3 pr-4">{doc.original_filename}</td><td className="py-3 pr-4">{doc.category}</td><td className="py-3 pr-4 capitalize">{doc.verification_status}</td><td className="py-3 pr-4">{new Date(doc.uploaded_at).toLocaleDateString('en-PH')}</td><td className="text-right"><button type="button" onClick={() => openDocument(doc)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100"><ExternalLink className="h-3.5 w-3.5" />Open</button></td></tr>)}</tbody></table>{!data.documents.length ? <p className="py-8 text-center text-sm text-slate-500">No documents recorded.</p> : null}</div>
    </section>
  );
}

function ReportsModule({ data }) {
  const [report, setReport] = useState('portfolio');
  const rows = useMemo(() => {
    if (report === 'receivables') return data.invoices.map((invoice) => ({ invoice_number: invoice.invoice_number, tenant: tenantName(data.tenants.find((row) => row.id === invoice.tenant_id)), due_date: invoice.due_date, total_php: invoice.total_amount, outstanding_php: invoice.outstanding_amount, status: invoice.status }));
    if (report === 'collections') return data.payments.map((payment) => ({ payment_date: payment.payment_date, invoice: data.invoices.find((row) => row.id === payment.invoice_id)?.invoice_number, tenant: tenantName(data.tenants.find((row) => row.id === payment.tenant_id)), amount_php: payment.amount, method: payment.payment_method, status: payment.status }));
    return data.units.map((unit) => ({ property: data.properties.find((row) => row.id === unit.property_id)?.name, unit: unit.code, type: unit.unit_type, rentable: unit.is_rentable, base_rent_php: unit.base_rent }));
  }, [data, report]);
  function exportCsv() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <ModuleHeader title="Live reports" icon={ClipboardList} action={<div className="flex gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Printer className="h-4 w-4" />Print</button><button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Download className="h-4 w-4" />CSV</button></div>} />
      <div className="mb-4 flex flex-wrap gap-2">{[['portfolio','Portfolio'],['receivables','Receivables'],['collections','Collections']].map(([key,label]) => <button key={key} type="button" onClick={() => setReport(key)} className={`rounded-lg px-3 py-2 text-sm ${report === key ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>)}</div>
      <p className="mb-4 text-sm text-slate-600">Data is generated from records your account is authorized to read.</p>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500">{rows[0] ? Object.keys(rows[0]).map((key) => <th key={key} className="pb-2 pr-4 font-medium capitalize">{key.replaceAll('_',' ')}</th>) : null}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-100">{Object.values(row).map((value, column) => <td key={column} className="py-3 pr-4">{String(value ?? '—')}</td>)}</tr>)}</tbody></table>{!rows.length ? <p className="py-8 text-center text-sm text-slate-500">No authorized records available for this report.</p> : null}</div>
    </section>
  );
}

function ModuleHeader({ title, icon: Icon, action }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-600" /><h2 className="text-lg font-semibold text-slate-900">{title}</h2></div>{action}</div>;
}

export function OperationalModules({ activeNav, data, loading, error, onRefresh, userId, role }) {
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState('');
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const config = moduleConfig[activeNav];
  if (activeNav === 'Reports') return <ReportsModule data={data} />;
  if (activeNav === 'Documents') return <DocumentModule data={data} userId={userId} canManage={['admin', 'manager'].includes(role)} onRefresh={onRefresh} />;
  if (!config) return null;

  const isAllowed = config.roles.includes(role);
  const moduleRows = data[config.table] ?? [];
  const rows = moduleRows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const canEdit = ['admin', 'manager', 'accounting', 'operations'].includes(role)
    && !['Audit Logs', 'User Management'].includes(activeNav)
    && (activeNav !== 'System Settings' || role === 'admin');
  const canAdd = canEdit && config.canCreate;

  async function generateBills() {
    setGenerating(true);
    setActionError('');
    try {
      const count = await generateMonthlyRentInvoices(period);
      setActionError(`${count} rent invoice${count === 1 ? '' : 's'} generated. Existing invoices were left unchanged.`);
      await onRefresh();
    } catch (generateError) {
      setActionError(generateError instanceof Error ? generateError.message : 'Invoice generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function removeRow(record) {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await deleteRecord(config.table, record.id);
      await onRefresh();
    } catch (removeError) {
      setActionError(removeError instanceof Error ? removeError.message : 'Unable to delete record.');
    }
  }

  if (!isAllowed) {
    return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">This module requires a different role. Contact your administrator if you need access.</div>;
  }

  if (activeNav === 'Electricity & Water') {
    return <UtilityBills data={data} loading={loading} error={error} onRefresh={onRefresh} role={role} />;
  }

  if (activeNav === 'Payments & Collections') {
    return (
      <div className="space-y-4">
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ModuleHeader title={config.title} icon={Bell} action={<button type="button" onClick={() => setDialog({ payment: true })} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Post payment</button>} />
          <p className="mb-4 text-sm text-slate-600">Payment posting checks the invoice balance and updates payment and invoice records in one database transaction.</p>
          {loading ? <p role="status" className="py-4 text-sm text-slate-500">Loading payments…</p> : null}
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500">{config.columns.map((col) => <th key={col} className="pb-2 pr-4 font-medium capitalize">{col.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100">{config.columns.map((col) => <td key={col} className="py-3 pr-4">{displayValue(col, row, data)}</td>)}</tr>)}</tbody></table>{!rows.length && !loading ? <p className="py-8 text-center text-sm text-slate-500">No payments recorded yet.</p> : null}</div>
        </section>
        {dialog?.payment ? <PaymentDialog data={data} onClose={() => setDialog(null)} onSaved={onRefresh} /> : null}
      </div>
    );
  }

  if (activeNav === 'User Management') {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ModuleHeader title={config.title} icon={ShieldCheck} />
        <p className="mb-4 text-sm text-slate-600">Manage existing profiles and roles. Create or invite Auth accounts from Supabase Authentication; this client does not use a privileged service key.</p>
        {error ? <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500">{config.columns.map((col) => <th key={col} className="pb-2 pr-4 font-medium capitalize">{col.replaceAll('_',' ')}</th>)}<th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-3 pr-4">{row.full_name}</td><td className="py-3 pr-4">{row.email}</td><td className="py-3 pr-4 capitalize">{row.role}</td><td className="py-3 pr-4 capitalize">{row.status}</td><td className="py-3 pr-4">{row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-PH') : '—'}</td><td className="text-right"><button type="button" onClick={() => setDialog({ record: row })} className="rounded-md p-1.5 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button></td></tr>)}</tbody></table>{!rows.length && !loading ? <p className="py-8 text-center text-sm text-slate-500">No user profiles visible.</p> : null}</div>
        {dialog ? <EditDialog table="profiles" record={dialog.record} data={data} userId={userId} onClose={() => setDialog(null)} onSaved={onRefresh} /> : null}
      </section>
    );
  }

  if (activeNav === 'System Settings') {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ModuleHeader title={config.title} icon={ShieldCheck} action={canAdd ? <button type="button" onClick={() => setDialog({})} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Add setting</button> : null} />
        <p className="mb-4 text-sm text-slate-600">Configure key-value business settings. Values are JSON. Only administrators may save changes.</p>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="pb-2 pr-4">Key</th><th className="pb-2 pr-4">Description</th><th className="pb-2 pr-4">Value</th><th className="pb-2 pr-4">Updated</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.setting_key} className="border-b border-slate-100"><td className="py-3 pr-4 font-medium">{row.setting_key}</td><td className="py-3 pr-4">{row.description}</td><td className="max-w-sm truncate py-3 pr-4 font-mono text-xs">{JSON.stringify(row.setting_value)}</td><td className="py-3 pr-4">{new Date(row.updated_at).toLocaleDateString('en-PH')}</td><td className="text-right">{role === 'admin' ? <button type="button" onClick={() => setDialog({ record: { ...row, setting_value: JSON.stringify(row.setting_value, null, 2) } })} className="rounded-md p-1.5 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button> : null}</td></tr>)}</tbody></table>{!rows.length && !loading ? <p className="py-8 text-center text-sm text-slate-500">No settings configured.</p> : null}</div>
        {dialog ? <EditDialog table="system_settings" record={dialog.record} data={data} userId={userId} onClose={() => setDialog(null)} onSaved={onRefresh} /> : null}
      </section>
    );
  }

  if (activeNav === 'Audit Logs') {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ModuleHeader title={config.title} icon={ShieldCheck} />
        <p className="mb-4 text-sm text-slate-600">Audit trail records the operation and changed field names without copying field values.</p>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500">{config.columns.map((col) => <th key={col} className="pb-2 pr-4 font-medium capitalize">{col.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100">{config.columns.map((col) => <td key={col} className="max-w-xs truncate py-3 pr-4">{displayValue(col, row, data)}</td>)}</tr>)}</tbody></table>{!rows.length && !loading ? <p className="py-8 text-center text-sm text-slate-500">No audit entries available.</p> : null}</div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <ModuleHeader title={config.title} icon={activeNav === 'Maintenance' ? ClipboardList : FileText} action={<div className="flex flex-wrap items-center justify-end gap-2">{activeNav === 'Billing & Invoices' ? <><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 rounded-lg border border-slate-300 px-2 text-xs" /><button type="button" disabled={generating} onClick={generateBills} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50">{generating ? 'Generating…' : 'Generate rent invoices'}</button></> : null}{canAdd ? <button type="button" onClick={() => setDialog({})} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />Add record</button> : null}</div>} />
      {error ? <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {actionError ? <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{actionError}</p> : null}
      {activeNav === 'Billing & Invoices' ? <p className="mb-4 text-sm text-slate-600">Generate monthly rent invoices for eligible active leases. The operation is safe to repeat for a billing month.</p> : null}
      {activeNav === 'Rental Rates' || activeNav === 'Escalations & Renewals' ? <p className="mb-4 text-sm text-slate-600">{activeNav === 'Rental Rates' ? 'Edit each unit’s base rate. Contract-negotiated rates are stored on the lease.' : 'Schedule and track contractually agreed lease escalations.'}</p> : null}
      <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-slate-400" /></div>
      {loading ? <p role="status" className="mb-3 text-sm text-slate-500">Loading records…</p> : null}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500">{config.columns.map((col) => <th key={col} className="pb-2 pr-4 font-medium capitalize">{col.replaceAll('_',' ')}</th>)}{canEdit ? <th /> : null}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100">{config.columns.map((col) => <td key={col} className="max-w-xs truncate py-3 pr-4 capitalize">{displayValue(col, row, data)}</td>)}{canEdit ? <td className="whitespace-nowrap text-right">{fields[config.table] ? <button type="button" aria-label="Edit record" onClick={() => setDialog({ record: row })} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button> : null}<button type="button" aria-label="Delete record" onClick={() => removeRow(row)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700">×</button></td> : null}</tr>)}</tbody></table>{!rows.length && !loading ? <p className="py-8 text-center text-sm text-slate-500">No records found.</p> : null}</div>
      {dialog ? <EditDialog table={config.table} record={dialog.record} data={data} userId={userId} onClose={() => setDialog(null)} onSaved={onRefresh} /> : null}
    </section>
  );
}
