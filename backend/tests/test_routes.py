from app import create_app


def test_session_starts_unauthenticated():
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        response = client.get("/api/auth/session")
        payload = response.get_json()

    assert response.status_code == 200
    assert payload["authenticated"] is False
