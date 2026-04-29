import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { InputField } from "../components/Field";
import { createLinkCode } from "../features/codes/api";
import { formatCountdown, secondsUntil } from "../utils/time";
import type { GrupoInfo } from "../types/contracts";

const STORAGE_KEY = "ludus_ultimo_codigo";

interface StoredCode {
  codigo: string;
  expira_el: string;
  id_grupo: number;
}

interface Props {
  selectedGroupId: number | null;
  selectedGroup: GrupoInfo | undefined;
  groupsData: GrupoInfo[] | undefined;
  isFetching: boolean;
  onSelectGroup: (id: number) => void;
}

export function VinculacionPage({
  selectedGroupId, selectedGroup, groupsData, isFetching, onSelectGroup,
}: Props) {
  const [horasValidez, setHorasValidez] = useState(24);
  const [codeError, setCodeError] = useState("");
  const [activeCode, setActiveCode] = useState<StoredCode | null>(null);
  const [tick, setTick] = useState(0);

  // Load from localStorage once groups are available; validate ownership
  useEffect(() => {
    if (!groupsData) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: StoredCode = JSON.parse(raw);
      if (!groupsData.some((g) => g.id_grupo === parsed.id_grupo)) {
        localStorage.removeItem(STORAGE_KEY);
        setActiveCode(null);
        return;
      }
      setActiveCode(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [groupsData]);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const codeMutation = useMutation({
    mutationFn: createLinkCode,
    onSuccess: (data) => {
      setCodeError("");
      const stored: StoredCode = {
        codigo:    data.codigo_vinculacion,
        expira_el: data.expira_el,
        id_grupo:  selectedGroupId!,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setActiveCode(stored);
    },
    onError: (e: any) => setCodeError(e?.message ?? "Error generando código"),
  });

  const countdown = useMemo(() => {
    if (!activeCode?.expira_el) return null;
    return secondsUntil(activeCode.expira_el);
  }, [activeCode, tick]);

  const countdownDisplay = useMemo(() => countdown !== null ? formatCountdown(countdown) : null, [countdown]);
  const isExpired = countdown !== null && countdown <= 0;

  return (
    <div>
      <div style={{ display: "block", marginBottom: 24 }}>
        <h2 className="page-title" style={{ marginBottom: 16 }}>🔗 Vinculación</h2>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>Genera el código LUDUXX para que tus alumnos se conecten a la app.</p>
      </div>

      {/* Group selector */}
      <div className="card mb-16">
        <h3 className="mb-12">Grupo activo</h3>
        {groupsData && groupsData.length > 0 ? (
          <>
            <div className="group-chips">
              {groupsData.map((grupo) => (
                <button key={grupo.id_grupo}
                  className={`group-chip${selectedGroupId === grupo.id_grupo ? " group-chip--active" : ""}${isFetching ? " group-chip--updating" : ""}`}
                  onClick={() => onSelectGroup(grupo.id_grupo)}>
                  <span className="chip-name">{grupo.nombre_grupo}</span>
                  <span className="chip-count">
                    {grupo.total_alumnos} alumno{grupo.total_alumnos !== 1 ? "s" : ""} · ID {grupo.id_grupo}
                  </span>
                </button>
              ))}
            </div>
            {isFetching && (
              <p style={{ fontSize: "0.72rem", color: "var(--forest-warm)", marginTop: 8, fontFamily: "'DM Mono',monospace" }}>
                actualizando...
              </p>
            )}
          </>
        ) : (
          <p style={{ color: "var(--forest-warm)" }}>No hay grupos disponibles.</p>
        )}
      </div>

      {/* Code generator */}
      <div className="card">
        <h3 className="mb-4">Generar código</h3>
        <p className="mb-16" style={{ marginBottom: 20 }}>
          {selectedGroup
            ? <>Para: <strong style={{ color: "var(--text-light)" }}>{selectedGroup.nombre_grupo}</strong></>
            : "Selecciona un grupo arriba para continuar."}
        </p>

        {codeError && <div className="alert">⚠ {codeError}</div>}

        {selectedGroup ? (
          <>
            <div className="row mb-16">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Horas de validez</label>
                <InputField
                  type="number" min={1} max={168} value={horasValidez}
                  onChange={(e) => setHorasValidez(Number(e.target.value))}
                />
              </div>
              <Button
                onClick={() => codeMutation.mutate({ id_grupo: selectedGroup.id_grupo, horas_validez: horasValidez })}
                disabled={codeMutation.isPending}
              >
                {codeMutation.isPending ? "Generando..." : "Generar Código"}
              </Button>
            </div>

            {activeCode && (
              <div className="code-display">
                <div className="code-chars">{activeCode.codigo}</div>
                <div className={`code-expiry${isExpired ? " expired" : (countdown !== null && countdown < 3600 ? " expiring" : "")}`}>
                  {isExpired
                    ? "⚠ Código expirado — genera uno nuevo"
                    : `Expira en ${countdownDisplay || "—"}`}
                </div>
                {!isExpired && (
                  <Button variant="secondary"
                    onClick={() => navigator.clipboard.writeText(activeCode.codigo)}>
                    Copiar código
                  </Button>
                )}
              </div>
            )}

            {!activeCode && (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <div className="empty-state-icon">🔑</div>
                <h4>Pulsa "Generar Código" para crear un nuevo código</h4>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👆</div>
            <h4>Sin grupo seleccionado</h4>
          </div>
        )}
      </div>
    </div>
  );
}
