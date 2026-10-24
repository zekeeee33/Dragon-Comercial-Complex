import { useMemo, useState } from 'react';
import { FileText, Pencil, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import { deleteRecord, saveRecord } from '../lib/coreData';

const inputClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200';
const sectionClass = 'rounded-xl border border-slate-200 p-4';
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });
const roundCurrency = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

function monthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}

function initialBill(record, data) {
  const now = new Date();
  const month = record?.billing_period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const bounds = monthBounds(month);
  const due = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  const defaultDueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  return {
    bill_number: record?.bill_number ?? '',
    tenant_id: record?.tenant_id ?? '',
    unit_id: record?.unit_id ?? '',
    lease_id: record?.lease_id ?? '',
    stall_number: record?.stall_number ?? '',
    period_start: record?.period_start ?? bounds.start,
    period_end: record?.period_end ?? bounds.end,
    due_date: record?.due_date ?? defaultDueDate,
    electricity_present_reading: record?.electricity_present_reading ?? '',
    electricity_previous_reading: record?.electricity_previous_reading ?? '',
    electricity_multiplier: record?.electricity_multiplier ?? '1',
    electricity_rate_per_unit: record?.electricity_rate_per_unit ?? '',
    electricity_vat_rate: record?.electricity_vat_rate ?? '12',
    water_present_reading: record?.water_present_reading ?? '',
    water_previous_reading: record?.water_previous_reading ?? '',
    water_multiplier: record?.water_multiplier ?? '1',
    water_rate_per_unit: record?.water_rate_per_unit ?? '',
    water_vat_rate: record?.water_vat_rate ?? '12',
    late_fee_rate: record?.late_fee_rate ?? '5',
    status: record?.status ?? 'billed',
    prepared_by: record?.prepared_by ?? data.profile?.full_name ?? data.profile?.email ?? '',
    received_by: record?.received_by ?? '',
    date_received: record?.date_received ?? '',
  };
}

function calcUtility(present, previous, multiplier, rate, vatRate) {
  const usage = Math.max(0, Number(present || 0) - Number(previous || 0));
  const subtotal = Math.round(usage * Number(multiplier || 0) * Number(rate || 0) * 100) / 100;
  const vat = roundCurrency(subtotal * Number(vatRate || 0) / 100);
  return { usage, subtotal, vat, total: subtotal + vat };
}

function tenantLabel(tenant) {
  return tenant?.individual_name || tenant?.representative_name || tenant?.business_name || '—';
}

function tenantTradeName(tenant) {
  return tenant?.trade_name || (tenant?.tenant_type === 'business' ? tenant.business_name : '') || '—';
}

function UtilityBillDialog({ record, data, onClose, onSaved }) {
  const [values, setValues] = useState(() => initialBill(record, data));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const eligibleLeases = useMemo(() => {
    const assignedIds = new Set(data.lease_units.filter((assignment) => assignment.unit_id === values.unit_id).map((assignment) => assignment.lease_id));
    return data.leases.filter((lease) => assignedIds.has(lease.id));
  }, [data.lease_units, data.leases, values.unit_id]);

  const electric = calcUtility(
    values.electricity_present_reading,
    values.electricity_previous_reading,
    values.electricity_multiplier,
    values.electricity_rate_per_unit,
    values.electricity_vat_rate,
  );
  const water = calcUtility(
    values.water_present_reading,
    values.water_previous_reading,
    values.water_multiplier,
    values.water_rate_per_unit,
    values.water_vat_rate,
  );
  const dueTotal = roundCurrency(electric.total + water.total);
  const lateRate = Number(values.late_fee_rate || 0);
  const lateTotal = roundCurrency(electric.total * (1 + lateRate / 100)) + roundCurrency(water.total * (1 + lateRate / 100));

  function update(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const requiredNumbers = [
        'electricity_present_reading', 'electricity_previous_reading',
        'electricity_multiplier', 'electricity_rate_per_unit', 'electricity_vat_rate',
        'water_present_reading', 'water_previous_reading',
        'water_multiplier', 'water_rate_per_unit', 'water_vat_rate', 'late_fee_rate',
      ];
      for (const field of requiredNumbers) {
        if (values[field] === '' || !Number.isFinite(Number(values[field]))) {
          throw new Error('Enter a valid value for every meter reading, multiplier, rate, and tax field.');
        }
      }
      if (Number(values.electricity_present_reading) < Number(values.electricity_previous_reading)
        || Number(values.water_present_reading) < Number(values.water_previous_reading)) {
        throw new Error('Present meter readings cannot be lower than previous readings.');
      }
      if (!values.period_start || !values.period_end || values.period_end < values.period_start) {
        throw new Error('Enter a valid covered period.');
      }
      if (!values.bill_number.trim()) throw new Error('Enter the statement bill number.');
      if (!values.tenant_id || !values.unit_id) throw new Error('Select the tenant and stall for this statement.');

      const payload = {
        bill_number: values.bill_number.trim(),
        tenant_id: values.tenant_id,
        unit_id: values.unit_id,
        lease_id: values.lease_id || null,
        stall_number: values.stall_number.trim(),
        billing_period: values.period_start.slice(0, 7),
        period_start: values.period_start,
        period_end: values.period_end,
        due_date: values.due_date || null,
        electricity_present_reading: Number(values.electricity_present_reading),
        electricity_previous_reading: Number(values.electricity_previous_reading),
        electricity_multiplier: Number(values.electricity_multiplier),
        electricity_rate_per_unit: Number(values.electricity_rate_per_unit),
        electricity_vat_rate: Number(values.electricity_vat_rate),
        electricity_amount: electric.subtotal,
        electricity_vat_amount: electric.vat,
        water_present_reading: Number(values.water_present_reading),
        water_previous_reading: Number(values.water_previous_reading),
        water_multiplier: Number(values.water_multiplier),
        water_rate_per_unit: Number(values.water_rate_per_unit),
        water_vat_rate: Number(values.water_vat_rate),
        water_amount: water.subtotal,
        water_vat_amount: water.vat,
        late_fee_rate: Number(values.late_fee_rate),
        status: values.status,
        prepared_by: values.prepared_by.trim() || null,
        received_by: values.received_by.trim() || null,
        date_received: values.date_received || null,
      };
      if (record) payload.id = record.id;
      await saveRecord('utility_bills', payload);
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this utility statement.');
    } finally {
      setBusy(false);
    }
  }

  const numberField = (name, label, step = '0.01') => (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <input
        required
        type="number"
        min="0"
        max={name.endsWith('_vat_rate') || name === 'late_fee_rate' ? '100' : undefined}
        step={step}
        value={values[name]}
        onChange={(event) => update(name, event.target.value)}
        className={`${inputClass} mt-1`}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="utility-bill-dialog-title" className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="utility-bill-dialog-title" className="text-xl font-semibold">{record ? 'Edit utility statement' : 'Create utility statement'}</h2>
            <p className="mt-1 text-sm text-slate-500">Electricity and water are calculated from the readings. VAT defaults to 12%; late surcharge defaults to 5%.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        {error ? <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <form onSubmit={submit} className="space-y-4">
          <div className={`${sectionClass} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
            <label className="block text-xs font-medium text-slate-700">Bill number<input required value={values.bill_number} onChange={(event) => update('bill_number', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="block text-xs font-medium text-slate-700">Tenant<select required value={values.tenant_id} onChange={(event) => update('tenant_id', event.target.value)} className={`${inputClass} mt-1`}><option value="">Select tenant…</option>{data.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenantLabel(tenant)}{tenant.trade_name ? ` · ${tenant.trade_name}` : ''}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-700">Stall / unit<select required value={values.unit_id} onChange={(event) => { update('unit_id', event.target.value); update('lease_id', ''); const unit = data.units.find((item) => item.id === event.target.value); update('stall_number', unit?.code ?? ''); }} className={`${inputClass} mt-1`}><option value="">Select stall…</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {data.properties.find((property) => property.id === unit.property_id)?.name ?? ''}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-700">Lease (optional)<select value={values.lease_id} onChange={(event) => { const leaseId = event.target.value; update('lease_id', leaseId); const lease = data.leases.find((item) => item.id === leaseId); if (lease) update('tenant_id', lease.tenant_id); }} className={`${inputClass} mt-1`}><option value="">No linked lease</option>{eligibleLeases.map((lease) => <option key={lease.id} value={lease.id}>{lease.contract_number}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-700">Stall number<input required value={values.stall_number} onChange={(event) => update('stall_number', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="block text-xs font-medium text-slate-700">Period from<input required type="date" value={values.period_start} onChange={(event) => update('period_start', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="block text-xs font-medium text-slate-700">Period to<input required type="date" value={values.period_end} onChange={(event) => update('period_end', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="block text-xs font-medium text-slate-700">Due date<input required type="date" value={values.due_date} onChange={(event) => update('due_date', event.target.value)} className={`${inputClass} mt-1`} /></label>
          </div>

          {[
            { title: 'Electric bill', key: 'electricity', unit: 'kWh', rate: 'Rate per kWh', result: electric },
            { title: 'Water bill', key: 'water', unit: 'm³', rate: 'Rate per m³', result: water },
          ].map(({ title, key, unit, rate, result }) => (
            <div key={key} className={sectionClass}>
              <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {numberField(`${key}_present_reading`, `Present reading (${unit})`, '0.001')}
                {numberField(`${key}_previous_reading`, `Previous reading (${unit})`, '0.001')}
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Usage <strong className="mt-1 block text-base text-slate-900">{result.usage.toFixed(2)} {unit}</strong></div>
                {numberField(`${key}_multiplier`, 'Multiplier', '0.0001')}
                {numberField(`${key}_rate_per_unit`, rate, '0.0001')}
                {numberField(`${key}_vat_rate`, 'VAT (%)')}
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Amount before VAT<strong className="mt-1 block text-base text-slate-900">{money.format(result.subtotal)}</strong></div>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">VAT amount<strong className="mt-1 block text-base text-slate-900">{money.format(result.vat)}</strong></div>
              </div>
            </div>
          ))}

          <div className={`${sectionClass} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
            {numberField('late_fee_rate', 'Surcharge after due date (%)')}
            <label className="block text-xs font-medium text-slate-700">Status<select value={values.status} onChange={(event) => update('status', event.target.value)} className={`${inputClass} mt-1`}>{[['draft','Draft'],['billed','Billed'],['partial','Partial'],['paid','Paid'],['overdue','Overdue']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-700">Prepared by<input value={values.prepared_by} onChange={(event) => update('prepared_by', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="block text-xs font-medium text-slate-700">Received by<input value={values.received_by} onChange={(event) => update('received_by', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="block text-xs font-medium text-slate-700">Date received<input type="date" value={values.date_received} onChange={(event) => update('date_received', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-300">Total amount due<strong className="mt-1 block text-lg text-white">{money.format(dueTotal)}</strong></div>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Amount after due date<strong className="mt-1 block text-lg">{money.format(lateTotal)}</strong></div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            <button disabled={busy} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save statement'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function UtilityStatement({ bill, data, onClose }) {
  const tenant = data.tenants.find((item) => item.id === bill.tenant_id);
  const unit = data.units.find((item) => item.id === bill.unit_id);
  const electricityUsage = Number(bill.electricity_present_reading ?? 0) - Number(bill.electricity_previous_reading ?? 0);
  const waterUsage = Number(bill.water_present_reading ?? 0) - Number(bill.water_previous_reading ?? 0);
  const summaryRows = [
    { title: 'Electric bill', readingUnit: 'kWh', usage: electricityUsage, prefix: 'electricity' },
    { title: 'Water bill', readingUnit: 'm³', usage: waterUsage, prefix: 'water' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
      <section className="utility-print-root w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="no-print mb-5 flex justify-end gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Printer className="h-4 w-4" />Print statement</button>
          <button type="button" onClick={onClose} aria-label="Close statement" className="rounded-lg border border-slate-300 p-2"><X className="h-4 w-4" /></button>
        </div>
        <header className="border-b-2 border-slate-900 pb-4">
          <h2 className="text-xl font-bold uppercase">Dragon Commercial Complex</h2>
          <p className="text-sm">National Highway, Tacurong City</p>
          <p className="mt-2 text-sm">Operated by:</p>
          <p className="font-bold uppercase">Dynatos Ventures Company, Inc.</p>
          <h1 className="mt-5 text-center text-lg font-bold">Statement of Account</h1>
        </header>
        <div className="my-4 grid grid-cols-2 gap-px border border-slate-900 bg-slate-900 text-sm sm:grid-cols-4">
          <div className="bg-white p-2"><span className="block text-xs font-semibold">NAME</span>{tenantLabel(tenant)}</div>
          <div className="bg-white p-2"><span className="block text-xs font-semibold">TRADE NAME</span>{tenantTradeName(tenant)}</div>
          <div className="bg-white p-2"><span className="block text-xs font-semibold">STALL NO</span>{bill.stall_number || unit?.code || '—'}</div>
          <div className="bg-white p-2"><span className="block text-xs font-semibold">BILL NO.</span>{bill.bill_number || '—'}</div>
        </div>
        {summaryRows.map(({ title, readingUnit, usage, prefix }) => (
          <section key={prefix} className="mb-5">
            <div className="flex items-center justify-between bg-slate-900 px-3 py-2 font-bold text-white">
              <span>{title}</span><span>Due date: {formatDate(bill.due_date)}</span>
            </div>
            <table className="w-full border-collapse text-center text-xs sm:text-sm">
              <thead>
                <tr>
                  <th colSpan="2" className="border border-slate-500 p-2">Period covered</th>
                  <th colSpan="2" className="border border-slate-500 p-2">Billing period reading</th>
                  <th rowSpan="2" className="border border-slate-500 p-2">Usage<br />{readingUnit}</th>
                </tr>
                <tr>
                  <th className="border border-slate-500 p-2">From</th><th className="border border-slate-500 p-2">To</th>
                  <th className="border border-slate-500 p-2">Present</th><th className="border border-slate-500 p-2">Previous</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-500 p-2">{formatDate(bill.period_start)}</td>
                  <td className="border border-slate-500 p-2">{formatDate(bill.period_end)}</td>
                  <td className="border border-slate-500 p-2">{bill[`${prefix}_present_reading`] ?? '—'}</td>
                  <td className="border border-slate-500 p-2">{bill[`${prefix}_previous_reading`] ?? '—'}</td>
                  <td className="border border-slate-500 p-2">{usage.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <table className="w-full border-collapse text-center text-xs sm:text-sm">
              <thead><tr>{['Usage', 'Multiplier', prefix === 'electricity' ? 'Rate per kWh' : 'Rate per m³', 'Total', 'VAT', 'Total amount due'].map((heading) => <th key={heading} className="border border-slate-500 p-2">{heading}</th>)}</tr></thead>
              <tbody><tr>
                <td className="border border-slate-500 p-2">{usage.toFixed(2)}</td>
                <td className="border border-slate-500 p-2">{bill[`${prefix}_multiplier`] ?? '—'}</td>
                <td className="border border-slate-500 p-2">{bill[`${prefix}_rate_per_unit`] ?? '—'}</td>
                <td className="border border-slate-500 p-2">{money.format(bill[`${prefix}_amount`] ?? 0)}</td>
                <td className="border border-slate-500 p-2">{money.format(bill[`${prefix}_vat_amount`] ?? 0)}</td>
                <td className="border border-slate-500 bg-slate-100 p-2 font-bold">{money.format(Number(bill[`${prefix}_amount`] ?? 0) + Number(bill[`${prefix}_vat_amount`] ?? 0))}</td>
              </tr></tbody>
            </table>
            <p className="mt-2 text-right text-sm font-semibold">Amount after due date: {money.format(bill[`${prefix}_amount_after_due_date`] ?? roundCurrency((Number(bill[`${prefix}_amount`] ?? 0) + Number(bill[`${prefix}_vat_amount`] ?? 0)) * (1 + Number(bill.late_fee_rate ?? 0) / 100)))}</p>
          </section>
        ))}
        <div className="ml-auto max-w-md space-y-2 border-t-2 border-slate-900 pt-3 text-right text-sm">
          <p className="font-bold">Total amount due before due date (electric and water): {money.format(bill.total_due ?? bill.total_amount ?? 0)}</p>
          <p className="font-bold">Amount after due date (electric and water): {money.format(bill.amount_after_due_date ?? roundCurrency(Number(bill.electricity_amount_after_due_date ?? 0) + Number(bill.water_amount_after_due_date ?? 0)))}</p>
        </div>
        <footer className="mt-10 grid grid-cols-3 gap-4 text-center text-xs">
          <div className="border-t border-slate-700 pt-2">Prepared by: {bill.prepared_by || '________________'}</div>
          <div className="border-t border-slate-700 pt-2">Received by: {bill.received_by || '________________'}</div>
          <div className="border-t border-slate-700 pt-2">Date received: {bill.date_received || '________________'}</div>
        </footer>
      </section>
    </div>
  );
}

export function UtilityBills({ data, loading, error, onRefresh, role }) {
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [statement, setStatement] = useState(null);
  const [actionError, setActionError] = useState('');
  const canManage = ['admin', 'manager', 'accounting', 'operations'].includes(role);
  const rows = data.utility_bills.filter((bill) => JSON.stringify(bill).toLowerCase().includes(search.toLowerCase()));

  async function removeBill(bill) {
    if (!window.confirm(`Delete utility bill ${bill.bill_number || ''}? This cannot be undone.`)) return;
    setActionError('');
    try {
      await deleteRecord('utility_bills', bill.id);
      await onRefresh();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this bill.');
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Electricity &amp; water statements</h2><p className="mt-1 text-sm text-slate-600">Meter-based statements with VAT, late surcharge, combined totals, and print-ready layout.</p></div>
        {canManage ? <button type="button" onClick={() => setDialog({})} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Create statement</button> : null}
      </div>
      {error ? <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {actionError ? <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{actionError}</p> : null}
      <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search utility bills" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bill number, tenant, stall, or period" className={`${inputClass} pl-9`} /></div>
      {loading ? <p role="status" className="mb-3 text-sm text-slate-500">Loading utility bills…</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b text-slate-500">{['Bill no.', 'Tenant', 'Stall', 'Period', 'Due date', 'Total due', 'After due date', 'Status'].map((heading) => <th key={heading} className="pb-2 pr-4 font-medium">{heading}</th>)}<th /></tr></thead>
          <tbody>{rows.map((bill) => {
            const tenant = data.tenants.find((item) => item.id === bill.tenant_id);
            const unit = data.units.find((item) => item.id === bill.unit_id);
            return (
              <tr key={bill.id} className="border-b border-slate-100">
                <td className="py-3 pr-4 font-medium">{bill.bill_number || '—'}</td>
                <td className="py-3 pr-4">{tenantLabel(tenant)}</td>
                <td className="py-3 pr-4">{bill.stall_number || unit?.code || '—'}</td>
                <td className="py-3 pr-4">{bill.period_start && bill.period_end ? `${formatDate(bill.period_start)} – ${formatDate(bill.period_end)}` : bill.billing_period}</td>
                <td className="py-3 pr-4">{formatDate(bill.due_date)}</td>
                <td className="py-3 pr-4">{money.format(bill.total_due ?? bill.total_amount ?? 0)}</td>
                <td className="py-3 pr-4">{money.format(bill.amount_after_due_date ?? bill.total_due ?? bill.total_amount ?? 0)}</td>
                <td className="py-3 pr-4 capitalize">{bill.status.replaceAll('_', ' ')}</td>
                <td className="whitespace-nowrap text-right">
                  <button type="button" aria-label="View and print statement" onClick={() => setStatement(bill)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><FileText className="h-4 w-4" /></button>
                  {canManage ? <><button type="button" aria-label="Edit utility bill" onClick={() => setDialog({ record: bill })} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button type="button" aria-label="Delete utility bill" onClick={() => removeBill(bill)} className="rounded-md p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></> : null}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
        {!rows.length && !loading ? <p className="py-8 text-center text-sm text-slate-500">No utility statements recorded yet.</p> : null}
      </div>
      {dialog ? <UtilityBillDialog record={dialog.record} data={data} onClose={() => setDialog(null)} onSaved={onRefresh} /> : null}
      {statement ? <UtilityStatement bill={statement} data={data} onClose={() => setStatement(null)} /> : null}
    </section>
  );
}
