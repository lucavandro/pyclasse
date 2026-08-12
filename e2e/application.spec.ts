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
    await expect(
      page.getByRole("heading", { name: "Stato delle consegne" }),
    ).toBeVisible();
    await expect(page.getByText("DATI DELLE CONSEGNE")).toBeVisible();
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
    await expect(page.locator(".prerequisite-control")).toContainText(
      "finché lo studente non consegna",
    );
    await expect(page.locator(".verification-card")).toHaveCount(2);
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
    await expect(page.getByText("Classe E2E", { exact: true })).toBeVisible();
    await expect(page.getByText("Voto /10")).toHaveCount(0);
    await page.getByLabel("Cerca esercizio per nome").fill("universale");
    await expect(page.getByText("Risposta universale")).toBeVisible();
    await page.getByLabel("Cerca esercizio per nome").fill("");
    await page.getByLabel("Filtra per tag").selectOption("funzioni");
    await expect(page.getByText("Risposta universale")).toBeVisible();
    await page.getByRole("button", { name: "Impostazioni" }).click();
    const studioLink = page.getByRole("link", {
      name: "Apri amministrazione Supabase",
    });
    await expect(studioLink).toBeVisible();
    await expect(studioLink).toHaveAttribute("target", "_blank");
    const loginBranding = page.getByRole("group", {
      name: "Testi della pagina di accesso",
    });
    await loginBranding
      .getByRole("textbox", { name: "Titolo (italiano)", exact: true })
      .fill("Impara Python con Classe E2E");
    await loginBranding
      .getByRole("textbox", {
        name: "Sottotitolo (italiano)",
        exact: true,
      })
      .fill("Un ambiente personalizzato dal docente per la propria classe.");
    await expect(
      loginBranding.getByRole("textbox", {
        name: "Sottotitolo (italiano)",
      }),
    ).toHaveAttribute("maxlength", "240");
    const administration = page.locator(".administration-settings");
    await expect(administration).toContainText("Amministrazione tecnica");
    await expect(
      administration.getByRole("link", {
        name: "Apri amministrazione Supabase",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Salva impostazioni" }).click();
    await page.getByRole("button", { name: "Esci dall'account" }).click();
    await expect(
      page.getByRole("heading", { name: "Impara Python con Classe E2E" }),
    ).toBeVisible();
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
    await expect(page.getByText("#funzioni", { exact: true })).toBeVisible();
    await expect(page.getByText("#base", { exact: true })).toBeVisible();
    await expect(page.locator(".student-task-deadline")).toBeVisible();
    await expect(page.locator(".student-task-grading")).toContainText(
      "Voto in decimi",
    );
    await page.getByRole("button", { name: "Inizia", exact: true }).click();
    await expect(page).toHaveURL(/\/exercises\/[0-9a-f-]+$/i);
    await expect(
      page.getByRole("heading", { name: "Obiettivo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Video introduttivo" }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("tab", { name: "Editor e codice" }).click();
    await expect(page).toHaveURL(/\/exercises\/[0-9a-f-]+\/editor$/i);
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Obiettivo" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/exercises\/[0-9a-f-]+$/i);
    await page.getByRole("tab", { name: "Editor e codice" }).click();
    const studentCode = page.locator(".cm-content");
    await studentCode.fill("def answer():\n    return 42");
    await page.waitForTimeout(2_200);
    await expect(studentCode).toContainText("return 42");
    await page.getByRole("button", { name: "Test" }).click();
    await expect(page.getByText("1 test su 1 superati.")).toBeVisible({
      timeout: 45_000,
    });
    await page.getByRole("button", { name: "Consegna soluzione" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Soluzione consegnata",
    );
    await page.getByRole("button", { name: "Report", exact: true }).click();
    const studentReport = page.locator(".student-report-table");
    await expect(
      studentReport.getByText(student.name, { exact: true }),
    ).toHaveCount(0);
    await expect(
      studentReport.getByText("Azioni", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Non ancora assegnato")).toBeVisible();
  });

  test("Code now condivide il codice docente e scarica Python", async ({
    browser,
  }) => {
    const teacherContext = await browser.newContext({ locale: "it-IT" });
    const studentContext = await browser.newContext({ locale: "it-IT" });
    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();
    await login(teacherPage, teacher);
    await teacherPage.getByRole("button", { name: "Code now" }).click();
    await teacherPage
      .getByLabel("Editor Code now")
      .fill('print("codice condiviso dal docente")');
    await expect(
      teacherPage.getByText("Codice docente disponibile agli studenti"),
    ).toBeVisible();
    await login(studentPage, student);
    await studentPage.getByRole("button", { name: "Code now" }).click();
    await studentPage
      .getByRole("button", { name: "Copia codice prof" })
      .click();
    await expect(studentPage.getByLabel("Editor Code now")).toContainText(
      "codice condiviso dal docente",
    );
    await expect(
      studentPage.getByRole("button", { name: "Run" }),
    ).toBeVisible();
    const downloadEvent = studentPage.waitForEvent("download");
    await studentPage.getByRole("button", { name: "Scarica .py" }).click();
    expect((await downloadEvent).suggestedFilename()).toBe("code-now.py");
    await studentPage
      .getByLabel("Editor Code now")
      .fill('nome = input("Nome? ")\nprint("Ciao", nome)');
    await studentPage.getByRole("button", { name: "Run" }).click();
    await expect(studentPage.getByLabel("Valore per input Python")).toBeVisible(
      {
        timeout: 45_000,
      },
    );
    await studentPage.getByLabel("Valore per input Python").fill("Luca");
    await studentPage.getByRole("button", { name: "Invia" }).click();
    await expect(studentPage.locator(".code-now-console")).toContainText(
      "Ciao Luca",
      { timeout: 45_000 },
    );
    await teacherContext.close();
    await studentContext.close();
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
    await studentPage.getByRole("tab", { name: "Consegnati 1" }).click();
    await studentPage
      .getByRole("button", { name: "Rivedi consegna", exact: true })
      .click();
    await studentPage.getByRole("tab", { name: "Editor e codice" }).click();
    await studentPage
      .getByLabel("Editor Python")
      .fill("def answer():\n    return 42\n# revisione in corso");
    await studentPage.waitForTimeout(1_000);
    await login(teacherPage, teacher);
    await teacherPage
      .getByRole("button", { name: "Report", exact: true })
      .click();
    await expect(teacherPage).toHaveURL(/\/reports\/valutazioni$/);
    await expect(
      teacherPage.getByRole("heading", { name: "Stato delle consegne" }),
    ).toHaveCount(0);
    await teacherPage.getByRole("button", { name: /Avanzamento/ }).click();
    await expect(teacherPage).toHaveURL(/\/reports\/avanzamento$/);
    await expect(
      teacherPage
        .locator(".delivery-summary-table")
        .getByText("Classe E2E", { exact: true }),
    ).toBeVisible();
    await teacherPage.setViewportSize({ width: 390, height: 844 });
    await expect(teacherPage.locator(".sidebar")).toHaveCSS(
      "position",
      "fixed",
    );
    await expect(teacherPage.locator(".sidebar")).not.toBeInViewport();
    await teacherPage.getByRole("button", { name: "Apri menu" }).click();
    await expect(teacherPage.locator(".sidebar")).toBeInViewport();
    await expect(
      teacherPage
        .getByRole("navigation", { name: "Navigazione principale" })
        .getByText("Report", { exact: true }),
    ).toBeVisible();
    await teacherPage.getByRole("button", { name: "Chiudi menu" }).click();
    await expect(teacherPage.locator(".sidebar")).not.toBeInViewport();
    await expect(
      teacherPage.locator(".delivery-summary-table .table-head"),
    ).toBeHidden();
    await expect(
      teacherPage.locator(".delivery-summary-table .table-row").nth(1),
    ).toBeVisible();
    await expect(
      teacherPage.getByRole("navigation", { name: "Sezioni report" }),
    ).toBeVisible();
    await teacherPage.setViewportSize({ width: 1280, height: 900 });
    await teacherPage.goBack();
    await expect(teacherPage).toHaveURL(/\/reports\/valutazioni$/);
    await expect(
      teacherPage
        .locator(".teacher-report-table")
        .getByText("Risposta universale", { exact: true }),
    ).toHaveCount(0);
    await expect(
      teacherPage.getByLabel("Cerca studente o esercizio"),
    ).toBeVisible();
    await expect(
      teacherPage.getByLabel("Filtra report per classe"),
    ).toBeVisible();
    await expect(
      teacherPage.getByLabel("Filtra report per stato"),
    ).toBeVisible();
    await teacherPage.getByRole("button", { name: "Comprimi menu" }).click();
    await expect(teacherPage.locator("main.app-shell")).toHaveClass(
      /sidebar-collapsed/,
    );
    await teacherPage.getByRole("button", { name: "Espandi menu" }).click();
    await teacherPage
      .getByRole("button", { name: "Monitoraggio", exact: true })
      .click();
    await expect(
      teacherPage.getByLabel("Filtra monitoraggio per classe"),
    ).toBeVisible();
    await expect(
      teacherPage.getByLabel("Filtra monitoraggio per attività"),
    ).toBeVisible();
    await expect(
      teacherPage.getByRole("heading", {
        name: "Monitoraggio lavori in corso",
      }),
    ).toBeVisible();
    await expect(
      teacherPage.getByRole("article").getByText("Editor aperto ora"),
    ).toBeVisible();
    await expect(
      teacherPage.getByRole("article").getByText("Risposta universale"),
    ).toBeVisible();
    await teacherPage
      .getByLabel("Filtra monitoraggio per attività")
      .selectOption("active");
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
    await studentPage.getByRole("button", { name: "Classi" }).click();
    await teacherPage
      .getByLabel("Filtra monitoraggio per attività")
      .selectOption("inactive");
    await expect(
      teacherPage.getByRole("article").getByText("Lavoro aperto, non attivo"),
    ).toBeVisible({ timeout: 35_000 });
    await studentContext.close();
    await teacherContext.close();
  });

  test("il consenso IA viene persistito nel database", async ({ page }) => {
    await login(page, student);
    await page.getByRole("button", { name: "Impostazioni" }).click();
    await expect(
      page.getByRole("link", { name: "Apri amministrazione Supabase" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Language")).toBeVisible();
    const consent = page.getByLabel("Consenti l’invio di dati a Puter");
    await page
      .getByText("Consenti l’invio di dati a Puter", { exact: true })
      .click();
    await expect(consent).toBeChecked();
    await page.getByRole("button", { name: "Salva impostazioni" }).click();
    await page.reload();
    await expect(consent).toBeChecked();
  });
});
