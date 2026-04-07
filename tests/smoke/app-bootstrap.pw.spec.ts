import { expect, test } from "@playwright/test";
import {
  unresolvableLocationQuery,
  validLocationAliasQuery
} from "../fixtures/location-queries";

test("boots to the location shell and advances into loading feedback after a valid submission", async ({
  page
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Enter a real-world location" })).toBeVisible();

  const locationInput = page.getByTestId("location-input");

  await locationInput.fill(validLocationAliasQuery);
  await locationInput.press("Enter");

  await expect(page.getByTestId("loading-feedback")).toContainText("San Francisco, CA");
  await expect(page.locator(".primary-action")).toBeDisabled();
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
