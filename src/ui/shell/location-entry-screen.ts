import type { SessionState } from "../../app/state/session-state-machine";

interface LocationEntryScreenOptions {
  host: HTMLElement;
  onSubmit(query: string): void;
  onEdit(): void;
  onRetry(): void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class LocationEntryScreen {
  private readonly host: HTMLElement;

  private readonly onSubmit: (query: string) => void;

  private readonly onEdit: () => void;

  private readonly onRetry: () => void;

  constructor(options: LocationEntryScreenOptions) {
    this.host = options.host;
    this.onSubmit = options.onSubmit;
    this.onEdit = options.onEdit;
    this.onRetry = options.onRetry;
  }

  render(state: SessionState): void {
    const isResolving = state.phase === "location-resolving";
    const isGenerating = state.phase === "world-generation-requested" || state.phase === "world-generating";
    const isLoading = state.phase === "world-loading";
    const isBusy = isResolving || isGenerating || isLoading;
    const isReady = state.phase === "world-ready";
    const isRecoverableLoadError = state.phase === "world-load-error";
    const disableInput = isBusy;
    const placeName = state.sessionIdentity?.placeName ?? state.formQuery;
    const errorMessage =
      state.phase === "error" || isRecoverableLoadError ? state.error?.message ?? "Try again." : "";
    const loadingMessage = isResolving
      ? "Resolving your location..."
      : isGenerating && placeName
        ? `Generating slice for ${placeName}...`
        : isLoading && placeName
          ? `Loading slice for ${placeName}...`
          : isReady && placeName
            ? `Slice ready for ${placeName}.`
            : isRecoverableLoadError && placeName
              ? `Slice load paused for ${placeName}.`
        : "";
    const submitLabel = isResolving
      ? "Resolving..."
      : isBusy
        ? "Loading..."
        : state.phase === "error"
          ? "Try Again"
          : "Start Session";
    const showEdit = state.phase === "error" || isBusy || isReady || isRecoverableLoadError;
    const showRetry = isRecoverableLoadError;

    this.host.innerHTML = `
      <main class="location-shell ${isReady || isRecoverableLoadError ? "location-shell--overlay" : ""}">
        <section class="location-card" aria-labelledby="location-shell-title">
          <div class="location-copy">
            <p class="eyebrow">Session Setup</p>
            <h1 id="location-shell-title">Enter a real-world location</h1>
            <p class="supporting-copy">Use a city, neighborhood, landmark, or address to start a new session.</p>
          </div>
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
              ${showRetry ? '<button class="secondary-action" type="button" data-testid="retry-load">Retry load</button>' : ""}
              ${showEdit ? '<button class="secondary-action" type="button" data-testid="edit-location">Edit location</button>' : ""}
            </div>
            <p class="field-hint">Examples: Times Square, New York, NY; 1600 Amphitheatre Parkway, Mountain View, CA.</p>
          </form>
          <p class="status-message" data-testid="loading-feedback" aria-live="polite">${escapeHtml(loadingMessage)}</p>
          <p class="error-message" data-testid="error-message" role="alert">${escapeHtml(errorMessage)}</p>
        </section>
      </main>
    `;

    const form = this.host.querySelector("form");
    const input = this.host.querySelector("input");
    const editButton = this.host.querySelector('[data-testid="edit-location"]');
    const retryButton = this.host.querySelector('[data-testid="retry-load"]');

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

    retryButton?.addEventListener("click", () => {
      this.onRetry();
    });

    if (input instanceof HTMLInputElement && !disableInput) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}
