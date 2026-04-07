import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import { GameEventBus } from "../../src/app/events/game-events";
import { createLogger, type LogEntry } from "../../src/app/logging/logger";
import {
  invalidLocationQuery,
  unresolvableLocationQuery,
  validLocationAliasQuery
} from "../fixtures/location-queries";

describe("location entry integration", () => {
  it("shows the resolved place name, locks the loading state, and lets the player return to editing", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const app = await createGameApp({
      host,
      clock: () => "2026-04-07T00:00:00.000Z"
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const loadingFeedback = host.querySelector('[data-testid="loading-feedback"]');
    const primaryAction = host.querySelector(".primary-action") as HTMLButtonElement;
    const editLocation = host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement;

    expect(app.getSnapshot().phase).toBe("world-generation-requested");
    expect(loadingFeedback?.textContent).toContain("San Francisco, CA");
    expect(primaryAction.disabled).toBe(true);

    editLocation.click();

    const inputAfterEdit = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(inputAfterEdit.disabled).toBe(false);
    expect(inputAfterEdit.value).toBe("San Francisco, CA");
  });

  it("stores a serializable handoff contract and emits typed events with structured logs", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const emittedEvents: string[] = [];
    const logEntries: LogEntry[] = [];

    eventBus.on("session.location.submitted", (event) => emittedEvents.push(event.type));
    eventBus.on("session.location.resolved", (event) => emittedEvents.push(event.type));
    eventBus.on("world.generation.requested", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({
      host,
      eventBus,
      logger: createLogger((entry) => {
        logEntries.push(entry);
      }),
      clock: () => "2026-04-07T00:00:00.000Z"
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const serializedHandoff = JSON.parse(JSON.stringify(app.getSnapshot().handoff));

    expect(serializedHandoff.location.placeName).toBe("San Francisco, CA");
    expect(serializedHandoff.pipeline).toContain("SliceManifestStore");
    expect(emittedEvents).toEqual([
      "session.location.submitted",
      "session.location.resolved",
      "world.generation.requested"
    ]);
    expect(logEntries.map((entry) => entry.eventName)).toEqual([
      "session.location.submitted",
      "session.location.resolved",
      "world.generation.requested"
    ]);
  });

  it("keeps the player in the location flow and shows a recoverable error for an unresolvable query", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const emittedEvents: string[] = [];

    eventBus.on("session.location.submitted", (event) => emittedEvents.push(event.type));
    eventBus.on("session.location.resolve-failed", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({ host, eventBus });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = unresolvableLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const inputAfterFailure = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const errorMessage = host.querySelector('[data-testid="error-message"]');
    const retryAction = host.querySelector(".primary-action") as HTMLButtonElement;

    expect(app.getSnapshot().phase).toBe("error");
    expect(app.getSnapshot().handoff).toBeNull();
    expect(inputAfterFailure.value).toBe(unresolvableLocationQuery);
    expect(errorMessage?.textContent).toContain("could not be resolved");
    expect(retryAction.textContent).toBe("Try Again");
    expect(emittedEvents).toEqual([
      "session.location.submitted",
      "session.location.resolve-failed"
    ]);
  });

  it("keeps the player in the location flow for an unsupported single-token query", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const emittedEvents: string[] = [];

    eventBus.on("session.location.submitted", (event) => emittedEvents.push(event.type));
    eventBus.on("session.location.resolve-failed", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({ host, eventBus });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = invalidLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const inputAfterFailure = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const errorMessage = host.querySelector('[data-testid="error-message"]');

    expect(app.getSnapshot().phase).toBe("error");
    expect(app.getSnapshot().handoff).toBeNull();
    expect(inputAfterFailure.value).toBe(invalidLocationQuery);
    expect(errorMessage?.textContent).toContain("could not be resolved");
    expect(emittedEvents).toEqual([
      "session.location.submitted",
      "session.location.resolve-failed"
    ]);
  });
});
