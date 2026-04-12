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

  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle", { timeout: 15000 });
  await expect(page.getByTestId("loading-feedback")).toContainText("Slice ready for San Francisco, CA.", {
    timeout: 15000
  });
  await expect(canvas).toHaveAttribute("data-active-camera", /camera$/i);
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

test("restarts from canvas Backspace but ignores editable Backspace while the player is typing", async ({ page }) => {
  await page.goto("/");

  const locationInput = page.getByTestId("location-input");

  await locationInput.fill(validLocationAliasQuery);
  await locationInput.press("Enter");

  const canvas = page.locator("canvas");

  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle", { timeout: 15000 });
  await expect(page.getByTestId("loading-feedback")).toContainText("Slice ready for San Francisco, CA.", {
    timeout: 15000
  });

  await canvas.click();
  await page.keyboard.down("w");
  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0"),
      {
        timeout: 5000
      }
    )
    .toBeGreaterThan(0.75);
  await page.keyboard.up("w");

  await page.keyboard.press("Backspace");
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
    .toBeGreaterThan(0.75);
  await page.keyboard.up("w");

  const distanceBeforeTyping = Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0");

  await locationInput.click();
  await locationInput.press("Backspace");

  await expect(page.getByTestId("loading-feedback")).toContainText("Slice ready for San Francisco, CA.");
  await expect(locationInput).not.toHaveValue("San Francisco, CA");
  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0"),
      {
        timeout: 1000
      }
    )
    .toBeGreaterThan(1);
});

test("persists settings across reload and applies density changes on recreated runs", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("open-settings").click();
  await page.getByTestId("settings-graphics-preset").selectOption("low");
  await page.getByTestId("settings-traffic-density").selectOption("low");
  await page.getByTestId("settings-pedestrian-density").selectOption("off");
  await page.getByTestId("apply-settings").click();

  const locationInput = page.getByTestId("location-input");

  await locationInput.fill(validLocationAliasQuery);
  await locationInput.press("Enter");

  const canvas = page.locator("canvas");

  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle", { timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-settings-graphics-preset", "low");
  await expect(canvas).toHaveAttribute("data-settings-traffic-density", "low");
  await expect(canvas).toHaveAttribute("data-settings-pedestrian-density", "off");

  const lowTrafficCount = Number((await canvas.getAttribute("data-traffic-vehicle-count")) ?? "0");
  const lowPedestrianCount = Number((await canvas.getAttribute("data-pedestrian-count")) ?? "0");

  await page.getByTestId("open-settings").click();
  await page.getByTestId("settings-graphics-preset").selectOption("high");
  await page.getByTestId("settings-traffic-density").selectOption("high");
  await page.getByTestId("settings-pedestrian-density").selectOption("high");
  await page.getByTestId("apply-settings").click();
  await page.getByTestId("restart-from-spawn").click();

  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle", { timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-settings-graphics-preset", "high");
  await expect(canvas).toHaveAttribute("data-settings-traffic-density", "high");
  await expect(canvas).toHaveAttribute("data-settings-pedestrian-density", "high");

  const highTrafficCount = Number((await canvas.getAttribute("data-traffic-vehicle-count")) ?? "0");
  const highPedestrianCount = Number((await canvas.getAttribute("data-pedestrian-count")) ?? "0");

  expect(highTrafficCount).toBeGreaterThan(lowTrafficCount);
  expect(highPedestrianCount).toBeGreaterThan(lowPedestrianCount);

  await page.reload();
  await page.getByTestId("open-settings").click();
  await expect(page.getByTestId("settings-graphics-preset")).toHaveValue("high");
  await expect(page.getByTestId("settings-traffic-density")).toHaveValue("high");
  await expect(page.getByTestId("settings-pedestrian-density")).toHaveValue("high");
});
