import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBancos, asignarBanco, desasignarBanco } from "./api";
import { Button } from "../../components/Button";
import type { BancoPreguntas, AsignacionBanco } from "../../types/contracts";

interface GestorBancosProps {
  grupo_id: string;
}

export function GestorBancos({ grupo_id }: GestorBancosProps) {
  const [asignados, setAsignados] = useState<Set<string>>(new Set());

  const { data: bancos, isLoading, error, refetch } = useQuery({
    queryKey: ["bancos"],
    queryFn: getBancos,
  });

  const handleToggle = async (banco_id: string, checked: boolean) => {
    const asignacion: AsignacionBanco = { banco_id, grupo_id };
    if (checked) {
      await asignarBanco(asignacion);
      setAsignados(prev => new Set(prev).add(banco_id));
    } else {
      await desasignarBanco(asignacion);
      setAsignados(prev => {
        const newSet = new Set(prev);
        newSet.delete(banco_id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bancos-container">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="banco-card skeleton">
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-switch"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bancos-container">
        <div className="error-message">
          Error al cargar bancos: {error.message}
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (!bancos || bancos.length === 0) {
    return (
      <div className="bancos-container">
        <div className="no-bancos">No hay bancos disponibles</div>
      </div>
    );
  }

  return (
    <div className="bancos-container">
      {bancos.map((banco) => (
        <div key={banco.id} className="banco-card">
          <h3>{banco.nombre}</h3>
          <p><strong>Materia:</strong> {banco.materia}</p>
          <p><strong>Nivel/Grado:</strong> {banco.nivel_grado}</p>
          <p><strong>Descripción:</strong> {banco.descripcion || "Sin descripción"}</p>
          <p><strong>Preguntas:</strong> {banco.total_preguntas ?? 0}</p>
          <label className="switch">
            <input
              type="checkbox"
              checked={asignados.has(banco.id)}
              onChange={(e) => handleToggle(banco.id, e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      ))}
    </div>
  );
}