import type { FormEvent } from "react";
import { Button } from "../components/Button";
import { InputField } from "../components/Field";

interface Props {
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  authError: string;
  setAuthError: (e: string) => void;
  emailConfirmPending: boolean;
  setEmailConfirmPending: (p: boolean) => void;
  loginMutation: { isPending: boolean };
  registerMutation: { isPending: boolean };
  onLogin: (e: FormEvent<HTMLFormElement>) => void;
  onRegister: (e: FormEvent<HTMLFormElement>) => void;
}

export function LoginPage({
  authMode, setAuthMode, authError, setAuthError,
  emailConfirmPending, setEmailConfirmPending,
  loginMutation, registerMutation, onLogin, onRegister,
}: Props) {
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
