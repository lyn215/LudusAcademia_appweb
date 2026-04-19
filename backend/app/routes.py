from __future__ import annotations

from io import BytesIO
from typing import Callable, TypeVar

from flask import Blueprint, Response, current_app, jsonify, request, send_file, session

from .services.ludus_api import LudusApiClient, LudusApiError
from .services.supabase_auth import SupabaseAuthError, SupabaseAuthService


api_bp = Blueprint("api", __name__)
F = TypeVar("F", bound=Callable)


def _ludus_client() -> LudusApiClient:
    return LudusApiClient(
        base_url=current_app.config["API_BASE_URL"],
        prefix=current_app.config["API_PREFIX"],
    )


def _supabase_auth_service() -> SupabaseAuthService:
    return SupabaseAuthService(
        supabase_url=current_app.config["SUPABASE_URL"],
        anon_key=current_app.config["SUPABASE_ANON_KEY"],
    )


def _require_auth() -> str:
    token = session.get("access_token")
    if not token:
        raise LudusApiError(401, {"detail": "Sesion expirada o no autenticada."})
    return token


def _json_error(status: int, detail: str, extra: dict | None = None) -> Response:
    body = {"detail": detail}
    if extra:
        body.update(extra)
    return jsonify(body), status


@api_bp.errorhandler(LudusApiError)
def handle_ludus_error(err: LudusApiError):
    if isinstance(err.body, dict):
        return jsonify(err.body), err.status_code
    return _json_error(err.status_code, str(err.body))


@api_bp.errorhandler(SupabaseAuthError)
def handle_supabase_error(err: SupabaseAuthError):
    return _json_error(err.status_code, err.detail)


@api_bp.errorhandler(Exception)
def handle_unexpected_error(_: Exception):
    return _json_error(
        503,
        "Error interno. Reintenta en 15 minutos.",
        {"retry_after_seconds": 900},
    )


@api_bp.get("/api/health")
def health_check():
    response = _ludus_client().request("GET", "/health")
    return jsonify(response.json())


@api_bp.post("/api/auth/register")
def register_docente():
    data = request.get_json(silent=True) or {}
    email    = str(data.get("email",    "")).strip()
    password = str(data.get("password", "")).strip()

    if not email or not password:
        return _json_error(422, "Email y password son obligatorios.")
    if len(password) < 6:
        return _json_error(422, "La contraseña debe tener al menos 6 caracteres.")

    auth_result = _supabase_auth_service().sign_up(email=email, password=password)

    # Supabase puede devolver un usuario sin sesión si tiene confirmación de email activada
    access_token = auth_result.get("access_token")
    user         = auth_result.get("user") or {}

    if access_token:
        # Confirmación de email desactivada → sesión inmediata
        session.permanent          = True
        session["access_token"]    = access_token
        session["refresh_token"]   = auth_result.get("refresh_token")
        session["user"]            = user
        return jsonify({
            "authenticated": True,
            "email_confirmation_required": False,
            "user": {"id": user.get("id"), "email": user.get("email", email)},
        }), 201
    else:
        # Confirmación de email activada → avisar al usuario
        return jsonify({
            "authenticated": False,
            "email_confirmation_required": True,
            "user": {"id": user.get("id"), "email": user.get("email", email)},
        }), 201


@api_bp.post("/api/auth/login")
def login_docente():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", "")).strip()

    if not email or not password:
        return _json_error(422, "Email y password son obligatorios.")

    auth_result = _supabase_auth_service().sign_in_password(email=email, password=password)

    session.permanent = True
    session["access_token"] = auth_result.get("access_token")
    session["refresh_token"] = auth_result.get("refresh_token")
    session["expires_in"] = auth_result.get("expires_in")
    session["user"] = auth_result.get("user") or {}

    return jsonify(
        {
            "authenticated": True,
            "user": {
                "id": (session["user"] or {}).get("id"),
                "email": (session["user"] or {}).get("email", email),
            },
        }
    )


@api_bp.post("/api/auth/logout")
def logout_docente():
    session.clear()
    return jsonify({"ok": True})


@api_bp.get("/api/auth/session")
def session_status():
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


@api_bp.post("/api/docentes/codigos")
def create_link_code():
    token = _require_auth()
    data = request.get_json(silent=True) or {}

    id_grupo = data.get("id_grupo")
    horas_validez = data.get("horas_validez")

    if not isinstance(id_grupo, int) or id_grupo <= 0:
        return _json_error(422, "id_grupo debe ser un entero positivo.")
    if not isinstance(horas_validez, int) or horas_validez < 1 or horas_validez > 168:
        return _json_error(422, "horas_validez debe estar entre 1 y 168.")

    response = _ludus_client().request(
        "POST",
        "/docentes/codigos",
        token=token,
        json_body={"id_grupo": id_grupo, "horas_validez": horas_validez},
    )
    return jsonify(response.json()), 201


@api_bp.get("/api/docentes/grupos")
def list_groups():
    token = _require_auth()
    response = _ludus_client().request("GET", "/docentes/grupos", token=token)
    return jsonify(response.json())


@api_bp.post("/api/docentes/grupos")
def create_group():
    token = _require_auth()
    data = request.get_json(silent=True) or {}

    nombre_grupo   = str(data.get("nombre_grupo",  "")).strip()
    nombre_escuela = str(data.get("nombre_escuela", "")).strip()

    if not nombre_grupo:
        return _json_error(422, "nombre_grupo es obligatorio.")
    if not nombre_escuela:
        return _json_error(422, "nombre_escuela es obligatorio.")

    response = _ludus_client().request(
        "POST",
        "/docentes/grupos",
        token=token,
        json_body={"nombre_grupo": nombre_grupo, "nombre_escuela": nombre_escuela},
    )
    return jsonify(response.json()), 201


@api_bp.get("/api/docentes/analitica/grupo/<int:id_grupo>")
def group_analytics(id_grupo: int):
    token = _require_auth()
    metrica = request.args.get("metrica")
    params = {"metrica": metrica} if metrica else None

    response = _ludus_client().request(
        "GET",
        f"/docentes/analitica/grupo/{id_grupo}",
        token=token,
        params=params,
    )
    return jsonify(response.json())


@api_bp.get("/api/docentes/reportes/pdf/<string:uuid_estudiante>")
def download_student_pdf(uuid_estudiante: str):
    token = _require_auth()
    response = _ludus_client().request(
        "GET",
        f"/docentes/reportes/pdf/{uuid_estudiante}",
        token=token,
        stream=True,
    )

    content = response.content
    filename = f"reporte-{uuid_estudiante}.pdf"

    return send_file(
        BytesIO(content),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )
