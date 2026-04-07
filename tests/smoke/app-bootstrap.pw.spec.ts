import { expect, test } from "@playwright/test";
import {
  unresolvableLocationQuery,
  validLocationAliasQuery
} from "../fixtures/location-queries";

test("boots to the location shell and reaches a slice-ready world after a valid submission", async ({
  page
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Enter a real-world location" })).toBeVisible();

  const locationInput = page.getByTestId("location-input");

  await locationInput.fill(validLocationAliasQuery);
  await locationInput.press("Enter");

  await expect(page.getByTestId("loading-feedback")).toContainText("Slice ready for San Francisco, CA.");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("edit-location")).toBeVisible();
});

test("shows a recoverable error for an unresolvable query", async ({ page }) => {
  await page.goto("/");

  const locationInput = page.getByTestId("location-input");

  await locationInput.fill(unresolvableLocationQuery);
  await locationInput.press("Enter");

  await expect(page.getByTestId("error-message")).toContainText("could not be resolved");
  await expect(locationInput).toHaveValue(unresolvableLocationQuery);
  await expect(page.locator(".primary-action")).toHaveText("Try Again");
});
