import {
  getReplaySelectionById,
  REPLAY_INTENTION_OPTIONS,
  REPLAY_VEHICLE_OPTIONS,
  type ReplaySelection
} from "../../app/config/replay-options";
import {
  GRAPHICS_PRESET_OPTIONS,
  PEDESTRIAN_DENSITY_OPTIONS,
  TRAFFIC_DENSITY_OPTIONS,
  WORLD_SIZE_OPTIONS,
  arePlayerSettingsEqual,
  type GraphicsPreset,
  type PedestrianDensity,
  type PlayerSettings,
  type TrafficDensity,
  type WorldSize
} from "../../app/config/settings-schema";
import type { BrowserSupportIssue, BrowserSupportSnapshot } from "../../app/config/platform";
import { formatReleaseBuildLabel, type ReleaseMetadata } from "../../app/config/release-metadata";
import type { SessionState } from "../../app/state/session-state-machine";

interface LocationEntryScreenOptions {
  host: HTMLElement;
  onApplySettings(): void;
  onSubmit(query: string): void;
  onEdit(): void;
  onReplay(selection: ReplaySelection): void;
  onReloadPublicBuild(): void;
  onRestart(): void;
  onRetry(): void;
  onSettingsChange(changes: Partial<PlayerSettings>): void;
  onToggleSettings(): void;
  releaseMetadata: ReleaseMetadata;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderReplayButtons(options: typeof REPLAY_VEHICLE_OPTIONS | typeof REPLAY_INTENTION_OPTIONS): string {
  return options
    .map(
      (option) => `
        <button
          class="secondary-action replay-option-button"
          type="button"
          data-replay-selection-id="${option.selection.id}"
          data-testid="replay-${option.selection.id}"
        >
          ${escapeHtml(option.selection.label)}
        </button>
      `
    )
    .join("");
}

function renderSelectOptions<T extends string>(options: readonly T[], selected: T): string {
  return options
    .map(
      (option) => `<option value="${option}" ${option === selected ? "selected" : ""}>${formatSettingLabel(option)}</option>`
    )
    .join("");
}

function formatSettingLabel(value: string): string {
  return value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatBrowserSupportIssue(issue: BrowserSupportIssue): string {
  switch (issue) {
    case "audio-blocked":
      return "audio unlock is blocked";

    case "audio-unavailable":
      return "audio is unavailable";

    case "browser-family-concessions":
      return "conservative browser defaults are active";

    case "mutation-observer-unavailable":
      return "mutation observers are unavailable";

    case "performance-now-unavailable":
      return "high-resolution timing is unavailable";

    case "request-idle-callback-unavailable":
      return "idle callbacks are unavailable";

    case "storage-unavailable":
      return "settings storage is unavailable";

    case "unsupported-browser-family":
      return "this browser family is outside the supported desktop set";

    case "webgl2-unavailable":
      return "WebGL2 is unavailable";

    default:
      return issue;
  }
}

function formatBrowserSupportMessage(browserSupport: BrowserSupportSnapshot): string {
  if (browserSupport.supportTier === "unsupported") {
    return "Browser support: unsupported. Use a supported desktop browser with WebGL2 on Chromium, Firefox, or Safari/WebKit.";
  }

  if (browserSupport.supportTier === "degraded") {
    return `Browser support: degraded. ${browserSupport.issues.map(formatBrowserSupportIssue).join(". ")}.`;
  }

  return `Browser support: supported on ${browserSupport.browserFamily}.`;
}

function isReloadRecoveryState(state: SessionState): boolean {
  return (
    state.phase === "world-load-error" &&
    state.error !== null &&
    "details" in state.error &&
    state.error.details.recoveryAction === "reload"
  );
}

function renderWorldSizeButtons(selected: WorldSize, disabled: boolean): string {
  return WORLD_SIZE_OPTIONS.map(
    (option) => `
      <button
        class="world-size-button ${option === selected ? "world-size-button--selected" : ""}"
        type="button"
        data-testid="world-size-${option}"
        data-world-size="${option}"
        aria-pressed="${option === selected}"
        ${disabled ? "disabled" : ""}
      >
        ${escapeHtml(formatSettingLabel(option))}
      </button>
    `
  ).join("");
}

export class LocationEntryScreen {
  private readonly host: HTMLElement;

  private readonly onApplySettings: () => void;

  private readonly onSubmit: (query: string) => void;

  private readonly onEdit: () => void;

  private readonly onReplay: (selection: ReplaySelection) => void;

  private readonly onReloadPublicBuild: () => void;

  private readonly onRestart: () => void;

  private readonly onRetry: () => void;

  private readonly onSettingsChange: (changes: Partial<PlayerSettings>) => void;

  private readonly onToggleSettings: () => void;

  private readonly releaseMetadata: ReleaseMetadata;

  constructor(options: LocationEntryScreenOptions) {
    this.host = options.host;
    this.onApplySettings = options.onApplySettings;
    this.onSubmit = options.onSubmit;
    this.onEdit = options.onEdit;
    this.onReplay = options.onReplay;
    this.onReloadPublicBuild = options.onReloadPublicBuild;
    this.onRestart = options.onRestart;
    this.onRetry = options.onRetry;
    this.onSettingsChange = options.onSettingsChange;
    this.onToggleSettings = options.onToggleSettings;
    this.releaseMetadata = options.releaseMetadata;
  }

  render(state: SessionState, browserSupport: BrowserSupportSnapshot): void {
    const isResolving = state.phase === "location-resolving";
    const isGenerating = state.phase === "world-generation-requested" || state.phase === "world-generating";
    const isRestarting = state.phase === "world-restarting";
    const isLoading = state.phase === "world-loading";
    const isBusy = isResolving || isGenerating || isRestarting || isLoading;
    const isReady = state.phase === "world-ready";
    const isRecoverableLoadError = state.phase === "world-load-error";
    const isReloadRecovery = isReloadRecoveryState(state);
    const disableInput = isBusy;
    const placeName = state.sessionIdentity?.placeName ?? state.formQuery;
    const replaySelection = state.replaySelection;
    const errorMessage =
      state.phase === "error" || isRecoverableLoadError ? state.error?.message ?? "Try again." : "";
    const loadingMessage = isResolving
      ? "Resolving your location..."
      : isGenerating && placeName
        ? `Generating slice for ${placeName}...`
        : isRestarting && placeName && replaySelection
          ? `Loading the ${replaySelection.label} replay for ${placeName}...`
        : isRestarting && placeName
          ? `Restarting from spawn in ${placeName}...`
        : isLoading && placeName && replaySelection
          ? `${replaySelection.label} replay loading for ${placeName}...`
        : isLoading && placeName
          ? `Loading slice for ${placeName}...`
          : isReady && placeName && replaySelection
            ? `${replaySelection.label} replay ready for ${placeName}.`
            : isReady && placeName
              ? `Slice ready for ${placeName}.`
              : isReloadRecovery
                ? "Public build update required."
            : isRecoverableLoadError && placeName && replaySelection
              ? `${replaySelection.label} replay paused for ${placeName}.`
            : isRecoverableLoadError && placeName
               ? `Slice load paused for ${placeName}.`
        : "";
    const submitLabel = isResolving
      ? "Resolving..."
      : isBusy
        ? isRestarting
          ? "Restarting..."
          : "Loading..."
        : state.phase === "error"
          ? "Try Again"
          : "Start Session";
    const showEdit = state.phase === "error" || isBusy || isReady || isRecoverableLoadError;
    const showReplayLauncher = isReady;
    const showReloadPublicBuild = isReloadRecovery;
    const showRestart = isReady;
    const showRetry = isRecoverableLoadError && !isReloadRecovery;
    const settingsSummary = `World size ${formatSettingLabel(state.currentSettings.worldSize)}. Graphics ${formatSettingLabel(state.currentSettings.graphicsPreset)}. Traffic ${formatSettingLabel(state.currentSettings.trafficDensity)}. Pedestrians ${formatSettingLabel(state.currentSettings.pedestrianDensity)}.`;
    const browserSupportMessage = formatBrowserSupportMessage(browserSupport);
    const releaseBuildLabel = formatReleaseBuildLabel(this.releaseMetadata);
    const settingsApplyCopy =
      state.activeWorldSettings === null
        ? "These launch presets apply when you start the next run."
        : arePlayerSettingsEqual(state.currentSettings, state.activeWorldSettings)
          ? "These presets are already active for this run. Future changes apply on the next recreated run."
          : "These edits are queued for the next recreated run.";

    this.host.innerHTML = `
      <main class="location-shell ${isReady || isRecoverableLoadError ? "location-shell--overlay" : ""}">
        <section class="location-card" aria-labelledby="location-shell-title">
          <div class="location-copy">
            <p class="eyebrow">Session Setup</p>
            <h1 id="location-shell-title">Enter a real-world location</h1>
            <p class="supporting-copy">Use a city, neighborhood, landmark, or address to start a new session.</p>
            <p class="field-hint" data-testid="browser-support-status" data-support-tier="${escapeHtml(browserSupport.supportTier)}">${escapeHtml(browserSupportMessage)}</p>
            <p class="field-hint" data-testid="release-build-info">${escapeHtml(releaseBuildLabel)}</p>
          </div>
          <section class="launch-settings" aria-label="Launch settings">
            <div class="launch-settings__copy">
              <p class="eyebrow">Launch Essentials</p>
              <p class="supporting-copy">Pick a world size up front, then open Settings for graphics and density presets.</p>
            </div>
            <div class="launch-settings__controls" data-testid="world-size-controls">
              ${renderWorldSizeButtons(state.currentSettings.worldSize, disableInput)}
            </div>
            <div class="launch-settings__actions">
              <button class="secondary-action" type="button" data-testid="open-settings" ${disableInput ? "disabled" : ""}>
                ${state.settingsOpen ? "Hide Settings" : "Settings"}
              </button>
            </div>
            <p class="field-hint" data-testid="settings-summary">${escapeHtml(settingsSummary)}</p>
          </section>
          ${state.settingsOpen ? `
            <section class="settings-surface" data-testid="settings-surface" aria-label="Session settings">
              <div class="settings-surface__copy">
                <p class="eyebrow">Settings</p>
                <p class="supporting-copy">Use preset-only controls for world size, graphics, traffic, and pedestrians.</p>
              </div>
              <div class="settings-surface__grid">
                <label class="field-label" for="settings-world-size">World Size</label>
                <select id="settings-world-size" class="settings-select" data-testid="settings-world-size" ${disableInput ? "disabled" : ""}>
                  ${renderSelectOptions(WORLD_SIZE_OPTIONS, state.currentSettings.worldSize)}
                </select>
                <label class="field-label" for="settings-graphics-preset">Graphics Preset</label>
                <select id="settings-graphics-preset" class="settings-select" data-testid="settings-graphics-preset" ${disableInput ? "disabled" : ""}>
                  ${renderSelectOptions(GRAPHICS_PRESET_OPTIONS, state.currentSettings.graphicsPreset)}
                </select>
                <label class="field-label" for="settings-traffic-density">Traffic Density</label>
                <select id="settings-traffic-density" class="settings-select" data-testid="settings-traffic-density" ${disableInput ? "disabled" : ""}>
                  ${renderSelectOptions(TRAFFIC_DENSITY_OPTIONS, state.currentSettings.trafficDensity)}
                </select>
                <label class="field-label" for="settings-pedestrian-density">Pedestrian Density</label>
                <select id="settings-pedestrian-density" class="settings-select" data-testid="settings-pedestrian-density" ${disableInput ? "disabled" : ""}>
                  ${renderSelectOptions(PEDESTRIAN_DENSITY_OPTIONS, state.currentSettings.pedestrianDensity)}
                </select>
              </div>
              <p class="field-hint" data-testid="settings-apply-hint">${escapeHtml(settingsApplyCopy)}</p>
              <div class="action-row">
                <button class="primary-action" type="button" data-testid="apply-settings" ${disableInput ? "disabled" : ""}>Apply and save</button>
                <button class="secondary-action" type="button" data-testid="close-settings" ${disableInput ? "disabled" : ""}>Close</button>
              </div>
            </section>
          ` : ""}
          <form class="location-form">
            <label class="field-label" for="location-query">Location</label>
            <input
              id="location-query"
              name="location-query"
              data-testid="location-input"
              class="location-input"
              type="text"
              autocomplete="street-address"
              placeholder="San Francisco, CA"
              value="${escapeHtml(state.formQuery)}"
              ${disableInput ? "disabled" : ""}
            />
            <div class="action-row">
              <button class="primary-action" type="submit" ${disableInput ? "disabled" : ""}>${submitLabel}</button>
              ${showRestart ? '<button class="secondary-action" type="button" data-testid="restart-from-spawn">Restart from spawn</button>' : ""}
              ${showReloadPublicBuild ? '<button class="secondary-action" type="button" data-testid="reload-public-build">Reload build</button>' : ""}
              ${showRetry ? '<button class="secondary-action" type="button" data-testid="retry-load">Retry load</button>' : ""}
              ${showEdit ? '<button class="secondary-action" type="button" data-testid="edit-location">Edit location</button>' : ""}
            </div>
            <p class="field-hint">Examples: Times Square, New York, NY; 1600 Amphitheatre Parkway, Mountain View, CA.</p>
          </form>
          ${showReplayLauncher ? `
            <section class="replay-launcher" data-testid="same-location-replay-launcher" aria-label="Same-location replay options">
              <div class="replay-launcher__copy">
                <p class="eyebrow">Replay This Place</p>
                <p class="supporting-copy">Launch the same slice again with a different starter vehicle or a lightweight intention.</p>
              </div>
              ${replaySelection ? `
                <div class="replay-summary" data-testid="active-replay-selection">
                  <p class="replay-summary__title">${escapeHtml(replaySelection.label)}</p>
                  <p class="replay-summary__prompt">${escapeHtml(replaySelection.prompt)}</p>
                </div>
              ` : ""}
              <div class="replay-option-group">
                <p class="replay-option-group__label">Vehicles</p>
                <div class="replay-option-row">
                  ${renderReplayButtons(REPLAY_VEHICLE_OPTIONS)}
                </div>
              </div>
              <div class="replay-option-group">
                <p class="replay-option-group__label">Intentions</p>
                <div class="replay-option-row">
                  ${renderReplayButtons(REPLAY_INTENTION_OPTIONS)}
                </div>
              </div>
            </section>
          ` : ""}
          <p class="status-message" data-testid="loading-feedback" aria-live="polite">${escapeHtml(loadingMessage)}</p>
          <p class="error-message" data-testid="error-message" role="alert">${escapeHtml(errorMessage)}</p>
        </section>
      </main>
    `;

    const form = this.host.querySelector("form");
    const input = this.host.querySelector("input");
    const editButton = this.host.querySelector('[data-testid="edit-location"]');
    const openSettingsButton = this.host.querySelector('[data-testid="open-settings"]');
    const closeSettingsButton = this.host.querySelector('[data-testid="close-settings"]');
    const applySettingsButton = this.host.querySelector('[data-testid="apply-settings"]');
    const reloadPublicBuildButton = this.host.querySelector('[data-testid="reload-public-build"]');
    const restartButton = this.host.querySelector('[data-testid="restart-from-spawn"]');
    const replayButtons = this.host.querySelectorAll<HTMLButtonElement>("[data-replay-selection-id]");
    const retryButton = this.host.querySelector('[data-testid="retry-load"]');
    const worldSizeButtons = this.host.querySelectorAll<HTMLButtonElement>("[data-world-size]");
    const settingsWorldSize = this.host.querySelector('[data-testid="settings-world-size"]');
    const graphicsPreset = this.host.querySelector('[data-testid="settings-graphics-preset"]');
    const trafficDensity = this.host.querySelector('[data-testid="settings-traffic-density"]');
    const pedestrianDensity = this.host.querySelector('[data-testid="settings-pedestrian-density"]');

    form?.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      this.onSubmit(input.value);
    });

    editButton?.addEventListener("click", () => {
      this.onEdit();
    });

    openSettingsButton?.addEventListener("click", () => {
      this.onToggleSettings();
    });

    closeSettingsButton?.addEventListener("click", () => {
      this.onToggleSettings();
    });

    applySettingsButton?.addEventListener("click", () => {
      this.onApplySettings();
    });

    restartButton?.addEventListener("click", () => {
      this.onRestart();
    });

    reloadPublicBuildButton?.addEventListener("click", () => {
      this.onReloadPublicBuild();
    });

    worldSizeButtons.forEach((button) => {
      const worldSize = button.dataset.worldSize;

      if (!worldSize) {
        return;
      }

      button.addEventListener("click", () => {
        this.onSettingsChange({ worldSize: worldSize as WorldSize });
      });
    });

    settingsWorldSize?.addEventListener("change", (event) => {
      this.onSettingsChange({ worldSize: (event.target as HTMLSelectElement).value as WorldSize });
    });

    graphicsPreset?.addEventListener("change", (event) => {
      this.onSettingsChange({ graphicsPreset: (event.target as HTMLSelectElement).value as GraphicsPreset });
    });

    trafficDensity?.addEventListener("change", (event) => {
      this.onSettingsChange({ trafficDensity: (event.target as HTMLSelectElement).value as TrafficDensity });
    });

    pedestrianDensity?.addEventListener("change", (event) => {
      this.onSettingsChange({ pedestrianDensity: (event.target as HTMLSelectElement).value as PedestrianDensity });
    });

    replayButtons.forEach((button) => {
      const selectionId = button.dataset.replaySelectionId;

      if (!selectionId) {
        return;
      }

      button.addEventListener("click", () => {
        const selection = getReplaySelectionById(selectionId);

        if (selection !== null) {
          this.onReplay(selection);
        }
      });
    });

    retryButton?.addEventListener("click", () => {
      this.onRetry();
    });

    if (state.settingsOpen && settingsWorldSize instanceof HTMLSelectElement && !disableInput) {
      settingsWorldSize.focus();
    } else if (input instanceof HTMLInputElement && !disableInput) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}
