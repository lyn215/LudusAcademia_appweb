from __future__ import annotations

from dataclasses import dataclass

import requests


class SupabaseAuthError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


@dataclass
class SupabaseAuthService:
    supabase_url: str
    anon_key: str

    def sign_in_password(self, email: str, password: str) -> dict:
        if not self.supabase_url or not self.anon_key:
            raise SupabaseAuthError(500, "Credenciales de Supabase no configuradas en el backend.")

        url = f"{self.supabase_url}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": self.anon_key,
            "Content-Type": "application/json",
        }
        payload = {"email": email, "password": password}

        response = requests.post(url, headers=headers, json=payload, timeout=20)

        if response.status_code >= 400:
            detail = "Credenciales inválidas."
            try:
                body = response.json()
                detail = body.get("msg") or body.get("error_description") or body.get("error") or detail
            except ValueError:
                pass
            raise SupabaseAuthError(response.status_code, detail)

        return response.json()

    def sign_up(self, email: str, password: str) -> dict:
        if not self.supabase_url or not self.anon_key:
            raise SupabaseAuthError(500, "Credenciales de Supabase no configuradas en el backend.")

        url = f"{self.supabase_url}/auth/v1/signup"
        headers = {
            "apikey": self.anon_key,
            "Content-Type": "application/json",
        }
        payload = {"email": email, "password": password}

        response = requests.post(url, headers=headers, json=payload, timeout=20)

        if response.status_code >= 400:
            detail = "No se pudo crear la cuenta."
            try:
                body = response.json()
                detail = body.get("msg") or body.get("error_description") or body.get("error") or detail
            except ValueError:
                pass
            raise SupabaseAuthError(response.status_code, detail)

        return response.json()
