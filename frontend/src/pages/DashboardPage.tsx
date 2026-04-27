import type { Dispatch, SetStateAction } from "react";
import { Button } from "../components/Button";
import { InputField, SelectField } from "../components/Field";
import { formatLocalDate } from "../utils/time";
import type {
  AnalyticsMetric,
  AnalyticsResponse,
  CodeResponse,
  GrupoInfo,
  HealthResponse,
  SessionResponse,
} from "../types/contracts";

// ── helpers ───────────────────────────────────────────────────────────────────
function heatLevel(e: number) { return e === 0 ? 0 : e < 3 ? 1 : e < 6 ? 2 : 3; }

function Dot({ ok }: { ok: boolean }) {
  return (
    <span className={`badge ${ok ? "badge-green" : "badge-red"}`}>
      <span className="badge-dot" />{ok ? "Operativo" : "Degradado"}
    </span>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {errors.map((e, i) => (
        <div key={i} className="alert" style={{ marginBottom: 0 }}>⚠ {e}</div>
      ))}
    </div>
  );
}

// ── prop types ────────────────────────────────────────────────────────────────
interface Props {
  sessionData: SessionResponse;
  globalErrors: string[];
  clearErrors: () => void;
  healthQuery: {
    data?: HealthResponse;
    isLoading: boolean;
    refetch: () => void;
  };
  groupsQuery: {
    data?: GrupoInfo[];
    isFetching: boolean;
  };
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number) => void;
  setShowCreateGroup: (v: boolean) => void;
  setGroupError: (e: string) => void;
  selectedGroup: GrupoInfo | undefined;
  codeMutation: {
    data?: CodeResponse;
    isPending: boolean;
    mutate: (params: { id_grupo: number; horas_validez: number }) => void;
  };
  horasValidez: number;
  setHorasValidez: (h: number) => void;
  codeError: string;
  countdown: number | null;
  countdownDisplay: string | null;
  analyticsQuery: {
    data?: AnalyticsResponse;
    isLoading: boolean;
  };
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (v: boolean) => void;
  metrica: AnalyticsMetric;
  setMetrica: (m: AnalyticsMetric) => void;
  uuidByAlias: Record<number, Record<string, string>>;
  setUuidByAlias: Dispatch<SetStateAction<Record<number, Record<string, string>>>>;
  analyticsError: string;
  reportMutation: {
    isPending: boolean;
    mutate: (uuid: string) => void;
  };
  reportError: string;
  logoutMutation: { mutate: () => void };
}

// ── component ─────────────────────────────────────────────────────────────────
export function DashboardPage({
  sessionData, globalErrors, clearErrors,
  healthQuery, groupsQuery,
  selectedGroupId, onSelectGroup, setShowCreateGroup, setGroupError,
  selectedGroup,
  codeMutation, horasValidez, setHorasValidez, codeError, countdown, countdownDisplay,
  analyticsQuery, analyticsEnabled, setAnalyticsEnabled, metrica, setMetrica,
  uuidByAlias, setUuidByAlias, analyticsError,
  reportMutation, reportError,
  logoutMutation,
}: Props) {
  const totalAlumnos = groupsQuery.data?.reduce((s, g) => s + g.total_alumnos, 0) ?? 0;
  const groupUuids = selectedGroupId !== null ? (uuidByAlias[selectedGroupId] ?? {}) : {};

  return (
    <main className="shell-dash">

      {/* Topbar */}
      <header className="topbar fade-up">
        <div className="topbar-brand">
          <div className="topbar-logo">L+</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "1rem" }}>LudusAcademia+</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Panel Docente · v2.1</div>
          </div>
        </div>
        <div className="topbar-actions">
          {healthQuery.data && <Dot ok={healthQuery.data.estado === "ok"} />}
          <span className="topbar-user">{sessionData.user?.email}</span>
          <Button variant="ghost" onClick={() => logoutMutation.mutate()} style={{ padding: "8px 14px" }}>
            Salir
          </Button>
        </div>
      </header>

      {/* Global network errors */}
      {globalErrors.length > 0 && (
        <div className="fade-up" style={{ marginBottom: 16 }}>
          <ErrorList errors={globalErrors} />
          <button onClick={clearErrors}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.75rem" }}>
            Limpiar errores
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid-3 fade-up-1">
        <div className="stat-tile">
          <div className="stat-label">Grupos activos</div>
          <div className="stat-value green">{groupsQuery.data?.length ?? 0}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Alumnos vinculados</div>
          <div className="stat-value">{totalAlumnos}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Estado API</div>
          <div style={{ marginTop: 6 }}>
            {healthQuery.isLoading
              ? <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>consultando...</span>
              : healthQuery.data
                ? <><Dot ok={healthQuery.data.estado === "ok"} />
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
                      v{healthQuery.data.version} · {healthQuery.data.entorno}
                    </div></>
                : <span className="badge badge-red">Sin respuesta</span>}
          </div>
        </div>
      </div>

      {/* Group selector */}
      <div className="card fade-up-2 mb-16">
        <div className="section-head">
          <div>
            <h3 className="mb-4">Mis grupos</h3>
            <p>Selecciona el grupo activo para operar.</p>
          </div>
          <Button variant="ghost" onClick={() => { setGroupError(""); setShowCreateGroup(true); }}>
            + Nuevo grupo
          </Button>
        </div>
        <div className="group-chips">
          {groupsQuery.data?.map((grupo) => (
            <button key={grupo.id_grupo}
              className={`group-chip${selectedGroupId === grupo.id_grupo ? " group-chip--active" : ""}${groupsQuery.isFetching ? " group-chip--updating" : ""}`}
              onClick={() => onSelectGroup(grupo.id_grupo)}>
              <span className="chip-name">{grupo.nombre_grupo}</span>
              <span className="chip-count">{grupo.total_alumnos} alumno{grupo.total_alumnos !== 1 ? "s" : ""} · ID {grupo.id_grupo}</span>
            </button>
          ))}
        </div>
        {groupsQuery.isFetching && (
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 8, fontFamily: "'DM Mono',monospace" }}>
            actualizando...
          </p>
        )}
        {selectedGroup && (
          <>
            <div className="divider" />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--muted)" }}>Escuela: <strong style={{ color: "var(--text)" }}>{selectedGroup.nombre_escuela}</strong></span>
              <span style={{ color: "var(--muted)" }}>Alumnos: <strong style={{ color: "var(--green)" }}>{selectedGroup.total_alumnos}</strong></span>
            </div>
          </>
        )}
      </div>

      {/* Code + Health */}
      <div className="grid-2 fade-up-3">
        <div className="card">
          <h3 className="mb-4">Código de vinculación</h3>
          <p className="mb-16">
            {selectedGroup
              ? <>Para: <strong style={{ color: "var(--text)" }}>{selectedGroup.nombre_grupo}</strong></>
              : "Selecciona un grupo."}
          </p>
          {codeError && <div className="alert mb-16">⚠ {codeError}</div>}
          {selectedGroup ? (
            <>
              <div className="row mb-16">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Horas de validez</label>
                  <InputField type="number" min={1} max={168} value={horasValidez}
                    onChange={(e) => setHorasValidez(Number(e.target.value))} />
                </div>
                <Button onClick={() => codeMutation.mutate({ id_grupo: selectedGroup.id_grupo, horas_validez: horasValidez })}
                  disabled={codeMutation.isPending}>
                  {codeMutation.isPending ? "Generando..." : "Generar"}
                </Button>
              </div>
              {codeMutation.data && (
                <div className="code-display">
                  <div className="code-chars mono">{codeMutation.data.codigo_vinculacion}</div>
                  <div className={`code-expiry${countdown === 0 ? " expired" : (countdown !== null && countdown < 3600 ? " expiring" : "")}`}>
                    {countdown === 0 ? "⚠ Código expirado" : `Expira en ${countdownDisplay || "—"}`}
                  </div>
                  <Button variant="secondary"
                    onClick={() => navigator.clipboard.writeText(codeMutation.data!.codigo_vinculacion)}>
                    Copiar código
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">🔑</div><h4>Sin grupo seleccionado</h4></div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4">Estado del backend</h3>
          <p className="mb-16">Conexión con la API de LudusAcademia.</p>
          {healthQuery.isLoading ? <p>Consultando...</p>
            : healthQuery.data ? (
              <div className="stack">
                {[
                  ["Estado",  <Dot ok={healthQuery.data.estado === "ok"} />],
                  ["Versión", <span className="mono" style={{ fontSize: "0.82rem" }}>{healthQuery.data.version}</span>],
                  ["Entorno", <span className="badge badge-blue">{healthQuery.data.entorno}</span>],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{label}</span>
                    {val}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">⚡</div><h4>Sin respuesta</h4></div>
            )}
          <div className="divider" />
          <Button variant="ghost" onClick={() => healthQuery.refetch()} style={{ width: "100%" }}>Refrescar</Button>
        </div>
      </div>

      {/* Analytics */}
      <div className="card fade-up-4">
        <div className="section-head mb-16">
          <div>
            <h3 className="mb-4">Analítica del grupo</h3>
            <p>{selectedGroup
              ? <>Métricas de <strong style={{ color: "var(--text)" }}>{selectedGroup.nombre_grupo}</strong></>
              : "Selecciona un grupo."}</p>
          </div>
          {selectedGroup && (
            <div className="row">
              <SelectField value={metrica}
                onChange={(e) => { setMetrica(e.target.value as AnalyticsMetric); setAnalyticsEnabled(false); }}
                style={{ width: "auto" }}>
                <option value="progreso">Ordenar: Progreso</option>
                <option value="errores">Ordenar: Errores</option>
              </SelectField>
              <Button onClick={() => setAnalyticsEnabled(true)} disabled={!selectedGroup}>Consultar</Button>
            </div>
          )}
        </div>

        {analyticsError && <div className="alert mb-16">⚠ {analyticsError}</div>}
        {reportError   && <div className="alert mb-16">⚠ {reportError}</div>}

        {!selectedGroup && (
          <div className="empty-state"><div className="empty-state-icon">📊</div><h4>Sin grupo activo</h4></div>
        )}
        {selectedGroup && analyticsQuery.isLoading && <p style={{ textAlign: "center", padding: "32px 0" }}>Cargando analítica...</p>}
        {selectedGroup && !analyticsEnabled && !analyticsQuery.data && (
          <div className="empty-state"><div className="empty-state-icon">📈</div><h4>Pulsa "Consultar" para cargar</h4></div>
        )}
        {analyticsQuery.data?.metricas.length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">🎮</div><h4>Sin actividad registrada</h4><p>Los datos aparecen cuando los alumnos sincronizan desde la app.</p></div>
        )}
        {analyticsQuery.data && analyticsQuery.data.metricas.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alias</th><th>Rezago</th><th>Misiones</th><th>Prom. errores</th>
                  <th>Monedas</th><th>Última actividad</th><th>UUID alumno</th><th>Reporte</th>
                </tr>
              </thead>
              <tbody>
                {analyticsQuery.data.metricas.map((row) => {
                  const level = heatLevel(row.promedio_errores);
                  const uuid  = row.uuid_estudiante || groupUuids[row.alias_alumno] || "";
                  return (
                    <tr key={row.alias_alumno}>
                      <td><strong>{row.alias_alumno}</strong></td>
                      <td><span className={`heat-dot heat-${level}`} title={["Sin errores","Bajo","Medio","Alto"][level]} /></td>
                      <td className="mono">{row.misiones_completas}</td>
                      <td className="mono">{row.promedio_errores.toFixed(2)}</td>
                      <td className="mono">{row.monedas_totales}</td>
                      <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{formatLocalDate(row.ultima_actividad)}</td>
                      <td>
                        <InputField value={uuid}
                          onChange={(e) => setUuidByAlias(prev => ({
                            ...prev,
                            [selectedGroupId!]: { ...(prev[selectedGroupId!] ?? {}), [row.alias_alumno]: e.target.value },
                          }))}
                          placeholder="UUID" style={{ minWidth: 140 }} />
                      </td>
                      <td>
                        <Button variant="secondary" disabled={!uuid || reportMutation.isPending}
                          onClick={() => reportMutation.mutate(uuid)}
                          style={{ padding: "6px 12px", fontSize: "0.78rem" }}>
                          PDF
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
