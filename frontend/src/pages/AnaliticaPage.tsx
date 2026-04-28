import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { InputField, SelectField } from "../components/Field";
import { fetchAnalytics } from "../features/analytics/api";
import { downloadPdf } from "../features/reports/api";
import { formatLocalDate } from "../utils/time";
import type { AnalyticsMetric, AnalyticsResponse, GrupoInfo } from "../types/contracts";

// ── Heatmap helpers ────────────────────────────────────────────────────────
const NIVEL_KEYS   = ["nivel_0","nivel_1","nivel_2","nivel_3","nivel_4","nivel_5"];
const NIVEL_LABELS = ["Tutorial","Adición","Multiplicación","Geometría","Medición","Fracciones"];

function heatLevel(e: number) { return e === 0 ? 0 : e < 3 ? 1 : e < 6 ? 2 : 3; }

function heatColor(errors: number | undefined): { bg: string; symbol: string; tip: string } {
  if (errors === undefined) return { bg: "var(--forest-navy)", symbol: "—", tip: "Sin datos" };
  if (errors <= 1.0) return { bg: "#2d6a4f", symbol: "✓", tip: `${errors.toFixed(2)} — Bajo` };
  if (errors <= 3.0) return { bg: "#f4a261", symbol: "△", tip: `${errors.toFixed(2)} — Medio` };
  return { bg: "#c1121f", symbol: "✗", tip: `${errors.toFixed(2)} — Alto` };
}

function worstLevelLabel(erroresPorNivel: Record<string, number>): string {
  const entries = Object.entries(erroresPorNivel);
  if (entries.length === 0) return "—";
  const [worstKey] = entries.reduce((a, b) => b[1] > a[1] ? b : a);
  const idx = NIVEL_KEYS.indexOf(worstKey);
  return idx >= 0 ? NIVEL_LABELS[idx] : worstKey;
}

function groupAverages(data: AnalyticsResponse): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {};
  for (const key of NIVEL_KEYS) {
    const vals = data.metricas
      .map(row => row.errores_por_nivel[key])
      .filter((v): v is number => v !== undefined);
    result[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
  }
  return result;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  selectedGroupId: number | null;
  selectedGroup: GrupoInfo | undefined;
  groupsData: GrupoInfo[] | undefined;
  isFetching: boolean;
  onSelectGroup: (id: number) => void;
  uuidByAlias: Record<number, Record<string, string>>;
  setUuidByAlias: Dispatch<SetStateAction<Record<number, Record<string, string>>>>;
}

export function AnaliticaPage({
  selectedGroupId, selectedGroup,
  uuidByAlias, setUuidByAlias,
}: Props) {
  const [metrica, setMetrica]                   = useState<AnalyticsMetric>("progreso");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [analyticsError, setAnalyticsError]     = useState("");
  const [reportError, setReportError]           = useState("");
  const [viewMode, setViewMode]                 = useState<"heatmap" | "table">("heatmap");

  const groupUuids = selectedGroupId !== null ? (uuidByAlias[selectedGroupId] ?? {}) : {};

  useEffect(() => {
    setAnalyticsEnabled(false);
    setAnalyticsError("");
  }, [selectedGroupId]);

  const analyticsQuery = useQuery({
    queryKey: ["analytics", selectedGroupId, metrica],
    queryFn: () => fetchAnalytics(selectedGroupId!, metrica),
    enabled: analyticsEnabled && selectedGroupId !== null,
    retry: 1,
  });

  useEffect(() => {
    if (analyticsQuery.error) {
      setAnalyticsError((analyticsQuery.error as any)?.message ?? "Error cargando analítica");
    } else {
      setAnalyticsError("");
    }
  }, [analyticsQuery.error]);

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

  if (!selectedGroupId) {
    return (
      <div>
        <h2 className="page-title">📊 Analítica</h2>
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <div className="empty-state-icon">📊</div>
          <h4>Selecciona un grupo desde el Dashboard</h4>
        </div>
      </div>
    );
  }

  const hasData = analyticsQuery.data && analyticsQuery.data.metricas.length > 0;

  // ── Toggle button styles ──────────────────────────────────────────────────
  const toggleBase: React.CSSProperties = {
    padding: "6px 14px", fontSize: "0.78rem", borderRadius: 6, cursor: "pointer",
    border: "1px solid var(--forest-action)", fontFamily: "'Montserrat',sans-serif",
    fontWeight: 600, transition: "background 0.15s, color 0.15s",
  };
  const toggleActive: React.CSSProperties = {
    ...toggleBase, background: "var(--forest-action)", color: "#fff",
  };
  const toggleGhost: React.CSSProperties = {
    ...toggleBase, background: "transparent", color: "var(--forest-action)",
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 4 }}>📊 Analítica</h2>
        {selectedGroup && (
          <p className="page-subtitle">
            Métricas de <strong style={{ color: "var(--text-light)" }}>{selectedGroup.nombre_grupo}</strong>
          </p>
        )}
      </div>

      <div className="card">
        {/* Controls row */}
        <div className="section-head mb-16">
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <SelectField value={metrica}
              onChange={(e) => { setMetrica(e.target.value as AnalyticsMetric); setAnalyticsEnabled(false); }}
              style={{ width: "auto" }}>
              <option value="progreso">Ordenar: Progreso</option>
              <option value="errores">Ordenar: Errores</option>
            </SelectField>
            <Button onClick={() => setAnalyticsEnabled(true)} disabled={!selectedGroup}>
              Consultar
            </Button>

            {/* View toggle — only shown once data is available */}
            {hasData && (
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <button style={viewMode === "heatmap" ? toggleActive : toggleGhost}
                  onClick={() => setViewMode("heatmap")}>
                  🌡 Mapa de calor
                </button>
                <button style={viewMode === "table" ? toggleActive : toggleGhost}
                  onClick={() => setViewMode("table")}>
                  📋 Tabla detallada
                </button>
              </div>
            )}
          </div>
        </div>

        {analyticsError && <div className="alert">⚠ {analyticsError}</div>}
        {reportError    && <div className="alert">⚠ {reportError}</div>}

        {analyticsQuery.isLoading && (
          <p style={{ textAlign: "center", padding: "48px 0", color: "var(--forest-warm)" }}>
            Cargando analítica...
          </p>
        )}

        {!analyticsEnabled && !analyticsQuery.data && !analyticsQuery.isLoading && (
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <h4>Pulsa "Consultar" para cargar los datos</h4>
          </div>
        )}

        {analyticsQuery.data?.metricas.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <h4>Sin actividad registrada</h4>
            <p>Los datos aparecen cuando los alumnos sincronizan desde la app.</p>
          </div>
        )}

        {/* ── Vista A: Mapa de calor ───────────────────────────────────────── */}
        {hasData && viewMode === "heatmap" && (() => {
          const avgs = groupAverages(analyticsQuery.data!);
          return (
            <>
              <div className="table-wrap" style={{ marginTop: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Alias</th>
                      {NIVEL_LABELS.map(label => (
                        <th key={label} style={{ textAlign: "center", minWidth: 90 }}>{label}</th>
                      ))}
                      <th>Rezago general</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsQuery.data!.metricas.map(row => (
                      <tr key={row.alias_alumno}>
                        <td><strong>{row.alias_alumno}</strong></td>
                        {NIVEL_KEYS.map(key => {
                          const val = row.errores_por_nivel[key];
                          const { bg, symbol, tip } = heatColor(val);
                          return (
                            <td key={key} title={tip}
                              style={{
                                textAlign: "center", background: bg,
                                color: "#fff", fontFamily: "'DM Mono',monospace",
                                fontSize: "0.9rem", cursor: "default",
                              }}>
                              {symbol}
                            </td>
                          );
                        })}
                        <td style={{ color: "var(--forest-warm)", fontSize: "0.8rem" }}>
                          {worstLevelLabel(row.errores_por_nivel)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--border-color)" }}>
                      <td style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Prom. grupo
                      </td>
                      {NIVEL_KEYS.map(key => {
                        const val = avgs[key];
                        const { bg, symbol } = heatColor(val);
                        return (
                          <td key={key}
                            title={val !== undefined ? `Promedio: ${val.toFixed(2)}` : "Sin datos"}
                            style={{
                              textAlign: "center", background: bg,
                              color: "#fff", fontFamily: "'DM Mono',monospace",
                              fontSize: "0.9rem", opacity: 0.85, cursor: "default",
                            }}>
                            {symbol}
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Legend */}
              <div style={{
                display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap",
                alignItems: "center", fontSize: "0.74rem",
                fontFamily: "'DM Mono',monospace",
              }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", color: "var(--text-muted)", fontWeight: 600 }}>
                  Leyenda:
                </span>
                {[
                  { bg: "#2d6a4f", symbol: "✓", label: "≤ 1.0 — Bajo" },
                  { bg: "#f4a261", symbol: "△", label: "1.1 – 3.0 — Medio" },
                  { bg: "#c1121f", symbol: "✗", label: "> 3.0 — Alto" },
                  { bg: "var(--forest-navy)", symbol: "—", label: "Sin datos" },
                ].map(({ bg, symbol, label }) => (
                  <span key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      background: bg, color: "#fff",
                      padding: "2px 8px", borderRadius: 4, fontSize: "0.8rem",
                    }}>
                      {symbol}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  </span>
                ))}
              </div>
            </>
          );
        })()}

        {/* ── Vista B: Tabla detallada ─────────────────────────────────────── */}
        {hasData && viewMode === "table" && (
          <div className="table-wrap" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Rezago</th>
                  <th>Misiones</th>
                  <th>Prom. errores</th>
                  <th>Monedas</th>
                  <th>Última actividad</th>
                  <th>UUID alumno</th>
                  <th>Reporte</th>
                </tr>
              </thead>
              <tbody>
                {analyticsQuery.data!.metricas.map((row) => {
                  const level = heatLevel(row.promedio_errores);
                  const uuid  = row.uuid_estudiante || groupUuids[row.alias_alumno] || "";
                  return (
                    <tr key={row.alias_alumno}>
                      <td><strong>{row.alias_alumno}</strong></td>
                      <td>
                        <span className={`heat-dot heat-${level}`}
                          title={["Sin errores","Bajo","Medio","Alto"][level]} />
                      </td>
                      <td className="mono">{row.misiones_completas}</td>
                      <td className="mono">{row.promedio_errores.toFixed(2)}</td>
                      <td className="mono">{row.monedas_totales}</td>
                      <td style={{ color: "var(--forest-warm)", fontSize: "0.8rem" }}>
                        {formatLocalDate(row.ultima_actividad)}
                      </td>
                      <td>
                        <InputField
                          value={uuid}
                          onChange={(e) => setUuidByAlias(prev => ({
                            ...prev,
                            [selectedGroupId!]: { ...(prev[selectedGroupId!] ?? {}), [row.alias_alumno]: e.target.value },
                          }))}
                          placeholder="UUID"
                          style={{ minWidth: 140 }}
                        />
                      </td>
                      <td>
                        <Button variant="secondary"
                          disabled={!uuid || reportMutation.isPending}
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
    </div>
  );
}
