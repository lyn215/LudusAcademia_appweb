import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  asignarBanco,
  desasignarBanco,
  fetchBancos,
  fetchBancosAsignados,
} from "../features/bancos/api";

interface Props {
  grupoId: string;
}

export function GestorBancos({ grupoId }: Props) {
  const queryClient = useQueryClient();

  const bancosQuery = useQuery({
    queryKey: ["bancos"],
    queryFn: fetchBancos,
    retry: 1,
  });

  const asignadosQuery = useQuery({
    queryKey: ["bancos-asignados", grupoId],
    queryFn: () => fetchBancosAsignados(grupoId),
    enabled: !!grupoId,
    retry: 1,
  });

  // Local state mirrors remote; at most 1 banco active (radio logic)
  const [asignados, setAsignados] = useState<string[]>([]);

  useEffect(() => {
    if (asignadosQuery.data) setAsignados(asignadosQuery.data);
  }, [asignadosQuery.data]);

  const asignarMutation = useMutation({
    mutationFn: ({ gid, bid }: { gid: string; bid: string }) =>
      asignarBanco(gid, bid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bancos-asignados", grupoId] }),
  });

  const desasignarMutation = useMutation({
    mutationFn: ({ bid, gid }: { bid: string; gid: string }) =>
      desasignarBanco(bid, gid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bancos-asignados", grupoId] }),
  });

  const isMutating = asignarMutation.isPending || desasignarMutation.isPending;

  const handleToggle = (bancoId: string) => {
    if (isMutating) return;
    const isActive = asignados.includes(bancoId);
    if (isActive) {
      // Deactivate current banco
      setAsignados([]);
      desasignarMutation.mutate({ bid: bancoId, gid: grupoId });
    } else {
      // Radio: activate only this one
      setAsignados([bancoId]);
      asignarMutation.mutate({ gid: grupoId, bid: bancoId });
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
    return <div className="alert">⚠ Error cargando bancos de preguntas</div>;
  }

  const bancos = bancosQuery.data ?? [];

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
                  <span className="text-xs uppercase tracking-wide text-slate-500">Nivel</span>
                  <p className="text-sm font-medium text-slate-200">{banco.nivel}</p>
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
                {banco.total_preguntas} pregunta{banco.total_preguntas !== 1 ? "s" : ""}
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
