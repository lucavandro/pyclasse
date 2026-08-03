import { expect, test, type Page } from "@playwright/test";

const teacher = {
  name: "Docente E2E",
  email: "docente-e2e@pyclasse.test",
  password: "E2e-password-2026!",
};
const student = {
  name: "Studente E2E",
  email: "studente-e2e@pyclasse.test",
  password: "E2e-password-2026!",
};
const classCode = "E2E2026";

async function register(page: Page, account: typeof teacher) {
  await page.goto("/");
  await page.getByRole("button", { name: "Crea account" }).click();
  await page.getByLabel("Nome completo").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Registrati" }).click();
  await expect(
    page.getByRole("heading", { name: `Ciao, ${account.name}` }),
  ).toBeVisible();
}

async function login(page: Page, account: typeof teacher) {
  await page.goto("/");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(
    page.getByRole("heading", { name: `Ciao, ${account.name}` }),
  ).toBeVisible();
}

test.describe.serial("flusso applicativo con dati Supabase", () => {
  test("un visitatore vede soltanto l'accesso, senza dati dimostrativi", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Bentornato" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continua con Google" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Codice via email" }).click();
    await expect(
      page.getByRole("button", { name: "Invia codice" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Password" }).click();
    await expect(page.getByText("Giulia Bianchi")).toHaveCount(0);
    await expect(page.getByText("Liceo Galilei")).toHaveCount(0);
  });

  test("il docente crea classe ed esercizio persistenti", async ({ page }) => {
    await register(page, teacher);
    await page.getByRole("button", { name: "Classi" }).click();
    await page.getByRole("button", { name: "Nuova classe" }).click();
    await page.getByLabel("Nome").fill("Classe E2E");
    await page.getByLabel("Materia").fill("Informatica");
    await page.getByLabel("Codice di iscrizione").fill(classCode);
    await page.getByRole("button", { name: "Salva classe" }).click();
    await expect(
      page.getByRole("heading", { name: "Classe E2E · Informatica" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Esercizi" }).click();
    await page.getByRole("button", { name: "Nuovo esercizio" }).click();
    await page
      .getByRole("textbox", { name: "Titolo", exact: true })
      .fill("Risposta universale");
    await page
      .getByLabel("Traccia Markdown")
      .fill(
        "## Obiettivo\nImplementa `answer()` in modo che restituisca **42**.",
      );
    await page
      .getByLabel("Link risorsa esterna")
      .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByLabel("Titolo risorsa").fill("Video introduttivo");
    await page
      .getByLabel("Codice iniziale")
      .fill("def answer():\n    return 42");
    await page.getByLabel("Tag").fill("funzioni, base, funzioni");
    await expect(page.getByLabel("Esercizio propedeutico")).toBeChecked();
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await page.getByLabel("Input test 1").fill("answer()");
    await page.getByLabel("Output test 1").fill("42");
    await page
      .getByRole("checkbox", { name: "Classe E2E", exact: true })
      .check();
    const gradingScale = page.getByLabel("Scala voto per Classe E2E");
    await expect(gradingScale).toHaveValue("");
    await gradingScale.selectOption("10");
    await expect(gradingScale).toHaveValue("10");
    await page.getByRole("button", { name: "Salva esercizio" }).click();
    await expect(page.getByText("Risposta universale")).toBeVisible();
    await expect(page.getByText("Voto /10")).toBeVisible();
    await page.getByLabel("Filtra per tag").selectOption("funzioni");
    await expect(page.getByText("Risposta universale")).toBeVisible();
    await page.getByRole("button", { name: "Impostazioni" }).click();
    const studioLink = page.getByRole("link", {
      name: "Apri amministrazione Supabase",
    });
    await expect(studioLink).toBeVisible();
    await expect(studioLink).toHaveAttribute("target", "_blank");
    await page.getByRole("button", { name: "Esci dall'account" }).click();
  });

  test("lo studente si iscrive, esegue i test e consegna", async ({ page }) => {
    await register(page, student);
    await page.getByRole("button", { name: "Classi" }).click();
    await page.getByLabel("Codice classe").fill(classCode);
    await page.getByRole("button", { name: "Unisciti" }).click();
    await expect(
      page.getByRole("heading", { name: "Classe E2E · Informatica" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Esercizi" }).click();
    await expect(page.getByText("#funzioni #base")).toBeVisible();
    await page.getByText("Risposta universale").click();
    await expect(
      page.getByRole("heading", { name: "Obiettivo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Video introduttivo" }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Test" }).click();
    await expect(page.getByText("1 test su 1 superati.")).toBeVisible({
      timeout: 45_000,
    });
    await page.getByRole("button", { name: "Consegna soluzione" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Soluzione consegnata",
    );
  });

  test("il docente monitora e modifica il codice dello studente in tempo reale", async ({
    browser,
  }) => {
    const studentContext = await browser.newContext({ locale: "it-IT" });
    const teacherContext = await browser.newContext({ locale: "it-IT" });
    const studentPage = await studentContext.newPage();
    const teacherPage = await teacherContext.newPage();
    await login(studentPage, student);
    await studentPage.getByRole("button", { name: "Esercizi" }).click();
    await studentPage.getByText("Risposta universale").click();
    await login(teacherPage, teacher);
    await teacherPage
      .getByRole("button", { name: "Report", exact: true })
      .click();
    await expect(
      teacherPage.getByRole("heading", {
        name: "Monitoraggio lavori in corso",
      }),
    ).toBeVisible();
    const liveCode = teacherPage.getByLabel(`Codice di ${student.name}`);
    await expect(liveCode).toContainText("return 42");
    await liveCode.fill("def answer():\n    return 43");
    await teacherPage
      .getByRole("button", { name: "Invia modifica allo studente" })
      .click();
    await expect(studentPage.locator(".cm-content")).toContainText(
      "return 43",
      { timeout: 20_000 },
    );
    await studentContext.close();
    await teacherContext.close();
  });

  test("il consenso IA viene persistito nel database", async ({ page }) => {
    await login(page, student);
    await page.getByRole("button", { name: "Impostazioni" }).click();
    await expect(
      page.getByRole("link", { name: "Apri amministrazione Supabase" }),
    ).toHaveCount(0);
    const consent = page.getByLabel(/Abilito volontariamente/);
    await consent.check();
    await page.getByRole("button", { name: "Salva impostazioni" }).click();
    await page.reload();
    await expect(consent).toBeChecked();
  });
});
