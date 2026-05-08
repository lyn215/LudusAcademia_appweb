import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { fetchAnalytics, actualizarAlias } from "../features/analytics/api";
import { downloadPdf } from "../features/reports/api";
import { formatLocalDate } from "../utils/time";
import type { GrupoInfo } from "../types/contracts";

function heatLevel(e: number) { return e === 0 ? 0 : e < 3 ? 1 : e < 6 ? 2 : 3; }

// ── Inline-editable alias cell ────────────────────────────────────────────
interface AliasCellProps {
  alias: string;
  uuid: string;
  groupId: string;
}

function AliasCell({ alias, uuid, groupId }: AliasCellProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState("");
  const [cellError, setCellError] = useState("");

  const canEdit = !!uuid;

  const aliasMutation = useMutation({
    mutationFn: (newAlias: string) => actualizarAlias(uuid, newAlias),
    onSuccess: () => {
      setCellError("");
      queryClient.invalidateQueries({ queryKey: ["analytics", groupId] });
    },
    onError: (e: any) => {
      setCellError(e?.message ?? "Error al guardar");
    },
  });

  const startEdit = () => {
    if (!canEdit) return;
    setDraft(alias);
    setCellError("");
    setEditing(true);
  };

  // Called on blur and on Enter (via programmatic blur)
  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === alias) return;
    aliasMutation.mutate(trimmed);
  };

  if (editing) {
    return (
      <td>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")  e.currentTarget.blur(); // triggers onBlur → commit
            if (e.key === "Escape") { setDraft(alias); setCellError(""); setEditing(false); }
          }}
          onBlur={commit}
          className="field"
          style={{ minWidth: 120, padding: "4px 8px", fontSize: "0.85rem" }}
        />
      </td>
    );
  }

  return (
    <td>
      <span
        onClick={startEdit}
        title={canEdit ? "Clic para editar" : "Ingresa el UUID para editar el nombre"}
        style={{
          cursor: canEdit ? "pointer" : "default",
          color: aliasMutation.isPending ? "var(--forest-warm)" : undefined,
          borderBottom: canEdit ? "1px dashed var(--forest-warm)" : undefined,
          paddingBottom: 1,
          display: "inline-block",
        }}
      >
        <strong>{aliasMutation.isPending ? draft : alias}</strong>
      </span>
      {cellError && (
        <div style={{ fontSize: "0.72rem", color: "var(--error-color)", marginTop: 3 }}>
          ⚠ {cellError}
        </div>
      )}
    </td>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
interface Props {
  selectedGroupId: string | null;
  selectedGroup: GrupoInfo | undefined;
  groupsData: GrupoInfo[] | undefined;
  isFetching: boolean;
  onSelectGroup: (id: string) => void;
  uuidByAlias: Record<string, Record<string, string>>;
  setUuidByAlias: Dispatch<SetStateAction<Record<string, Record<string, string>>>>;
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
      <div style={{ display: "block", marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 16 }}>👥 Alumnos</h2>
        {selectedGroup && (
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {selectedGroup.nombre_grupo} — {selectedGroup.total_estudiantes} alumno{selectedGroup.total_estudiantes !== 1 ? "s" : ""}
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
                      <AliasCell
                        alias={row.alias_alumno}
                        uuid={uuid}
                        groupId={selectedGroupId!}
                      />
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
                      <td className="mono" style={{ fontSize: "0.78rem", color: "var(--forest-warm)" }}>
                        {uuid ? uuid.slice(0, 8) : "—"}
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
