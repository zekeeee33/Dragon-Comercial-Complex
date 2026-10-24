import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export function DashboardChart({ type, data, canReadFinancials }) {
  if (type === 'occupancy') {
    return (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={52} outerRadius={86} paddingAngle={4}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={['#0f172a', '#22c55e', '#f59e0b'][index]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} units`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
          {data.map((entry, index) => (
            <div key={entry.name} className="rounded-xl bg-slate-100 p-2">
              <span className="mb-1 block h-2 w-2 rounded-full bg-slate-900" style={{ backgroundColor: ['#0f172a', '#22c55e', '#f59e0b'][index] }}></span>
              {entry.name}
              <div className="mt-1 font-semibold text-slate-900">{entry.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!canReadFinancials) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">
        Your role cannot access financial charts.
      </div>
    );
  }

  if (type === 'aging') {
    return (
      <div className="h-72">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₱${Math.round(value / 1000)}k`} />
              <Tooltip formatter={(value) => currency.format(value)} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">
            Receivables aging requires live invoice balances.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-72">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₱${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value) => currency.format(value)} />
            <Area type="monotone" dataKey="billing" stroke="#0f172a" fill="#cbd5e1" strokeWidth={2} />
            <Area type="monotone" dataKey="collections" stroke="#16a34a" fill="#bbf7d0" strokeWidth={2} />
            <Area type="monotone" dataKey="receivables" stroke="#d97706" fill="#fde68a" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">
          Financial chart data will appear when billing and payment workflows are connected.
        </div>
      )}
    </div>
  );
}
