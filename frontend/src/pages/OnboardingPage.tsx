import { Button } from "../components/Button";

interface Props {
  groupError: string;
  setGroupError: (e: string) => void;
  setShowCreateGroup: (v: boolean) => void;
  logoutMutation: { mutate: () => void };
}

export function OnboardingPage({ groupError, setGroupError, setShowCreateGroup, logoutMutation }: Props) {
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
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--forest-warm)", fontSize: "0.8rem" }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
