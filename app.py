from __future__ import annotations

import os
import json
import base64
from dataclasses import dataclass
from datetime import timedelta
from io import BytesIO
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, render_template_string, request, send_file, session
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv()
load_dotenv("backend/.env")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=12)

API_BASE_URL = os.getenv("API_BASE_URL", "https://api-ludusacademia.onrender.com")
API_PREFIX = os.getenv("API_PREFIX", "/v1")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")


class LudusApiError(Exception):
    def __init__(self, status_code: int, body: Any):
        self.status_code = status_code
        self.body = body
        super().__init__(str(body))


class SupabaseAuthError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


@dataclass
class LudusApiClient:
    base_url: str
    prefix: str

    def __post_init__(self) -> None:
        self.session = requests.Session()
        retries = Retry(
            total=2,
            backoff_factor=0.4,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods={"GET", "POST"},
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        json_body: dict | None = None,
        params: dict | None = None,
        stream: bool = False,
    ) -> requests.Response:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = self.session.request(
            method,
            f"{self.base_url}{self.prefix}{path}",
            headers=headers,
            json=json_body,
            params=params,
            timeout=30,
            stream=stream,
        )

        if response.status_code >= 400:
            try:
                body: Any = response.json()
            except ValueError:
                body = {"detail": response.text or "Error inesperado."}
            raise LudusApiError(response.status_code, body)

        return response


def sign_in_password(email: str, password: str) -> dict:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise SupabaseAuthError(500, "Credenciales de Supabase no configuradas.")

    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=20,
    )

    if response.status_code >= 400:
        detail = "Credenciales invalidas."
        try:
            body = response.json()
            detail = body.get("msg") or body.get("error_description") or body.get("error") or detail
        except ValueError:
            pass
        raise SupabaseAuthError(response.status_code, detail)

    return response.json()


def _client() -> LudusApiClient:
    return LudusApiClient(base_url=API_BASE_URL, prefix=API_PREFIX)


def _require_auth() -> str:
    token = session.get("access_token")
    if not token:
        raise LudusApiError(401, {"detail": "Sesion expirada o no autenticada."})
    return str(token)


def _json_error(status: int, detail: str, extra: dict | None = None) -> Response:
    payload: dict[str, Any] = {"detail": detail}
    if extra:
        payload.update(extra)
    return jsonify(payload), status


def _decode_jwt_part(part: str) -> dict[str, Any]:
    # Decode JWT parts without signature verification for diagnostics only.
    padded = part + "=" * (-len(part) % 4)
    raw = base64.urlsafe_b64decode(padded.encode("utf-8"))
    return json.loads(raw.decode("utf-8"))


def _token_diagnostics(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) < 2:
        return {"error": "Token con formato invalido."}

    try:
        header = _decode_jwt_part(parts[0])
        payload = _decode_jwt_part(parts[1])
    except Exception:
        return {"error": "No se pudo decodificar el token."}

    return {
        "alg": header.get("alg"),
        "kid": header.get("kid"),
        "iss": payload.get("iss"),
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "aud": payload.get("aud"),
        "role": payload.get("role"),
        "exp": payload.get("exp"),
    }


@app.errorhandler(LudusApiError)
def _handle_ludus_error(err: LudusApiError):
    if isinstance(err.body, dict):
        return jsonify(err.body), err.status_code
    return _json_error(err.status_code, str(err.body))


@app.errorhandler(SupabaseAuthError)
def _handle_supabase_error(err: SupabaseAuthError):
    return _json_error(err.status_code, err.detail)


@app.errorhandler(Exception)
def _handle_exception(_: Exception):
    return _json_error(503, "Error interno. Reintenta en 15 minutos.", {"retry_after_seconds": 900})


@app.get("/")
def index():
    return render_template_string(
        """
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LudusAcademia+ Dashboard Docente</title>
  <style>
    :root {
      --bg: #f1f5f7;
      --surface: #ffffff;
      --text: #16232b;
      --muted: #5f717a;
      --primary: #0a6d77;
      --primary-2: #0a9396;
      --warning: #b45309;
      --danger: #b42318;
      --border: #d6e1e5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 100% 0%, #c8ece4 0%, transparent 42%),
        radial-gradient(circle at 0% 100%, #ffe3b7 0%, transparent 40%),
        var(--bg);
    }
    .shell { max-width: 1100px; margin: 0 auto; padding: 20px 14px 40px; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px;
      box-shadow: 0 6px 20px rgba(10, 30, 40, 0.08);
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; }
    .stack { display: grid; gap: 10px; }
    .field { width: 100%; min-width: 120px; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .btn { border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
    .btn-primary { background: linear-gradient(120deg, var(--primary), var(--primary-2)); color: #fff; }
    .btn-secondary { background: #fff; border: 1px solid var(--primary); color: var(--primary); }
    .btn-ghost { background: transparent; color: var(--muted); }
    .alert { margin: 0 0 12px; padding: 10px; border: 1px solid #f1c3b8; border-radius: 10px; color: var(--danger); background: #fff1ed; }
    .muted { color: var(--muted); }
    .hidden { display: none !important; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border-bottom: 1px solid var(--border); padding: 10px 8px; text-align: left; vertical-align: top; }
    .table-wrap { overflow-x: auto; }
    .pill { display: inline-block; padding: 4px 8px; border-radius: 99px; background: #e9f6f5; color: var(--primary); }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .top { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section id="alerts"></section>

    <section id="loginCard" class="card" style="max-width: 440px; margin: 40px auto;">
      <h1>Dashboard Docente</h1>
      <p class="muted">Inicia sesion con tu cuenta docente de Supabase.</p>
      <form id="loginForm" class="stack" style="margin-top: 12px;">
        <input class="field" type="email" name="email" placeholder="docente@colegio.edu" required />
        <input class="field" type="password" name="password" placeholder="Contrasena" required />
        <button class="btn btn-primary" type="submit">Iniciar sesion</button>
      </form>
    </section>

    <section id="dashboard" class="hidden">
      <header class="top">
        <div>
          <h1>LudusAcademia+ v2</h1>
          <p class="muted">Panel docente operativo</p>
        </div>
        <div class="row" style="align-items:center;">
          <span id="userEmail" class="pill"></span>
          <button id="logoutBtn" class="btn btn-secondary">Salir</button>
        </div>
      </header>

      <article class="card" style="margin-bottom: 14px;">
        <h3>Diagnostico rapido</h3>
        <p class="muted" id="debugBox">Cargando diagnostico de token...</p>
      </article>

      <section class="grid">
        <article class="card">
          <h3>Estado backend</h3>
          <div id="healthBox" class="muted" style="margin-top: 8px;">Cargando estado...</div>
          <button id="refreshHealthBtn" class="btn btn-ghost" style="margin-top: 8px;">Refrescar</button>
        </article>

        <article class="card">
          <h3>Generar codigo de vinculacion</h3>
          <div class="row" style="margin-top: 8px;">
            <input class="field" id="idGrupoInput" type="number" min="1" value="1" placeholder="ID grupo" />
            <input class="field" id="horasValidezInput" type="number" min="1" max="168" value="24" placeholder="Horas" />
            <button id="generateCodeBtn" class="btn btn-primary">Generar</button>
          </div>
          <div id="codeResult" class="hidden" style="margin-top: 12px; padding: 10px; border-radius: 10px; border:1px solid #f3d390; background:#fff8e8;">
            <div><strong id="generatedCode"></strong></div>
            <div class="muted">Expira en <span id="countdown">00:00:00</span></div>
            <button id="copyCodeBtn" class="btn btn-secondary" style="margin-top: 8px;">Copiar codigo</button>
          </div>
        </article>
      </section>

      <article class="card">
        <h3>Analitica por grupo</h3>
        <div class="row" style="margin-top: 8px;">
          <input class="field" id="analyticsGroupInput" type="number" min="1" value="1" placeholder="ID grupo" />
          <select class="field" id="metricInput">
            <option value="progreso">Progreso</option>
            <option value="errores">Errores</option>
          </select>
          <button id="loadAnalyticsBtn" class="btn btn-primary">Consultar</button>
        </div>
        <div id="analyticsEmpty" class="muted hidden" style="margin-top: 10px;">Sin actividad para este grupo.</div>
        <div class="table-wrap">
          <table id="analyticsTable" class="hidden">
            <thead>
              <tr>
                <th>Alias</th>
                <th>Misiones</th>
                <th>Promedio errores</th>
                <th>Monedas</th>
                <th>Ultima actividad</th>
                <th>UUID alumno</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody id="analyticsBody"></tbody>
          </table>
        </div>
      </article>
    </section>
  </main>

  <script>
    const ui = {
      alerts: document.getElementById("alerts"),
      loginCard: document.getElementById("loginCard"),
      dashboard: document.getElementById("dashboard"),
      loginForm: document.getElementById("loginForm"),
      logoutBtn: document.getElementById("logoutBtn"),
      userEmail: document.getElementById("userEmail"),
      healthBox: document.getElementById("healthBox"),
      refreshHealthBtn: document.getElementById("refreshHealthBtn"),
      idGrupoInput: document.getElementById("idGrupoInput"),
      horasValidezInput: document.getElementById("horasValidezInput"),
      generateCodeBtn: document.getElementById("generateCodeBtn"),
      codeResult: document.getElementById("codeResult"),
      generatedCode: document.getElementById("generatedCode"),
      countdown: document.getElementById("countdown"),
      copyCodeBtn: document.getElementById("copyCodeBtn"),
      analyticsGroupInput: document.getElementById("analyticsGroupInput"),
      metricInput: document.getElementById("metricInput"),
      loadAnalyticsBtn: document.getElementById("loadAnalyticsBtn"),
      analyticsEmpty: document.getElementById("analyticsEmpty"),
      analyticsTable: document.getElementById("analyticsTable"),
      analyticsBody: document.getElementById("analyticsBody"),
      debugBox: document.getElementById("debugBox"),
    };

    let expiresAt = null;

    function showError(message) {
      const box = document.createElement("div");
      box.className = "alert";
      box.textContent = message;
      ui.alerts.prepend(box);
      setTimeout(() => box.remove(), 6000);
    }

    function mapError(status, body) {
      const detail = body && body.detail ? body.detail : "Error inesperado.";
      if (status === 401) {
        if (detail === "Sesion expirada o no autenticada.") {
          return "401 (sesion local): no hay token en la sesion de Flask. Inicia sesion de nuevo.";
        }
        return `401 (API): ${detail}`;
      }
      if (status === 403) return `403 (API): ${detail}`;
      if (status === 404) return "Recurso no encontrado.";
      if (status === 413) return "El payload excede el limite permitido.";
      if (status === 422) return detail;
      if (status === 503) return detail;
      return detail;
    }

    async function http(path, options = {}) {
      const res = await fetch(path, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        credentials: "same-origin",
        ...options,
      });

      if (!res.ok) {
        let body = null;
        try { body = await res.json(); } catch (_) { body = null; }
        throw { status: res.status, body };
      }

      return res;
    }

    function toggleAuth(authenticated, user) {
      ui.loginCard.classList.toggle("hidden", authenticated);
      ui.dashboard.classList.toggle("hidden", !authenticated);
      ui.userEmail.textContent = (user && user.email) || "";
    }

    function formatDate(iso) {
      return new Date(iso).toLocaleString();
    }

    function tickCountdown() {
      if (!expiresAt) return;
      const secs = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      const h = String(Math.floor(secs / 3600)).padStart(2, "0");
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      ui.countdown.textContent = `${h}:${m}:${s}`;
    }

    async function loadSession() {
      try {
        const res = await http("/api/auth/session", { method: "GET" });
        const data = await res.json();
        toggleAuth(Boolean(data.authenticated), data.user);
        if (data.authenticated) {
          await Promise.all([loadHealth(), loadTokenDiagnostics()]);
        }
      } catch (err) {
        showError("No se pudo verificar la sesion.");
      }
    }

    async function loadTokenDiagnostics() {
      ui.debugBox.textContent = "Cargando diagnostico de token...";
      try {
        const res = await http("/api/debug/token", { method: "GET" });
        const data = await res.json();
        if (!data.authenticated) {
          ui.debugBox.textContent = "No hay sesion activa.";
          return;
        }
        if (data.token && data.token.error) {
          ui.debugBox.textContent = `Token no decodificable: ${data.token.error}`;
          return;
        }
        const t = data.token || {};
        ui.debugBox.innerHTML = `
          <div><strong>alg:</strong> ${t.alg || "-"}</div>
          <div><strong>iss:</strong> ${t.iss || "-"}</div>
          <div><strong>sub:</strong> ${t.sub || "-"}</div>
          <div><strong>email:</strong> ${t.email || "-"}</div>
          <div><strong>role:</strong> ${t.role || "-"}</div>
        `;
      } catch (err) {
        ui.debugBox.textContent = "No se pudo cargar diagnostico de token.";
      }
    }

    async function loadHealth() {
      ui.healthBox.textContent = "Cargando estado...";
      try {
        const res = await http("/api/health", { method: "GET" });
        const data = await res.json();
        ui.healthBox.innerHTML = `
          <div>Estado: <strong>${data.estado}</strong></div>
          <div>Version: ${data.version}</div>
          <div>Entorno: ${data.entorno}</div>
        `;
      } catch (err) {
        const msg = mapError(err.status || 500, err.body || {});
        ui.healthBox.textContent = "No se pudo consultar health.";
        showError(msg);
      }
    }

    ui.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(ui.loginForm);
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "").trim();
      if (!email || !password) {
        showError("Email y password son obligatorios.");
        return;
      }

      try {
        await http("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        await loadSession();
      } catch (err) {
        showError(mapError(err.status || 500, err.body || {}));
      }
    });

    ui.logoutBtn.addEventListener("click", async () => {
      try {
        await http("/api/auth/logout", { method: "POST" });
      } catch (_) {}
      toggleAuth(false, null);
    });

    ui.refreshHealthBtn.addEventListener("click", loadHealth);

    ui.generateCodeBtn.addEventListener("click", async () => {
      const id_grupo = Number(ui.idGrupoInput.value || "0");
      const horas_validez = Number(ui.horasValidezInput.value || "0");

      if (!Number.isInteger(id_grupo) || id_grupo <= 0) {
        showError("id_grupo debe ser un entero positivo.");
        return;
      }
      if (!Number.isInteger(horas_validez) || horas_validez < 1 || horas_validez > 168) {
        showError("horas_validez debe estar entre 1 y 168.");
        return;
      }

      try {
        const res = await http("/api/docentes/codigos", {
          method: "POST",
          body: JSON.stringify({ id_grupo, horas_validez }),
        });
        const data = await res.json();
        ui.generatedCode.textContent = data.codigo_vinculacion;
        expiresAt = data.expira_el;
        tickCountdown();
        ui.codeResult.classList.remove("hidden");
      } catch (err) {
        showError(mapError(err.status || 500, err.body || {}));
      }
    });

    ui.copyCodeBtn.addEventListener("click", async () => {
      const txt = ui.generatedCode.textContent || "";
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
      } catch (_) {
        showError("No se pudo copiar al portapapeles.");
      }
    });

    ui.loadAnalyticsBtn.addEventListener("click", async () => {
      const id_grupo = Number(ui.analyticsGroupInput.value || "0");
      const metrica = String(ui.metricInput.value || "progreso");

      if (!Number.isInteger(id_grupo) || id_grupo <= 0) {
        showError("id_grupo debe ser un entero positivo.");
        return;
      }

      ui.analyticsBody.innerHTML = "";
      ui.analyticsEmpty.classList.add("hidden");
      ui.analyticsTable.classList.add("hidden");

      try {
        const res = await http(`/api/docentes/analitica/grupo/${id_grupo}?metrica=${encodeURIComponent(metrica)}`, {
          method: "GET",
        });
        const data = await res.json();
        const rows = Array.isArray(data.metricas) ? data.metricas : [];

        if (rows.length === 0) {
          ui.analyticsEmpty.classList.remove("hidden");
          return;
        }

        for (const row of rows) {
          const tr = document.createElement("tr");
          const uuid = row.uuid_estudiante || "";
          tr.innerHTML = `
            <td>${row.alias_alumno || ""}</td>
            <td>${row.misiones_completas ?? 0}</td>
            <td>${Number(row.promedio_errores || 0).toFixed(2)}</td>
            <td>${row.monedas_totales ?? 0}</td>
            <td>${formatDate(row.ultima_actividad)}</td>
            <td><input class="field uuid-input" value="${uuid}" placeholder="UUID" /></td>
            <td><button class="btn btn-secondary pdf-btn">PDF</button></td>
          `;

          tr.querySelector(".pdf-btn").addEventListener("click", async () => {
            const uuidInput = tr.querySelector(".uuid-input");
            const uuidValue = String(uuidInput.value || "").trim();
            if (!uuidValue) {
              showError("Ingresa UUID de alumno para descargar PDF.");
              return;
            }
            try {
              const pdfRes = await http(`/api/docentes/reportes/pdf/${encodeURIComponent(uuidValue)}`, { method: "GET" });
              const blob = await pdfRes.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `reporte-${uuidValue}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              showError(mapError(err.status || 500, err.body || {}));
            }
          });

          ui.analyticsBody.appendChild(tr);
        }

        ui.analyticsTable.classList.remove("hidden");
      } catch (err) {
        showError(mapError(err.status || 500, err.body || {}));
      }
    });

    setInterval(tickCountdown, 1000);
    loadSession();
  </script>
</body>
</html>
        """
    )


@app.get("/api/health")
def api_health():
    response = _client().request("GET", "/health")
    return jsonify(response.json())


@app.post("/api/auth/login")
def api_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", "")).strip()

    if not email or not password:
        return _json_error(422, "Email y password son obligatorios.")

    auth = sign_in_password(email=email, password=password)

    session.permanent = True
    session["access_token"] = auth.get("access_token")
    session["refresh_token"] = auth.get("refresh_token")
    session["expires_in"] = auth.get("expires_in")
    session["user"] = auth.get("user") or {}

    return jsonify(
        {
            "authenticated": True,
            "user": {
                "id": (session.get("user") or {}).get("id"),
                "email": (session.get("user") or {}).get("email", email),
            },
        }
    )


@app.post("/api/auth/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/auth/session")
def api_session():
    token = session.get("access_token")
    if not token:
        return jsonify({"authenticated": False, "user": None})

    user = session.get("user") or {}
    return jsonify(
        {
            "authenticated": True,
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
            },
        }
    )


@app.post("/api/docentes/codigos")
def api_docentes_codigos():
    token = _require_auth()
    data = request.get_json(silent=True) or {}

    id_grupo = data.get("id_grupo")
    horas_validez = data.get("horas_validez")

    if not isinstance(id_grupo, int) or id_grupo <= 0:
        return _json_error(422, "id_grupo debe ser un entero positivo.")
    if not isinstance(horas_validez, int) or horas_validez < 1 or horas_validez > 168:
        return _json_error(422, "horas_validez debe estar entre 1 y 168.")

    response = _client().request(
        "POST",
        "/docentes/codigos",
        token=token,
        json_body={"id_grupo": id_grupo, "horas_validez": horas_validez},
    )
    return jsonify(response.json()), 201


@app.get("/api/docentes/analitica/grupo/<int:id_grupo>")
def api_docentes_analitica(id_grupo: int):
    token = _require_auth()
    metrica = request.args.get("metrica")
    params = {"metrica": metrica} if metrica else None

    response = _client().request(
        "GET",
        f"/docentes/analitica/grupo/{id_grupo}",
        token=token,
        params=params,
    )
    return jsonify(response.json())


@app.get("/api/docentes/reportes/pdf/<string:uuid_estudiante>")
def api_docentes_pdf(uuid_estudiante: str):
    token = _require_auth()
    response = _client().request(
        "GET",
        f"/docentes/reportes/pdf/{uuid_estudiante}",
        token=token,
        stream=True,
    )

    return send_file(
        BytesIO(response.content),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"reporte-{uuid_estudiante}.pdf",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
