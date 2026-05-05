import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { formatCountdown, secondsUntil } from "../utils/time";
import type { GrupoInfo, HealthResponse, SessionResponse } from "../types/contracts";

interface StoredCode {
  codigo: string;
  expires_at: string;
  id_grupo: string;
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span className={`badge ${ok ? "badge-green" : "badge-red"}`}>
      <span className="badge-dot" />{ok ? "Operativo" : "Degradado"}
    </span>
  );
}

function ErrorList({ errors, onClear }: { errors: string[]; onClear: () => void }) {
  if (!errors.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      {errors.map((e, i) => (
        <div key={i} className="alert" style={{ marginBottom: 6 }}>⚠ {e}</div>
      ))}
      <button onClick={onClear}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--forest-warm)", fontSize: "0.75rem" }}>
        Limpiar errores
      </button>
    </div>
  );
}

interface Props {
  sessionData: SessionResponse;
  healthQuery: { data?: HealthResponse; isLoading: boolean };
  groupsQuery: { data?: GrupoInfo[]; isFetching: boolean };
  selectedGroupId: string | null;
  selectedGroup: GrupoInfo | undefined;
  onSelectGroup: (id: string) => void;
  setShowCreateGroup: (v: boolean) => void;
  setGroupError: (e: string) => void;
  globalErrors: string[];
  clearErrors: () => void;
}

export function DashboardPage({
  sessionData, healthQuery, groupsQuery,
  selectedGroupId, selectedGroup, onSelectGroup,
  setShowCreateGroup, setGroupError,
  globalErrors, clearErrors,
}: Props) {
  const totalAlumnos = groupsQuery.data?.reduce((s, g) => s + g.total_estudiantes, 0) ?? 0;

  // ── Last code from localStorage ───────────────────────────────────────────
  const [lastCode, setLastCode] = useState<StoredCode | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ludus_ultimo_codigo");
      if (raw) setLastCode(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const lastCodeCountdown = useMemo(() => {
    if (!lastCode?.expires_at) return null;
    return secondsUntil(lastCode.expires_at);
  }, [lastCode, tick]);

  return (
    <>
      {/* Global errors */}
      <ErrorList errors={globalErrors} onClear={clearErrors} />

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="fade-up" style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 4 }}>
          Bienvenido 👋
        </h1>
        <p className="fade-up" style={{ color: "var(--forest-warm)", marginBottom: 0 }}>
          {sessionData.user?.email}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid-3 fade-up-1">
        <div className="stat-tile">
          <div className="stat-label">Grupos activos</div>
          <div className="stat-value green">{groupsQuery.data?.length ?? 0}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Alumnos totales</div>
          <div className="stat-value">{totalAlumnos}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Estado API</div>
          <div style={{ marginTop: 8 }}>
            {healthQuery.isLoading
              ? <span style={{ color: "var(--forest-warm)", fontSize: "0.85rem" }}>consultando...</span>
              : healthQuery.data
                ? <>
                    <Dot ok={healthQuery.data.estado === "ok"} />
                    <div style={{ fontSize: "0.72rem", color: "var(--forest-warm)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
                      v{healthQuery.data.version} · {healthQuery.data.entorno}
                    </div>
                  </>
                : <span className="badge badge-red">Sin respuesta</span>}
          </div>
        </div>
      </div>

      <div className="grid-2 fade-up-2">
        {/* Active group card */}
        <div className="card">
          <div className="section-head">
            <h3 className="mb-4">Grupo activo</h3>
            <Button variant="ghost" onClick={() => { setGroupError(""); setShowCreateGroup(true); }}
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
              + Nuevo grupo
            </Button>
          </div>
          <div className="group-chips mb-12">
            {groupsQuery.data?.map((grupo) => (
              <button key={grupo.id}
                className={`group-chip${selectedGroupId === grupo.id ? " group-chip--active" : ""}${groupsQuery.isFetching ? " group-chip--updating" : ""}`}
                onClick={() => onSelectGroup(grupo.id)}>
                <span className="chip-name">{grupo.nombre_grupo}</span>
                <span className="chip-count">{grupo.total_estudiantes} alumno{grupo.total_estudiantes !== 1 ? "s" : ""} · {grupo.id.slice(0, 8)}</span>
              </button>
            ))}
          </div>
          {groupsQuery.isFetching && (
            <p style={{ fontSize: "0.72rem", color: "var(--forest-warm)", fontFamily: "'DM Mono',monospace" }}>
              actualizando...
            </p>
          )}
          {selectedGroup && (
            <>
              <div className="divider" />
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--forest-warm)" }}>
                  Escuela: <strong style={{ color: "var(--text-light)" }}>{selectedGroup.nombre_escuela || "—"}</strong>
                </span>
                <span style={{ color: "var(--forest-warm)" }}>
                  Alumnos: <strong style={{ color: "var(--forest-action)" }}>{selectedGroup.total_estudiantes}</strong>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Last code card */}
        <div className="card">
          <h3 className="mb-4">Actividad reciente</h3>
          <p className="mb-16">Último código de vinculación generado.</p>
          {lastCode ? (
            <>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "1.6rem", letterSpacing: "0.14em", color: "var(--forest-action)", marginBottom: 8 }}>
                {lastCode.codigo}
              </div>
              <div style={{ fontSize: "0.8rem", fontFamily: "'DM Mono',monospace", color: lastCodeCountdown !== null && lastCodeCountdown <= 0 ? "var(--error-color)" : lastCodeCountdown !== null && lastCodeCountdown < 3600 ? "var(--warn-color)" : "var(--forest-warm)" }}>
                {lastCodeCountdown !== null && lastCodeCountdown <= 0
                  ? "⚠ Código expirado"
                  : lastCodeCountdown !== null
                    ? `Expira en ${formatCountdown(lastCodeCountdown)}`
                    : "—"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--forest-warm)", marginTop: 4 }}>
                Grupo {lastCode.id_grupo.slice(0, 8)}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-state-icon">🔑</div>
              <h4>Aún no has generado ningún código</h4>
              <p style={{ fontSize: "0.8rem", marginTop: 4 }}>Ve a Vinculación para generar uno.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
