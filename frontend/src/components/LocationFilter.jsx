export default function LocationFilter({ regions, selected, onChange }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
      <div
        className="flex items-center gap-2 overflow-x-auto whitespace-nowrap max-h-12"
        role="group"
        aria-label="Filtrar por local"
      >
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selected === null
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Todos
        </button>
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => onChange(region.id)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selected === region.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {region.name}
          </button>
        ))}
      </div>
    </div>
  );
}
