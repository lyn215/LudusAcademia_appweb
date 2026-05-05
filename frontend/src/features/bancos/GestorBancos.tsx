import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { asignarBanco, desasignarBanco, getBancos, getBancosAsignados } from "./api";
import type { BancoPreguntas } from "../../types/contracts";

interface GestorBancosProps {
  grupo_id: string;
}

export function GestorBancos({ grupo_id }: GestorBancosProps) {
  const queryClient = useQueryClient();

  const bancosQuery = useQuery({
    queryKey: ["bancos"],
    queryFn: getBancos,
    retry: 1,
  });

  const asignadosQuery = useQuery({
    queryKey: ["bancosAsignados", grupo_id],
    queryFn: () => getBancosAsignados(grupo_id),
    enabled: Boolean(grupo_id),
    retry: 1,
  });

  // Radio state: at most 1 banco active at a time
  const [asignados, setAsignados] = useState<string[]>([]);

  useEffect(() => {
    if (asignadosQuery.data) setAsignados(asignadosQuery.data);
  }, [asignadosQuery.data]);

  const asignarMutation = useMutation({
    mutationFn: ({ banco_id, grupo_id: gid }: { banco_id: string; grupo_id: string }) =>
      asignarBanco(banco_id, gid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bancosAsignados", grupo_id] }),
  });

  const desasignarMutation = useMutation({
    mutationFn: ({ banco_id, grupo_id: gid }: { banco_id: string; grupo_id: string }) =>
      desasignarBanco(banco_id, gid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bancosAsignados", grupo_id] }),
  });

  const isMutating = asignarMutation.isPending || desasignarMutation.isPending;

  const handleToggle = (banco_id: string) => {
    if (isMutating) return;
    const isActive = asignados.includes(banco_id);
    if (isActive) {
      // Deactivate currently active banco
      setAsignados([]);
      desasignarMutation.mutate({ banco_id, grupo_id });
    } else {
      // Radio: activate only this banco, deactivate any other
      setAsignados([banco_id]);
      asignarMutation.mutate({ banco_id, grupo_id });
    }
  };

  if (bancosQuery.isLoading || asignadosQuery.isLoading) {
    return (
      <p style={{ color: "var(--forest-warm)", fontFamily: "'DM Mono',monospace", fontSize: "0.85rem", marginTop: 24 }}>
        Cargando bancos de preguntas...
      </p>
    );
  }

  if (bancosQuery.error) {
    return <div className="alert">⚠ Error al cargar bancos de preguntas</div>;
  }

  const bancos: BancoPreguntas[] = bancosQuery.data ?? [];

  if (bancos.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 48 }}>
        <div className="empty-state-icon">📚</div>
        <h4>No hay bancos de preguntas disponibles</h4>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {bancos.map((banco) => {
        const isActive = asignados.includes(banco.id);
        return (
          <div
            key={banco.id}
            className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-between"
          >
            {/* Header: nombre + toggle */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {banco.nombre}
                </h3>

                {/* Animated iOS-style switch */}
                <button
                  role="switch"
                  aria-checked={isActive}
                  aria-label={`${isActive ? "Desactivar" : "Activar"} ${banco.nombre}`}
                  disabled={isMutating}
                  onClick={() => handleToggle(banco.id)}
                  className={[
                    "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full",
                    "transition-colors duration-200 focus:outline-none disabled:opacity-50 cursor-pointer",
                    isActive ? "bg-emerald-500" : "bg-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200",
                      isActive ? "translate-x-5" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-500">Materia</span>
                  <p className="text-sm font-medium text-slate-200">{banco.materia}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-500">Nivel/Grado</span>
                  <p className="text-sm font-medium text-slate-200">{banco.nivel_grado}</p>
                </div>
                {banco.descripcion && (
                  <div>
                    <span className="text-xs uppercase tracking-wide text-slate-500">Descripción</span>
                    <p className="text-sm text-slate-400">{banco.descripcion}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer: question count + active badge */}
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {banco.total_preguntas ?? 0} pregunta{(banco.total_preguntas ?? 0) !== 1 ? "s" : ""}
              </span>
              {isActive && (
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  ✓ Activo
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
