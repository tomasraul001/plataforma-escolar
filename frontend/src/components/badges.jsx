const STATUS_COLORS = {
  OPEN: "bg-green-100/80 text-green-800 backdrop-blur-sm",
  CLOSED: "bg-red-100/80 text-red-800 backdrop-blur-sm",
  DRAFT: "bg-yellow-100/80 text-yellow-800 backdrop-blur-sm",
  ARCHIVED: "bg-gray-100/80 text-gray-800 backdrop-blur-sm",
};

const ROLE_COLORS = {
  coordenador: "bg-blue-100/80 text-blue-800 backdrop-blur-sm",
  formador: "bg-green-100/80 text-green-800 backdrop-blur-sm",
  formando: "bg-purple-100/80 text-purple-800 backdrop-blur-sm",
  secretaria: "bg-orange-100/80 text-orange-800 backdrop-blur-sm",
};

const ROLE_LABELS = {
  coordenador: "Coordenador",
  formador: "Formador",
  formando: "Formando",
  secretaria: "Secretaria",
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100/80 text-gray-800 backdrop-blur-sm"}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] || "bg-gray-100/80 text-gray-800 backdrop-blur-sm"}`}>
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
