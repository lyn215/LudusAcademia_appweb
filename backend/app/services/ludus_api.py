from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class LudusApiError(Exception):
    def __init__(self, status_code: int, body: Any):
        self.status_code = status_code
        self.body = body
        super().__init__(str(body))


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
        url = f"{self.base_url}{self.prefix}{path}"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = self.session.request(
            method,
            url,
            headers=headers,
            json=json_body,
            params=params,
            timeout=30,
            stream=stream,
        )

        if response.status_code >= 400:
            try:
                payload: Any = response.json()
            except ValueError:
                payload = {"detail": response.text or "Error inesperado"}
            raise LudusApiError(response.status_code, payload)

        return response
