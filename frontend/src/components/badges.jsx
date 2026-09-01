const STATUS_COLORS = {
  OPEN: "bg-green-100 text-green-800",
  CLOSED: "bg-red-100 text-red-800",
  DRAFT: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
};

const ROLE_COLORS = {
  coordenador: "bg-blue-100 text-blue-800",
  formador: "bg-green-100 text-green-800",
  formando: "bg-purple-100 text-purple-800",
  secretaria: "bg-orange-100 text-orange-800",
};

const ROLE_LABELS = {
  coordenador: "Coordenador",
  formador: "Formador",
  formando: "Formando",
  secretaria: "Secretaria",
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] || "bg-gray-100 text-gray-800"}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

const LOADING_COLORS = {
  blue: "border-blue-600",
  green: "border-green-600",
  purple: "border-purple-600",
  orange: "border-orange-600",
};

export function LoadingCard({ color = "blue" }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className={`animate-spin rounded-full h-12 w-12 border-4 ${LOADING_COLORS[color] || LOADING_COLORS.blue} border-t-transparent`}></div>
    </div>
  );
}
