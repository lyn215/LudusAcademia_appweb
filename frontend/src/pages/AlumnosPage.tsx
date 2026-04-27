import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { InputField } from "../components/Field";
import { fetchAnalytics } from "../features/analytics/api";
import { downloadPdf } from "../features/reports/api";
import { formatLocalDate } from "../utils/time";
import type { GrupoInfo } from "../types/contracts";

function heatLevel(e: number) { return e === 0 ? 0 : e < 3 ? 1 : e < 6 ? 2 : 3; }

interface Props {
  selectedGroupId: number | null;
  selectedGroup: GrupoInfo | undefined;
  groupsData: GrupoInfo[] | undefined;
  isFetching: boolean;
  onSelectGroup: (id: number) => void;
  uuidByAlias: Record<number, Record<string, string>>;
  setUuidByAlias: Dispatch<SetStateAction<Record<number, Record<string, string>>>>;
}

export function AlumnosPage({
  selectedGroupId, selectedGroup,
  uuidByAlias, setUuidByAlias,
}: Props) {
  const groupUuids = selectedGroupId !== null ? (uuidByAlias[selectedGroupId] ?? {}) : {};

  const alumnosQuery = useQuery({
    queryKey: ["analytics", selectedGroupId, "progreso"],
    queryFn: () => fetchAnalytics(selectedGroupId!, "progreso"),
    enabled: selectedGroupId !== null,
    retry: 1,
  });

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

  if (!selectedGroupId) {
    return (
      <div>
        <h2 className="page-title">👥 Alumnos</h2>
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <div className="empty-state-icon">📋</div>
          <h4>Selecciona un grupo desde el Dashboard</h4>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 4 }}>👥 Alumnos</h2>
        {selectedGroup && (
          <p className="page-subtitle">
            {selectedGroup.nombre_grupo} — {selectedGroup.total_alumnos} alumno{selectedGroup.total_alumnos !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {reportError && <div className="alert">⚠ {reportError}</div>}

      {alumnosQuery.isLoading && (
        <p style={{ textAlign: "center", padding: "48px 0", color: "var(--forest-warm)" }}>
          Cargando alumnos...
        </p>
      )}

      {alumnosQuery.error && (
        <div className="alert">⚠ {(alumnosQuery.error as any)?.message ?? "Error cargando alumnos"}</div>
      )}

      {alumnosQuery.data && alumnosQuery.data.metricas.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <h4>Sin alumnos vinculados aún</h4>
          <p>Genera un código en Vinculación para que tus alumnos se registren.</p>
        </div>
      )}

      {alumnosQuery.data && alumnosQuery.data.metricas.length > 0 && (
        <div className="card">
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
                {alumnosQuery.data.metricas.map((row) => {
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
        </div>
      )}
    </div>
  );
}
