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

  const canvas = page.locator("canvas");

  await expect(page.getByTestId("loading-feedback")).toContainText("Slice ready for San Francisco, CA.");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle");
  await expect(canvas).toHaveAttribute("data-active-camera", /Camera$/);
  await expect(canvas).toHaveAttribute("data-starter-vehicle-id", /starter-vehicle-/);

  const startingDistance = Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0");

  await canvas.click();
  await page.keyboard.down("w");
  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0"),
      {
        timeout: 5000
      }
    )
    .toBeGreaterThan(startingDistance + 0.5);
  await page.keyboard.up("w");

  await expect(page.getByTestId("edit-location")).toBeVisible();

  await page.getByTestId("restart-from-spawn").click();
  await expect(page.getByTestId("loading-feedback")).toContainText("Slice ready for San Francisco, CA.");
  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle");

  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0"),
      {
        timeout: 5000
      }
    )
    .toBeLessThan(0.25);

  await canvas.click();
  await page.keyboard.down("w");
  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0"),
      {
        timeout: 5000
      }
    )
    .toBeGreaterThan(0.5);
  await page.keyboard.up("w");
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
