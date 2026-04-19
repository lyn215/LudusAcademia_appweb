from __future__ import annotations

from dataclasses import dataclass

import app as app_module


@dataclass
class FakeResponse:
    payload: dict

    def json(self) -> dict:
        return self.payload


class FakeClient:
    def __init__(self) -> None:
        self.calls = []

    def request(self, method: str, path: str, **kwargs):
        self.calls.append((method, path, kwargs))
        if path == "/docentes/codigos":
            return FakeResponse({"codigo_vinculacion": "LUDU42", "expira_el": "2099-01-01T00:00:00Z"})
        if path.startswith("/docentes/analitica/grupo/"):
            return FakeResponse(
                {
                    "id_grupo": 1,
                    "nombre_grupo": "5A Primaria",
                    "total_alumnos": 1,
                    "metricas": [],
                    "generado_el": "2026-04-16T00:00:00Z",
                }
            )
        if path == "/health":
            return FakeResponse({"estado": "ok", "version": "2.0.0", "entorno": "test"})
        raise AssertionError(f"Unexpected path: {path}")


def test_session_starts_unauthenticated():
    with app_module.app.test_client() as client:
        response = client.get("/api/auth/session")

    assert response.status_code == 200
    assert response.get_json() == {"authenticated": False, "user": None}


def test_login_sets_session(monkeypatch):
    monkeypatch.setattr(
        app_module,
        "sign_in_password",
        lambda email, password: {
            "access_token": "token123",
            "refresh_token": "refresh123",
            "expires_in": 3600,
            "user": {"id": "u1", "email": email},
        },
    )

    with app_module.app.test_client() as client:
        response = client.post("/api/auth/login", json={"email": "docente@colegio.edu", "password": "abc"})

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["authenticated"] is True
    assert payload["user"]["email"] == "docente@colegio.edu"


def test_generate_code_requires_session():
    with app_module.app.test_client() as client:
        response = client.post("/api/docentes/codigos", json={"id_grupo": 1, "horas_validez": 24})

    assert response.status_code == 401
    assert response.get_json()["detail"] == "Sesion expirada o no autenticada."


def test_generate_code_success_with_session(monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(app_module, "_client", lambda: fake)

    with app_module.app.test_client() as client:
        with client.session_transaction() as sess:
            sess["access_token"] = "token123"

        response = client.post("/api/docentes/codigos", json={"id_grupo": 1, "horas_validez": 24})

    assert response.status_code == 201
    assert response.get_json()["codigo_vinculacion"] == "LUDU42"

    method, path, kwargs = fake.calls[0]
    assert method == "POST"
    assert path == "/docentes/codigos"
    assert kwargs["token"] == "token123"


def test_analytics_success_with_session(monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(app_module, "_client", lambda: fake)

    with app_module.app.test_client() as client:
        with client.session_transaction() as sess:
            sess["access_token"] = "token123"

        response = client.get("/api/docentes/analitica/grupo/1?metrica=progreso")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["id_grupo"] == 1
    assert payload["metricas"] == []
