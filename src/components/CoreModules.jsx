import { useMemo, useState } from 'react';
import { Building2, FileText, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { deleteRecord, saveLeaseWithUnits, saveRecord } from '../lib/coreData';

const fieldClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-700';

const initialValues = {
  properties: {
    code: '', name: '', address: '', property_type: '', description: '', status: 'active',
  },
  units: {
    property_id: '', code: '', building: '', floor: '', section: '', unit_type: 'Retail',
    floor_area_m2: '0', base_rent: '0', rate_calculation_method: 'fixed_monthly',
    is_rentable: true, notes: '',
  },
  tenants: {
    tenant_reference: '', tenant_type: 'business', individual_name: '', business_name: '',
    trade_name: '', representative_name: '', contact_number: '', email: '',
    business_address: '', tin: '', emergency_contact: '', notes: '', status: 'active',
  },
  leases: {
    contract_number: '', tenant_id: '', unit_ids: [], start_date: '', end_date: '',
    status: 'draft', monthly_rental_amount: '0', rate_calculation_method: 'fixed_monthly',
    billing_frequency: 'monthly', due_day: '5', grace_period_days: '0',
    security_deposit_amount: '0', advance_rent_amount: '0', escalation_terms: '',
    utility_billing_arrangement: '', penalty_terms: '', special_provisions: '',
  },
};

const fieldsByKind = {
  properties: [
    ['code', 'Property code', 'text', true],
    ['name', 'Property name', 'text', true],
    ['property_type', 'Property type', 'text', true],
    ['address', 'Address', 'text', true],
    ['status', 'Status', 'select', true, [['active', 'Active'], ['inactive', 'Inactive']]],
    ['description', 'Description', 'textarea'],
  ],
  units: [
    ['property_id', 'Property', 'select', true, 'properties'],
    ['code', 'Unit code', 'text', true],
    ['unit_type', 'Unit type', 'select', true, [['Retail', 'Retail'], ['Office', 'Office'], ['Food & Beverage', 'Food & Beverage'], ['Storage', 'Storage'], ['Parking', 'Parking'], ['Other', 'Other']]],
    ['building', 'Building', 'text'],
    ['floor', 'Floor', 'text'],
    ['section', 'Section', 'text'],
    ['floor_area_m2', 'Floor area (m²)', 'number', true, null, { min: '0', step: '0.01' }],
    ['base_rent', 'Base monthly rent (PHP)', 'number', true, null, { min: '0', step: '0.01' }],
    ['rate_calculation_method', 'Rate method', 'select', true, [['fixed_monthly', 'Fixed monthly'], ['per_sqm', 'Per sqm'], ['custom', 'Custom']]],
    ['is_rentable', 'Rentable unit', 'checkbox'],
    ['notes', 'Notes', 'textarea'],
  ],
  tenants: [
    ['tenant_reference', 'Tenant reference', 'text', true],
    ['tenant_type', 'Tenant type', 'select', true, [['business', 'Business'], ['individual', 'Individual']]],
    ['business_name', 'Registered business name', 'text', false, null, { tenantType: 'business' }],
    ['individual_name', 'Individual name', 'text', false, null, { tenantType: 'individual' }],
    ['trade_name', 'Trade name', 'text'],
    ['representative_name', 'Authorized representative', 'text'],
    ['contact_number', 'Contact number', 'tel'],
    ['email', 'Email', 'email'],
    ['business_address', 'Business address', 'text'],
    ['tin', 'Tax identification number (optional)', 'text'],
    ['emergency_contact', 'Alternate contact', 'text'],
    ['status', 'Status', 'select', true, [['active', 'Active'], ['inactive', 'Inactive'], ['blacklisted', 'Blacklisted'], ['pending_review', 'Pending review']]],
    ['notes', 'Notes', 'textarea'],
  ],
  leases: [
    ['contract_number', 'Contract number', 'text', true],
    ['tenant_id', 'Tenant', 'select', true, 'tenants'],
    ['unit_ids', 'Assigned units', 'multiselect', true, 'units'],
    ['start_date', 'Start date', 'date', true],
    ['end_date', 'End date', 'date', true],
    ['status', 'Status', 'select', true, [['draft', 'Draft'], ['pending_approval', 'Pending approval'], ['active', 'Active'], ['expiring', 'Expiring'], ['expired', 'Expired'], ['terminated', 'Terminated'], ['renewed', 'Renewed']]],
    ['monthly_rental_amount', 'Monthly rent (PHP)', 'number', true, null, { min: '0', step: '0.01' }],
    ['rate_calculation_method', 'Rate method', 'select', true, [['fixed_monthly', 'Fixed monthly'], ['per_sqm', 'Per sqm'], ['custom', 'Custom']]],
    ['billing_frequency', 'Billing frequency', 'select', true, [['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['annual', 'Annual'], ['custom', 'Custom']]],
    ['due_day', 'Due day of month', 'number', true, null, { min: '1', max: '31' }],
    ['grace_period_days', 'Grace period (days)', 'number', true, null, { min: '0' }],
    ['security_deposit_amount', 'Security deposit (PHP)', 'number', true, null, { min: '0', step: '0.01' }],
    ['advance_rent_amount', 'Advance rent (PHP)', 'number', true, null, { min: '0', step: '0.01' }],
    ['escalation_terms', 'Escalation terms', 'text'],
    ['utility_billing_arrangement', 'Utility arrangement', 'text'],
    ['penalty_terms', 'Penalty terms', 'text'],
    ['special_provisions', 'Special provisions', 'textarea'],
  ],
};

function getRowLabel(kind, row) {
  if (kind === 'properties') return row.name;
  if (kind === 'units') return row.code;
  if (kind === 'tenants') return row.business_name || row.individual_name || row.tenant_reference;
  return row.contract_number;
}

function normalizeRecord(kind, row) {
  if (!row) return { ...initialValues[kind] };
  if (kind === 'leases') return { ...row, unit_ids: row.unit_ids ?? [] };
  return { ...row };
}

function RecordDialog({ kind, record, data, onClose, onSaved }) {
  const [values, setValues] = useState(() => normalizeRecord(kind, record));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const title = `${record ? 'Edit' : 'Add'} ${kind === 'properties' ? 'property' : kind === 'units' ? 'unit' : kind === 'tenants' ? 'tenant' : 'lease'}`;
  const fields = fieldsByKind[kind];

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function renderOptions(optionSource) {
    if (optionSource === 'properties') return data.properties.map((item) => [item.id, `${item.code} · ${item.name}`]);
    if (optionSource === 'tenants') return data.tenants.map((item) => [item.id, `${item.tenant_reference} · ${getRowLabel('tenants', item)}`]);
    if (optionSource === 'units') return data.units.map((item) => [item.id, `${item.code} · ${data.properties.find((property) => property.id === item.property_id)?.name ?? 'Property'}`]);
    return optionSource;
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (kind === 'leases') {
        const { unit_ids, ...lease } = values;
        lease.monthly_rental_amount = Number(lease.monthly_rental_amount);
        lease.due_day = Number(lease.due_day);
        lease.grace_period_days = Number(lease.grace_period_days);
        lease.security_deposit_amount = Number(lease.security_deposit_amount);
        lease.advance_rent_amount = Number(lease.advance_rent_amount);
        lease.created_by = undefined;
        await saveLeaseWithUnits(lease, unit_ids);
      } else {
        const payload = { ...values };
        if (kind === 'units') {
          payload.floor_area_m2 = Number(payload.floor_area_m2);
          payload.base_rent = Number(payload.base_rent);
        }
        if (kind === 'tenants') {
          if (payload.tenant_type === 'business') payload.individual_name = null;
          if (payload.tenant_type === 'individual') payload.business_name = null;
          payload.created_by = undefined;
        }
        await saveRecord(kind, payload);
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord() {
    if (!record) return;
    setSaving(true);
    setError('');
    try {
      await deleteRecord(kind, record.id);
      await onSaved();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this record.');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="record-dialog-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="record-dialog-title" className="text-xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">Changes are saved directly to the Supabase database.</p>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        {error ? <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
        {confirmDelete ? (
          <div role="alertdialog" aria-modal="true" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-900">Delete {getRowLabel(kind, record)}?</p>
            <p className="mt-1 text-xs text-red-800">This action cannot be undone. Related records may prevent deletion.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={saving} onClick={removeRecord} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Deleting…' : 'Confirm delete'}</button>
              <button type="button" disabled={saving} onClick={() => setConfirmDelete(false)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-900">Cancel</button>
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, type, required, options, attributes]) => {
            if (attributes?.tenantType && values.tenant_type !== attributes.tenantType) return null;
            const fullWidth = type === 'textarea' || type === 'multiselect';
            return (
              <div key={name} className={fullWidth ? 'sm:col-span-2' : ''}>
                {type === 'checkbox' ? (
                  <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(values[name])} onChange={(event) => updateField(name, event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
                    {label}
                  </label>
                ) : (
                  <label className={labelClass} htmlFor={`field-${name}`}>{label}{required ? <span className="text-red-600"> *</span> : null}</label>
                )}
                {type === 'select' ? (
                  <select id={`field-${name}`} required={required} className={fieldClass} value={values[name] ?? ''} onChange={(event) => updateField(name, event.target.value)}>
                    <option value="" disabled>Select…</option>
                    {renderOptions(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                  </select>
                ) : type === 'multiselect' ? (
                  <select id={`field-${name}`} multiple required={required} className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200" value={values[name]} onChange={(event) => updateField(name, [...event.target.selectedOptions].map((option) => option.value))}>
                    {renderOptions(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                  </select>
                ) : type === 'textarea' ? (
                  <textarea id={`field-${name}`} required={required} rows="3" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200" value={values[name] ?? ''} onChange={(event) => updateField(name, event.target.value)} />
                ) : type !== 'checkbox' ? (
                  <input id={`field-${name}`} type={type} required={required} className={fieldClass} value={values[name] ?? ''} onChange={(event) => updateField(name, event.target.value)} {...(attributes && !attributes.tenantType ? attributes : {})} />
                ) : null}
              </div>
            );
          })}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
            <div>
              {record ? <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button> : null}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save record'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export function CoreModules({ activeNav, data, loading, error, search, setSearch, onRefresh, canManage, today }) {
  const [dialog, setDialog] = useState(null);
  const propertiesById = useMemo(() => Object.fromEntries(data.properties.map((item) => [item.id, item])), [data.properties]);
  const tenantsById = useMemo(() => Object.fromEntries(data.tenants.map((item) => [item.id, item])), [data.tenants]);
  const leaseUnitsByLeaseId = useMemo(() => {
    const result = {};
    data.lease_units.forEach(({ lease_id, unit_id }) => {
      result[lease_id] = [...(result[lease_id] ?? []), unit_id];
    });
    return result;
  }, [data.lease_units]);

  const leaseStatusByUnit = new Map();
  data.leases.forEach((lease) => {
    const assignmentStatus = lease.status === 'pending_approval' ? 'Reserved' : 'Occupied';
    if (!['pending_approval', 'active', 'expiring'].includes(lease.status)) return;
    if (lease.start_date > today || lease.end_date < today) return;
    (leaseUnitsByLeaseId[lease.id] ?? []).forEach((unitId) => leaseStatusByUnit.set(unitId, assignmentStatus));
  });

  const filterRows = (rows, fields) => {
    const normalizedSearch = search.trim().toLowerCase();
    return normalizedSearch ? rows.filter((row) => fields.some((field) => String(field(row) ?? '').toLowerCase().includes(normalizedSearch))) : rows;
  };
  const filteredProperties = filterRows(data.properties, [(row) => row.name, (row) => row.code, (row) => row.address]);
  const filteredUnits = filterRows(data.units, [(row) => row.code, (row) => row.unit_type, (row) => propertiesById[row.property_id]?.name]);
  const filteredTenants = filterRows(data.tenants, [(row) => row.tenant_reference, (row) => row.business_name, (row) => row.individual_name, (row) => row.trade_name, (row) => row.representative_name, (row) => row.email]);
  const filteredLeases = filterRows(data.leases, [(row) => row.contract_number, (row) => tenantsById[row.tenant_id]?.business_name, (row) => tenantsById[row.tenant_id]?.individual_name, (row) => row.status]);

  const searchBox = (placeholder) => (
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400" />
    </div>
  );
  const addButton = (kind, label) => canManage ? (
    <button type="button" onClick={() => setDialog({ kind })} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"><Plus className="h-4 w-4" />{label}</button>
  ) : null;
  const editAction = (kind, record) => canManage ? (
    <button type="button" title="Edit record" onClick={() => setDialog({ kind, record })} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>
  ) : null;
  const moduleError = error ? <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null;
  const loadingNotice = loading ? <div role="status" className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">Loading records from Supabase…</div> : null;
  const emptyState = (message) => !loading && <tr><td colSpan="8" className="py-8 text-center text-sm text-slate-500">{message}</td></tr>;

  let content;
  if (activeNav === 'Properties & Units') {
    content = (
      <div className="space-y-6">
        {moduleError}{loadingNotice}
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard title="Properties" value={data.properties.length} detail="Property records" />
          <SummaryCard title="Units" value={data.units.length} detail={`${data.units.filter((unit) => unit.is_rentable).length} rentable`}/>
          <SummaryCard title="Occupancy rule" value="Lease-derived" detail="Based on approved lease dates; non-rentable units excluded." />
        </div>
        <DataTable title="Properties" icon={Building2} action={addButton('properties', 'Add property')}>
          {searchBox('Search properties')}
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="pb-3 pr-4 font-medium">Code</th><th className="pb-3 pr-4 font-medium">Property</th><th className="pb-3 pr-4 font-medium">Type</th><th className="pb-3 pr-4 font-medium">Address</th><th className="pb-3 pr-4 font-medium">Status</th><th /></tr></thead>
            <tbody>{filteredProperties.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-medium">{row.code}</td><td className="py-3 pr-4">{row.name}</td><td className="py-3 pr-4">{row.property_type}</td><td className="py-3 pr-4 text-slate-600">{row.address}</td><td className="py-3 pr-4 capitalize">{row.status}</td><td className="text-right">{editAction('properties', row)}</td></tr>)}{emptyState('No properties found.')}</tbody>
          </table>
        </DataTable>
        <DataTable title="Units" icon={Building2} action={addButton('units', 'Add unit')}>
          {searchBox('Search unit, property, or unit type')}
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="pb-3 pr-4 font-medium">Unit</th><th className="pb-3 pr-4 font-medium">Property</th><th className="pb-3 pr-4 font-medium">Type</th><th className="pb-3 pr-4 font-medium">Area</th><th className="pb-3 pr-4 font-medium">Base rent</th><th className="pb-3 pr-4 font-medium">Availability</th><th className="pb-3 pr-4 font-medium">Rentable</th><th /></tr></thead>
            <tbody>{filteredUnits.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-medium">{row.code}</td><td className="py-3 pr-4">{propertiesById[row.property_id]?.name ?? '—'}</td><td className="py-3 pr-4">{row.unit_type}</td><td className="py-3 pr-4">{row.floor_area_m2} m²</td><td className="py-3 pr-4">{formatCurrency(row.base_rent)}</td><td className="py-3 pr-4">{leaseStatusByUnit.get(row.id) ?? (row.is_rentable ? 'Vacant' : 'Not rentable')}</td><td className="py-3 pr-4">{row.is_rentable ? 'Yes' : 'No'}</td><td className="text-right">{editAction('units', row)}</td></tr>)}{emptyState('No units found.')}</tbody>
          </table>
        </DataTable>
      </div>
    );
  } else if (activeNav === 'Tenants') {
    content = (
      <DataTable title="Tenant registry" icon={Users} action={addButton('tenants', 'Add tenant')}>
        {moduleError}{loadingNotice}{searchBox('Search by tenant, business, reference, or contact')}
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-slate-500"><th className="pb-3 pr-4 font-medium">Reference</th><th className="pb-3 pr-4 font-medium">Tenant</th><th className="pb-3 pr-4 font-medium">Representative</th><th className="pb-3 pr-4 font-medium">Contact</th><th className="pb-3 pr-4 font-medium">Status</th><th /></tr></thead>
          <tbody>{filteredTenants.map((row) => <tr key={row.id} className="border-b border-slate-100 align-top"><td className="py-3 pr-4 font-medium">{row.tenant_reference}</td><td className="py-3 pr-4"><div className="font-medium">{row.business_name || row.individual_name}</div><div className="text-xs text-slate-500">{row.trade_name || row.tenant_type}</div></td><td className="py-3 pr-4">{row.representative_name || '—'}</td><td className="py-3 pr-4 text-slate-600">{row.email || '—'}<br />{row.contact_number || '—'}</td><td className="py-3 pr-4 capitalize">{row.status.replace('_', ' ')}</td><td className="text-right">{editAction('tenants', row)}</td></tr>)}{emptyState('No tenants found.')}</tbody>
        </table>
      </DataTable>
    );
  } else {
    content = (
      <DataTable title="Lease register" icon={FileText} action={addButton('leases', 'New lease')}>
        {moduleError}{loadingNotice}{searchBox('Search contract, tenant, or status')}
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-slate-500"><th className="pb-3 pr-4 font-medium">Contract</th><th className="pb-3 pr-4 font-medium">Tenant</th><th className="pb-3 pr-4 font-medium">Units</th><th className="pb-3 pr-4 font-medium">Term</th><th className="pb-3 pr-4 font-medium">Monthly rent</th><th className="pb-3 pr-4 font-medium">Status</th><th /></tr></thead>
          <tbody>{filteredLeases.map((row) => <tr key={row.id} className="border-b border-slate-100 align-top"><td className="py-3 pr-4 font-medium">{row.contract_number}</td><td className="py-3 pr-4">{getRowLabel('tenants', tenantsById[row.tenant_id] ?? {})}</td><td className="py-3 pr-4">{(leaseUnitsByLeaseId[row.id] ?? []).map((unitId) => data.units.find((unit) => unit.id === unitId)?.code).filter(Boolean).join(', ') || '—'}</td><td className="py-3 pr-4 text-slate-600">{row.start_date} → {row.end_date}</td><td className="py-3 pr-4">{formatCurrency(row.monthly_rental_amount)}</td><td className="py-3 pr-4 capitalize">{row.status.replace('_', ' ')}</td><td className="text-right">{editAction('leases', { ...row, unit_ids: leaseUnitsByLeaseId[row.id] ?? [] })}</td></tr>)}{emptyState('No leases found.')}</tbody>
        </table>
      </DataTable>
    );
  }

  return (
    <>
      {content}
      {dialog ? <RecordDialog kind={dialog.kind} record={dialog.record} data={data} onClose={() => setDialog(null)} onSaved={onRefresh} /> : null}
    </>
  );
}

function SummaryCard({ title, value, detail }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">{title}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div>;
}

function DataTable({ title, icon: Icon, action, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-600" /><h2 className="text-lg font-semibold text-slate-900">{title}</h2></div>{action}</div><div className="overflow-x-auto">{children}</div></section>;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(Number(value || 0));
}
