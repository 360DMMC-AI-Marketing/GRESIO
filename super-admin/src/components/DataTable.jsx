export default function DataTable({ columns = [], data = [], onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 shadow-sm bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f9fafb] border-b border-surface-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-surface-400"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id ?? rowIdx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-surface-100 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } hover:bg-surface-50 ${
                  rowIdx % 2 === 1 ? 'bg-surface-50/50' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-surface-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
