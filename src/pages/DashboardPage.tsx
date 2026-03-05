// ---------------------------------------------------------------------------
// DashboardPage -- placeholder dashboard
// ---------------------------------------------------------------------------

const stats = [
  { label: 'Total Artworks', value: '\u2014' },
  { label: 'Available', value: '\u2014' },
  { label: 'On Consignment', value: '\u2014' },
  { label: 'Sold', value: '\u2014' },
];

export function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-900">
          Welcome to NOA Inventory
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Your artwork management dashboard
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-primary-100 bg-white p-6"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-primary-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
