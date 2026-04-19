import { test, expect } from "@playwright/test";

test("flujo feliz docente", async ({ page }) => {
  let authenticated = false;

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        authenticated
          ? { authenticated: true, user: { id: "u1", email: "docente@colegio.edu" } }
          : { authenticated: false, user: null }
      ),
    });
  });

  await page.route("**/api/auth/login", async (route) => {
    authenticated = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, user: { id: "u1", email: "docente@colegio.edu" } }),
    });
  });

  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ estado: "ok", version: "2.0.0", entorno: "production" }),
    });
  });

  await page.route("**/api/docentes/codigos", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ codigo_vinculacion: "LUDU42", expira_el: "2099-01-01T00:00:00Z" }),
    });
  });

  await page.route("**/api/docentes/analitica/grupo/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id_grupo: 1,
        nombre_grupo: "5A Primaria",
        total_alumnos: 1,
        metricas: [
          {
            alias_alumno: "Alumno 1",
            uuid_estudiante: "550e8400-e29b-41d4-a716-446655440000",
            misiones_completas: 12,
            promedio_errores: 1.75,
            monedas_totales: 340,
            ultima_actividad: "2026-04-15T09:10:00Z",
          },
        ],
        generado_el: "2026-04-15T12:00:00Z",
      }),
    });
  });

  await page.route("**/api/docentes/reportes/pdf/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "%PDF-1.4 mock-pdf",
    });
  });

  await page.goto("/");

  await page.getByPlaceholder("docente@colegio.edu").fill("docente@colegio.edu");
  await page.getByPlaceholder("Contrasena").fill("secreto123");
  await page.getByRole("button", { name: "Iniciar sesion" }).click();

  await expect(page.getByText("Panel docente operativo")).toBeVisible();

  await page.getByRole("button", { name: "Generar" }).click();
  await expect(page.getByText("LUDU42")).toBeVisible();

  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByText("Alumno 1")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("reporte-");
});
