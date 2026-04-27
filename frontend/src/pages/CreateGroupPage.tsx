import type { FormEvent } from "react";
import { Button } from "../components/Button";
import { InputField } from "../components/Field";

interface Props {
  noGroups: boolean;
  groupError: string;
  newGroupName: string;
  setNewGroupName: (n: string) => void;
  newGroupSchool: string;
  setNewGroupSchool: (s: string) => void;
  createGroupMutation: { isPending: boolean };
  setGroupError: (e: string) => void;
  setShowCreateGroup: (v: boolean) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function CreateGroupPage({
  noGroups, groupError, newGroupName, setNewGroupName,
  newGroupSchool, setNewGroupSchool, createGroupMutation,
  setGroupError, setShowCreateGroup, onSubmit,
}: Props) {
  return (
    <div className="onboard-wrap">
      <div className="onboard-card fade-up">
        <div className="onboard-icon">🏫</div>
        <h2 className="mb-8">{noGroups ? "Crear mi primer grupo" : "Nuevo grupo escolar"}</h2>
        <p className="mb-24">Ingresa el nombre del salón y la institución educativa.</p>
        {groupError && <div className="alert mb-16">⚠ {groupError}</div>}
        <form onSubmit={onSubmit} className="stack">
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
