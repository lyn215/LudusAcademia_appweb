import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "./components/Button";
import { InputField, SelectField } from "./components/Field";
import { fetchAnalytics } from "./features/analytics/api";
import { login, logout, getSession, register } from "./features/auth/api";
import { createLinkCode } from "./features/codes/api";
import { fetchGroups, createGroup } from "./features/groups/api";
import { fetchHealth } from "./features/health/api";
import { downloadPdf } from "./features/reports/api";
import { subscribeErrors } from "./lib/errorBus";
import { formatLocalDate, formatCountdown, secondsUntil } from "./utils/time";

import type { AnalyticsMetric, GrupoInfo } from "./types/contracts";

// ── tiny helpers ──────────────────────────────────────────────────────────────
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
        <div key={i} className="alert" style={{ marginBottom: 0 }}>
          ⚠ {e}
        </div>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {

  // Global errors (CORS, network, unexpected)
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  useEffect(() => subscribeErrors((msg) => {
    setGlobalErrors((prev) => {
      if (prev.includes(msg)) return prev;   // deduplicate
      return [...prev.slice(-2), msg];
    });
  }), []);
  const clearErrors = () => setGlobalErrors([]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => { setAuthError(""); sessionQuery.refetch(); },
    onError: (e: any) => setAuthError(e?.message ?? "Error al iniciar sesión"),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => { sessionQuery.refetch(); clearErrors(); },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuthError("");
      if (data.email_confirmation_required) {
        setEmailConfirmPending(true);
      } else {
        sessionQuery.refetch();
      }
    },
    onError: (e: any) => setAuthError(e?.message ?? "Error al registrarse"),
  });

  // ── Health ────────────────────────────────────────────────────────────────
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 45_000,
    retry: 1,
  });

  // ── Groups ────────────────────────────────────────────────────────────────
  const [groupError, setGroupError] = useState("");
  const groupsQuery = useQuery({
    queryKey: ["grupos"],
    queryFn: fetchGroups,
    enabled: !!sessionQuery.data?.authenticated,
    retry: 1,
    onError: (e: any) => setGroupError(e?.message ?? "Error cargando grupos"),
  });

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName]       = useState("");
  const [newGroupSchool, setNewGroupSchool]   = useState("Escuela 5 de Mayo de 1862");

  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (data) => {
      setGroupError("");
      groupsQuery.refetch();
      setSelectedGroupId(data.id_grupo);
      setShowCreateGroup(false);
      setNewGroupName("");
    },
    onError: (e: any) => setGroupError(e?.message ?? "Error creando grupo"),
  });

  useEffect(() => {
    if (groupsQuery.data?.length && selectedGroupId === null) {
      setSelectedGroupId(groupsQuery.data[0].id_grupo);
    }
  }, [groupsQuery.data, selectedGroupId]);

  const selectedGroup: GrupoInfo | undefined = groupsQuery.data?.find(
    (g) => g.id_grupo === selectedGroupId,
  );

  // ── Codes ─────────────────────────────────────────────────────────────────
  const [horasValidez, setHorasValidez] = useState(24);
  const [codeError, setCodeError]       = useState("");

  const codeMutation = useMutation({
    mutationFn: createLinkCode,
    onError: (e: any) => setCodeError(e?.message ?? "Error generando código"),
    onSuccess: () => setCodeError(""),
  });

  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(v => v + 1), 1000); return () => clearInterval(t); }, []);

  const countdown = useMemo(() => {
    if (!codeMutation.data?.expira_el) return null;
    return secondsUntil(codeMutation.data.expira_el);
  }, [codeMutation.data, tick]);

  const countdownDisplay = useMemo(() => countdown !== null ? formatCountdown(countdown) : null, [countdown]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const [metrica, setMetrica]                     = useState<AnalyticsMetric>("progreso");
  const [analyticsEnabled, setAnalyticsEnabled]   = useState(false);
  const [uuidByAlias, setUuidByAlias]             = useState<Record<string, string>>({});
  const [analyticsError, setAnalyticsError]       = useState("");

  const analyticsQuery = useQuery({
    queryKey: ["analytics", selectedGroupId, metrica],
    queryFn:  () => fetchAnalytics(selectedGroupId!, metrica),
    enabled:  analyticsEnabled && selectedGroupId !== null,
    retry: 1,
    onError: (e: any) => setAnalyticsError(e?.message ?? "Error cargando analítica"),
    onSuccess: () => setAnalyticsError(""),
  });

  // ── Reports ───────────────────────────────────────────────────────────────
  const [reportError, setReportError] = useState("");
  const reportMutation = useMutation({
    mutationFn: downloadPdf,
    onSuccess: (blob, uuid) => {
      setReportError("");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `reporte-${uuid}.pdf`; a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: any) => setReportError(e?.message ?? "Error descargando PDF"),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    loginMutation.mutate({ email: String(fd.get("email") || ""), password: String(fd.get("password") || "") });
  };

  const onRegister = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") || "");
    const pw2 = String(fd.get("password2") || "");
    if (pw !== pw2) { setAuthError("Las contraseñas no coinciden."); return; }
    registerMutation.mutate({ email: String(fd.get("email") || ""), password: pw });
  };

  const onCreateGroup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGroupError("");
    createGroupMutation.mutate({ nombre_grupo: newGroupName, nombre_escuela: newGroupSchool });
  };

  // ── Render: loading ───────────────────────────────────────────────────────
  if (sessionQuery.isLoading) {
    return (
      <div className="shell-center">
        <p style={{ color: "var(--muted)", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem" }}>
          iniciando...
        </p>
      </div>
    );
  }

  // ── Render: login/register ────────────────────────────────────────────────
  if (!sessionQuery.data?.authenticated) {
    if (emailConfirmPending) return (
      <div className="shell-center">
        <div className="card-login fade-up" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📬</div>
          <h2 className="mb-8">Revisa tu correo</h2>
          <p className="mb-24">Confirma tu cuenta y luego inicia sesión.</p>
          <Button variant="ghost" style={{ width: "100%" }}
            onClick={() => { setEmailConfirmPending(false); setAuthMode("login"); }}>
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    );

    return (
      <div className="shell-center">
        <div className="card-login fade-up">
          <div className="login-logo">
            <div className="login-logo-mark">L+</div>
            <div>
              <div className="login-logo-text">LudusAcademia+</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Panel Docente · v2.1</div>
            </div>
          </div>

          <div className="auth-toggle mb-24">
            <button className={`auth-tab${authMode === "login" ? " auth-tab--active" : ""}`}
              onClick={() => { setAuthMode("login"); setAuthError(""); }}>
              Iniciar sesión
            </button>
            <button className={`auth-tab${authMode === "register" ? " auth-tab--active" : ""}`}
              onClick={() => { setAuthMode("register"); setAuthError(""); }}>
              Registrarse
            </button>
          </div>

          {authError && <div className="alert mb-16">⚠ {authError}</div>}

          {authMode === "login" ? (
            <form onSubmit={onLogin} className="stack">
              <div className="form-group">
                <label>Correo electrónico</label>
                <InputField name="email" type="email" placeholder="docente@escuela.edu.mx" required />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <InputField name="password" type="password" placeholder="••••••••" required minLength={6} />
              </div>
              <Button type="submit" disabled={loginMutation.isPending} style={{ marginTop: 4 }}>
                {loginMutation.isPending ? "Verificando..." : "Iniciar sesión →"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="stack">
              <div className="form-group">
                <label>Correo electrónico</label>
                <InputField name="email" type="email" placeholder="docente@escuela.edu.mx" required />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <InputField name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <div className="form-group">
                <label>Confirmar contraseña</label>
                <InputField name="password2" type="password" placeholder="Repite la contraseña" required minLength={6} />
              </div>
              <Button type="submit" disabled={registerMutation.isPending} style={{ marginTop: 4 }}>
                {registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta →"}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Render: loading groups ────────────────────────────────────────────────
  if (groupsQuery.isLoading) {
    return (
      <div className="shell-center">
        <p style={{ color: "var(--muted)", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem" }}>
          cargando grupos...
        </p>
      </div>
    );
  }

  const noGroups = !groupsQuery.data || groupsQuery.data.length === 0;

  // ── Render: onboarding ────────────────────────────────────────────────────
  if (noGroups && !showCreateGroup) {
    return (
      <div className="onboard-wrap">
        <div className="onboard-card fade-up">
          <div className="onboard-icon">🎓</div>
          <h2 className="mb-8">Bienvenido, aún no tienes grupos configurados</h2>
          <p className="mb-24">Crea tu primer grupo para generar códigos y ver analítica.</p>
          {groupError && <div className="alert mb-16">⚠ {groupError}</div>}
          <Button onClick={() => { setGroupError(""); setShowCreateGroup(true); }} style={{ width: "100%" }}>
            Crear mi primer grupo →
          </Button>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button onClick={() => logoutMutation.mutate()}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.8rem" }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: create group form ─────────────────────────────────────────────
  if (showCreateGroup) {
    return (
      <div className="onboard-wrap">
        <div className="onboard-card fade-up">
          <div className="onboard-icon">🏫</div>
          <h2 className="mb-8">{noGroups ? "Crear mi primer grupo" : "Nuevo grupo escolar"}</h2>
          <p className="mb-24">Ingresa el nombre del salón y la institución educativa.</p>
          {groupError && <div className="alert mb-16">⚠ {groupError}</div>}
          <form onSubmit={onCreateGroup} className="stack">
            <div className="form-group">
              <label>Nombre del grupo</label>
              <InputField value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ej: 3° A, 5to Primaria B" required />
            </div>
            <div className="form-group">
              <label>Nombre de la escuela</label>
              <InputField value={newGroupSchool} onChange={(e) => setNewGroupSchool(e.target.value)}
                placeholder="Nombre de la institución" required />
            </div>
            <Button type="submit" disabled={createGroupMutation.isPending} style={{ marginTop: 4 }}>
              {createGroupMutation.isPending ? "Creando grupo..." : "Crear y empezar →"}
            </Button>
            {!noGroups && (
              <Button type="button" variant="ghost" onClick={() => { setGroupError(""); setShowCreateGroup(false); }}>
                Cancelar
              </Button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ── Render: dashboard ─────────────────────────────────────────────────────
  const totalAlumnos = groupsQuery.data?.reduce((s, g) => s + g.total_alumnos, 0) ?? 0;

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
          <span className="topbar-user">{sessionQuery.data.user?.email}</span>
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
              className={`group-chip${selectedGroupId === grupo.id_grupo ? " group-chip--active" : ""}`}
              onClick={() => { setSelectedGroupId(grupo.id_grupo); setAnalyticsEnabled(false); codeMutation.reset(); }}>
              <span className="chip-name">{grupo.nombre_grupo}</span>
              <span className="chip-count">{grupo.total_alumnos} alumno{grupo.total_alumnos !== 1 ? "s" : ""} · ID {grupo.id_grupo}</span>
            </button>
          ))}
        </div>
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
                  const uuid  = row.uuid_estudiante || uuidByAlias[row.alias_alumno] || "";
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
                          onChange={(e) => setUuidByAlias(prev => ({ ...prev, [row.alias_alumno]: e.target.value }))}
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
