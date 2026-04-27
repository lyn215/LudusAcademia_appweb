import { Button } from "./Button";

export type Page = "dashboard" | "alumnos" | "vinculacion" | "analitica" | "banco";

interface NavItem {
  id: Page;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",   icon: "🏠", label: "Dashboard" },
  { id: "alumnos",     icon: "👥", label: "Alumnos" },
  { id: "vinculacion", icon: "🔗", label: "Vinculación" },
  { id: "analitica",   icon: "📊", label: "Analítica" },
  { id: "banco",       icon: "📚", label: "Banco de Preguntas" },
];

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  userEmail?: string | null;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onNavigate, userEmail, onLogout }: Props) {
  return (
    <nav className="sidebar-nav">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">LudusAcademia+</div>
        <div className="sidebar-logo-sub">Panel Docente · v2.1</div>
      </div>

      <div className="sidebar-nav-items">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item${currentPage === item.id ? " active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        {userEmail && (
          <div className="sidebar-user-email">{userEmail}</div>
        )}
        <Button variant="ghost" onClick={onLogout} style={{ width: "100%", fontSize: "0.8rem", padding: "8px 12px" }}>
          Cerrar sesión
        </Button>
      </div>
    </nav>
  );
}
