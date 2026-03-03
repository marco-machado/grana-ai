import { test, expect } from "@playwright/test";

test.describe.serial("Sources CRUD", () => {

  test("empty state shows disabled sources form with warning", async ({ page }) => {
    await page.goto("/sources");

    const sourcesCard = page.getByRole("heading", { name: "Fontes", exact: true }).locator("..");

    await expect(sourcesCard.getByLabel("Nome")).toBeDisabled();
    await expect(sourcesCard.getByLabel("Tipo")).toBeDisabled();
    await expect(sourcesCard.getByLabel("Identificador")).toBeDisabled();
    await expect(sourcesCard.getByLabel("Conta")).toBeDisabled();
    await expect(
      sourcesCard.getByText("Cadastre uma conta bancária antes de adicionar fontes.")
    ).toBeVisible();
  });

  test("create account shows in list and enables sources form", async ({ page }) => {
    await page.goto("/sources");

    const accountsCard = page
      .getByRole("heading", { name: "Contas Bancárias" })
      .locator("..");

    await accountsCard.getByLabel("Nome").fill("Nubank");
    await accountsCard.getByLabel("Tipo").selectOption("CHECKING");
    await accountsCard.getByRole("button", { name: "Adicionar" }).click();

    await expect(accountsCard.getByText("Nubank", { exact: true })).toBeVisible();

    const sourcesCard = page.getByRole("heading", { name: "Fontes", exact: true }).locator("..");
    await expect(sourcesCard.getByLabel("Nome")).toBeEnabled();
    await expect(sourcesCard.getByLabel("Conta")).toContainText("Nubank");
  });

  test("create source shows in list", async ({ page }) => {
    await page.goto("/sources");

    const sourcesCard = page.getByRole("heading", { name: "Fontes", exact: true }).locator("..");

    await sourcesCard.getByLabel("Nome").fill("Email Nubank");
    await sourcesCard.getByLabel("Tipo").selectOption("EMAIL");
    await sourcesCard.getByLabel("Identificador").fill("extrato@nubank.com.br");
    await sourcesCard.getByLabel("Conta").selectOption({ label: "Nubank" });
    await sourcesCard.getByRole("button", { name: "Adicionar" }).click();

    await expect(sourcesCard.getByText("Email Nubank")).toBeVisible();
    await expect(sourcesCard.getByText("extrato@nubank.com.br")).toBeVisible();
  });

  test("edit account name propagates to source and dropdown", async ({ page }) => {
    await page.goto("/sources");

    const accountsCard = page
      .getByRole("heading", { name: "Contas Bancárias" })
      .locator("..");

    await accountsCard.getByRole("button", { name: "Editar" }).click();

    const editForm = accountsCard.locator("form").filter({ hasText: "Salvar" });
    await editForm.getByRole("textbox").clear();
    await editForm.getByRole("textbox").fill("Nubank PF");
    await editForm.getByRole("button", { name: "Salvar" }).click();

    await expect(accountsCard.getByText("Nubank PF", { exact: true })).toBeVisible();

    const sourcesCard = page.getByRole("heading", { name: "Fontes", exact: true }).locator("..");
    await expect(sourcesCard.locator(".text-gray-400", { hasText: "Nubank PF" })).toBeVisible();
    await expect(sourcesCard.getByLabel("Conta")).toContainText("Nubank PF");
  });

  test("delete account with linked source shows 409 error", async ({ page }) => {
    await page.goto("/sources");

    const accountsCard = page
      .getByRole("heading", { name: "Contas Bancárias" })
      .locator("..");

    await accountsCard.getByRole("button", { name: /Excluir Nubank PF/ }).click();

    await expect(accountsCard.getByText("Não é possível excluir a conta")).toBeVisible();
    await expect(accountsCard.getByText("Nubank PF", { exact: true })).toBeVisible();
  });

  test("delete source returns to empty state", async ({ page }) => {
    await page.goto("/sources");

    const sourcesCard = page.getByRole("heading", { name: "Fontes", exact: true }).locator("..");

    await sourcesCard.getByRole("button", { name: "Excluir" }).click();

    await expect(sourcesCard.getByText("Nenhuma fonte cadastrada")).toBeVisible();
  });

  test("delete account disables sources form again", async ({ page }) => {
    await page.goto("/sources");

    const accountsCard = page
      .getByRole("heading", { name: "Contas Bancárias" })
      .locator("..");

    await accountsCard.getByRole("button", { name: /Excluir Nubank PF/ }).click();

    await expect(accountsCard.getByText("Nenhuma conta cadastrada")).toBeVisible();

    const sourcesCard = page.getByRole("heading", { name: "Fontes", exact: true }).locator("..");
    await expect(sourcesCard.getByLabel("Nome")).toBeDisabled();
    await expect(
      sourcesCard.getByText("Cadastre uma conta bancária antes de adicionar fontes.")
    ).toBeVisible();
  });
});
