export default function LocationFilter({ regions, selected, onChange }) {
  return (
    <div className="bg-white/50 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-2">
      <div
        className="flex items-center gap-2 overflow-x-auto whitespace-nowrap max-h-12"
        role="group"
        aria-label="Filtrar por local"
      >
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-all ${
            selected === null
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white/60 text-gray-600 hover:bg-white/80"
          }`}
        >
          Todos
        </button>
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => onChange(region.id)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-all ${
              selected === region.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white/60 text-gray-600 hover:bg-white/80"
            }`}
          >
            {region.name}
          </button>
        ))}
      </div>
    </div>
  );
}
