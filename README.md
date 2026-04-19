# Dashboard Docente - LudusAcademia+ v2 (Monolito)

Aplicación web unificada en un solo archivo: [app.py](app.py).

Backend y frontend corren juntos en Flask, sin separar proyectos para ejecución.

## Qué incluye

- Login docente con Supabase Auth
- Estado backend (`/v1/health`)
- Generación de código de vinculación
- Analítica por grupo
- Descarga PDF por alumno
- Manejo de errores `401`, `403`, `404`, `413`, `422`, `503`

## Archivo principal

- [app.py](app.py):
  - Servidor Flask
  - Sesión HTTP
  - Proxy/API client hacia LudusAcademia+ v2
  - UI integrada (HTML + CSS + JavaScript)

## Variables de entorno

Puedes definirlas en `.env` en la raíz, o en `backend/.env`.

- `FLASK_SECRET_KEY=change-me`
- `SESSION_COOKIE_SECURE=false`
- `API_BASE_URL=https://api-ludusacademia.onrender.com`
- `API_PREFIX=/v1`
- `SUPABASE_URL=https://TU_PROYECTO.supabase.co`
- `SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY`

## Ejecutar en un solo comando

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
python app.py
```

App disponible en `http://127.0.0.1:5000`.

## Pruebas (modo monolito)

```bash
cd backend
pip install -r requirements.txt
cd ..
pytest -q
```

Cobertura mínima incluida:

- sesión inicial sin autenticar
- login y persistencia de sesión
- protección de endpoints docentes sin sesión
- generación de código y analítica con sesión

## Notas

- Las carpetas `backend/` y `frontend/` anteriores pueden mantenerse como referencia, pero ya no son necesarias para correr la app unificada.
- Si quieres, en un siguiente paso puedo limpiar el repositorio para dejar solo el modo monolítico.
