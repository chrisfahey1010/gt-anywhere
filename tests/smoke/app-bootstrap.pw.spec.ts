import { expect, test } from "@playwright/test";
import {
  unresolvableLocationQuery,
  validLocationAliasQuery
} from "../fixtures/location-queries";

function normalizePublicBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;

  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function resolvePublicPath(relativePath: string): string {
  const publicBasePath = normalizePublicBasePath(process?.env.GT_PUBLIC_BASE);
  const normalizedRelativePath = relativePath.replace(/^\/+/, "");

  return publicBasePath === "/" ? `/${normalizedRelativePath}` : `${publicBasePath}${normalizedRelativePath}`;
}

test("boots to the location shell and reaches a slice-ready world after a valid submission", async ({
  page,
  browserName
}) => {
  const requestCounts = new Map<string, number>();
  const presetsPath = resolvePublicPath("data/world-gen/location-presets.json");
  const tuningPathPrefix = resolvePublicPath("data/tuning/");

  page.on("requestfinished", (request) => {
    const { pathname } = new URL(request.url());

    if (pathname === presetsPath || pathname.startsWith(tuningPathPrefix)) {
      requestCounts.set(pathname, (requestCounts.get(pathname) ?? 0) + 1);
    }
  });

  await page.goto("./");

  await expect(page.getByRole("heading", { name: "Enter a real-world location" })).toBeVisible();

  const locationInput = page.getByTestId("location-input");
  const renderHost = page.getByTestId("render-host");

  await expect(renderHost).toHaveAttribute("data-browser-family", browserName);
  await expect(renderHost).toHaveAttribute("data-browser-support-tier", /supported|degraded/);
  await expect(renderHost).toHaveAttribute("data-browser-webgl2-available", "true");
  await expect(renderHost).toHaveAttribute("data-shell-ready-at-ms", /\d+\.\d+/);
  await expect(renderHost).toHaveAttribute("data-app-name", "GT Anywhere");
  await expect(renderHost).toHaveAttribute("data-app-version", /\d+\.\d+\.\d+/);

  const appVersion = await renderHost.getAttribute("data-app-version");

  expect(appVersion).toMatch(/\d+\.\d+\.\d+/);

  if (!appVersion) {
    throw new Error("Expected release metadata app version to be present.");
  }

  await expect(renderHost).toHaveAttribute(
    "data-release-id",
    new RegExp(appVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );
  await expect(page.getByTestId("release-build-info")).toContainText(appVersion);

  await locationInput.fill(validLocationAliasQuery);
  await locationInput.press("Enter");

  const canvas = page.locator("canvas");

  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-browser-family", browserName);
  await expect(canvas).toHaveAttribute("data-browser-support-tier", /supported|degraded/);
  await expect(canvas).toHaveAttribute("data-browser-webgl2-available", "true");
  await expect(canvas).toHaveAttribute("data-graphics-browser-family", browserName);
  await expect(canvas).toHaveAttribute("data-app-name", "GT Anywhere");
  await expect(canvas).toHaveAttribute("data-app-version", appVersion);
  await expect(canvas).toHaveAttribute(
    "data-release-id",
    new RegExp(appVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );
  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle", { timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-graphics-fog-density", /\d+\.\d{4}/);
  await expect(canvas).toHaveAttribute("data-visual-palette-sky-color", /#[0-9a-f]{6}/i);
  await expect(canvas).toHaveAttribute("data-audio-profile", /low|medium|high/);
  await expect(page.getByTestId("loading-feedback")).toContainText("Slice ready for San Francisco, CA.", {
    timeout: 15000
  });
  await expect(canvas).toHaveAttribute("data-active-camera", /camera$/i);
  await expect(canvas).toHaveAttribute("data-starter-vehicle-id", /starter-vehicle-/);
  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-performance-sample-count")) ?? "0"),
      {
        timeout: 15000
      }
    )
    .toBeGreaterThan(0);

  const initialFpsEstimate = Number((await canvas.getAttribute("data-performance-fps-estimate")) ?? "0");
  const initialFrameTimeP50Ms = Number((await canvas.getAttribute("data-performance-frame-time-p50-ms")) ?? "0");
  const initialFrameTimeP95Ms = Number((await canvas.getAttribute("data-performance-frame-time-p95-ms")) ?? "0");
  const shellReadyAtMs = Number((await renderHost.getAttribute("data-shell-ready-at-ms")) ?? "0");
  const manifestReadyAtMs = Number((await renderHost.getAttribute("data-world-manifest-ready-at-ms")) ?? "0");
  const sceneReadyAtMs = Number((await renderHost.getAttribute("data-world-scene-ready-at-ms")) ?? "0");
  const initialPresetRequests = requestCounts.get(presetsPath) ?? 0;
  const initialTuningRequests = [...requestCounts.entries()]
    .filter(([pathname]) => pathname.startsWith(tuningPathPrefix))
    .reduce((total, [, count]) => total + count, 0);

  expect(initialFpsEstimate).toBeGreaterThan(0);
  expect(initialFrameTimeP50Ms).toBeGreaterThan(0);
  expect(initialFrameTimeP95Ms).toBeGreaterThanOrEqual(initialFrameTimeP50Ms);
  expect(shellReadyAtMs).toBeGreaterThan(0);
  expect(manifestReadyAtMs).toBeGreaterThan(shellReadyAtMs);
  expect(sceneReadyAtMs).toBeGreaterThan(manifestReadyAtMs);
  expect(initialPresetRequests).toBe(1);
  expect(initialTuningRequests).toBeGreaterThan(0);

  await canvas.click();
  await expect.poll(async () => await canvas.getAttribute("data-audio-unlock-state")).toMatch(/unlocked|blocked|unsupported/);
  await expect(canvas).toHaveAttribute("data-audio-vehicle-presence", /none|sedan|sports-car|heavy-truck/);

  const startingDistance = Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0");

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
      async () => Number((await canvas.getAttribute("data-performance-sample-count")) ?? "0"),
      {
        timeout: 15000
      }
    )
    .toBeGreaterThan(0);

  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-starter-vehicle-distance")) ?? "0"),
      {
        timeout: 5000
      }
    )
    .toBeLessThan(0.25);
  expect(requestCounts.get(presetsPath) ?? 0).toBe(initialPresetRequests);
  expect(
    [...requestCounts.entries()]
      .filter(([pathname]) => pathname.startsWith(tuningPathPrefix))
      .reduce((total, [, count]) => total + count, 0)
  ).toBe(initialTuningRequests);
  expect(Number((await renderHost.getAttribute("data-world-manifest-ready-at-ms")) ?? "0")).toBeGreaterThan(
    manifestReadyAtMs
  );
  expect(Number((await renderHost.getAttribute("data-world-scene-ready-at-ms")) ?? "0")).toBeGreaterThan(sceneReadyAtMs);
  await expect(canvas).toHaveAttribute("data-audio-profile", /low|medium|high/);
  await expect(canvas).toHaveAttribute("data-audio-vehicle-presence", /none|sedan|sports-car|heavy-truck/);

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
  await page.goto("./");

  const locationInput = page.getByTestId("location-input");

  await locationInput.fill(unresolvableLocationQuery);
  await locationInput.press("Enter");

  await expect(page.getByTestId("error-message")).toContainText("could not be resolved");
  await expect(locationInput).toHaveValue(unresolvableLocationQuery);
  await expect(page.locator(".primary-action")).toHaveText("Try Again");
});

test("restarts from canvas Backspace but ignores editable Backspace while the player is typing", async ({ page }) => {
  await page.goto("./");

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

test("persists settings across reload and applies density changes on recreated runs", async ({ page, browserName }) => {
  await page.goto("./");

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
  await expect(canvas).toHaveAttribute("data-browser-family", browserName);
  await expect(canvas).toHaveAttribute("data-browser-support-tier", /supported|degraded/);
  await expect(canvas).toHaveAttribute("data-browser-webgl2-available", "true");
  await expect(canvas).toHaveAttribute("data-graphics-browser-family", browserName);
  await expect(canvas).toHaveAttribute("data-graphics-fog-density", "0.0000");
  await expect(canvas).toHaveAttribute("data-audio-profile", "low");
  await expect(canvas).toHaveAttribute("data-audio-ambience-enabled", "false");
  await expect(canvas).toHaveAttribute("data-settings-graphics-preset", "low");
  await expect(canvas).toHaveAttribute("data-settings-traffic-density", "low");
  await expect(canvas).toHaveAttribute("data-settings-pedestrian-density", "off");
  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-performance-sample-count")) ?? "0"),
      {
        timeout: 15000
      }
    )
    .toBeGreaterThan(0);

  const lowTrafficCount = Number((await canvas.getAttribute("data-traffic-vehicle-count")) ?? "0");
  const lowPedestrianCount = Number((await canvas.getAttribute("data-pedestrian-count")) ?? "0");

  await page.getByTestId("open-settings").click();
  await page.getByTestId("settings-graphics-preset").selectOption("high");
  await page.getByTestId("settings-traffic-density").selectOption("high");
  await page.getByTestId("settings-pedestrian-density").selectOption("high");
  await page.getByTestId("apply-settings").click();
  await page.getByTestId("restart-from-spawn").click();

  await expect(canvas).toHaveAttribute("data-ready-milestone", "controllable-vehicle", { timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-browser-family", browserName);
  await expect(canvas).toHaveAttribute("data-browser-support-tier", /supported|degraded/);
  await expect(canvas).toHaveAttribute("data-browser-webgl2-available", "true");
  await expect(canvas).toHaveAttribute("data-graphics-browser-family", browserName);
  await expect(canvas).toHaveAttribute(
    "data-graphics-hardware-scaling-level",
    browserName === "firefox" ? "1.10" : browserName === "webkit" ? "1.20" : "1.00"
  );
  await expect(canvas).toHaveAttribute("data-graphics-fog-density", "0.0014");
  await expect(canvas).toHaveAttribute("data-audio-profile", "high");
  await expect(canvas).toHaveAttribute(
    "data-audio-ambience-enabled",
    browserName === "webkit" ? "false" : "true"
  );
  await expect(canvas).toHaveAttribute("data-settings-graphics-preset", "high");
  await expect(canvas).toHaveAttribute("data-settings-traffic-density", "high");
  await expect(canvas).toHaveAttribute("data-settings-pedestrian-density", "high");
  await expect
    .poll(
      async () => Number((await canvas.getAttribute("data-performance-sample-count")) ?? "0"),
      {
        timeout: 15000
      }
    )
    .toBeGreaterThan(0);

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
