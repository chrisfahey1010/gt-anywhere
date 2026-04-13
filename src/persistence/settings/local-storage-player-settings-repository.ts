import {
  isCompletePlayerSettings,
  parsePartialPlayerSettings,
  type PlayerSettings
} from "../../app/config/settings-schema";

export const PLAYER_SETTINGS_STORAGE_KEY = "gt-anywhere.player-settings";

export const PLAYER_SETTINGS_STORAGE_VERSION = 1;

export type BrowserStorageAvailability = "available" | "unavailable";

export interface PlayerSettingsRepository {
  getStorageAvailability?(): BrowserStorageAvailability;
  load(): Partial<PlayerSettings> | null;
  save(settings: PlayerSettings): boolean;
}

export interface LocalStoragePlayerSettingsRepositoryOptions {
  storage?: Storage | null;
  storageKey?: string;
}

interface StoredPlayerSettingsRecord {
  version: number;
  settings: unknown;
}

function resolveDefaultStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isStoredPlayerSettingsRecord(value: unknown): value is StoredPlayerSettingsRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      "version" in value &&
      "settings" in value &&
      typeof (value as StoredPlayerSettingsRecord).version === "number"
  );
}

export class LocalStoragePlayerSettingsRepository implements PlayerSettingsRepository {
  private availability: BrowserStorageAvailability;

  private readonly storage: Storage | null;

  private readonly storageKey: string;

  constructor(options: LocalStoragePlayerSettingsRepositoryOptions = {}) {
    this.storage = options.storage ?? resolveDefaultStorage();
    this.storageKey = options.storageKey ?? PLAYER_SETTINGS_STORAGE_KEY;
    this.availability = this.detectAvailability();
  }

  private detectAvailability(): BrowserStorageAvailability {
    if (this.storage === null) {
      return "unavailable";
    }

    try {
      void this.storage.getItem(this.storageKey);
      return "available";
    } catch {
      return "unavailable";
    }
  }

  getStorageAvailability(): BrowserStorageAvailability {
    return this.availability;
  }

  load(): Partial<PlayerSettings> | null {
    if (this.storage === null) {
      this.availability = "unavailable";
      return null;
    }

    try {
      const serialized = this.storage.getItem(this.storageKey);

      this.availability = "available";

      if (serialized === null) {
        return null;
      }

      const record = JSON.parse(serialized) as unknown;

      if (!isStoredPlayerSettingsRecord(record) || record.version !== PLAYER_SETTINGS_STORAGE_VERSION) {
        return null;
      }

      const parsedSettings = parsePartialPlayerSettings(record.settings);

      return isCompletePlayerSettings(parsedSettings) ? parsedSettings : null;
    } catch {
      this.availability = "unavailable";
      return null;
    }
  }

  save(settings: PlayerSettings): boolean {
    if (this.storage === null) {
      this.availability = "unavailable";
      return false;
    }

    try {
      this.storage.setItem(
        this.storageKey,
        JSON.stringify({
          version: PLAYER_SETTINGS_STORAGE_VERSION,
          settings
        } satisfies StoredPlayerSettingsRecord)
      );

      this.availability = "available";

      return true;
    } catch {
      this.availability = "unavailable";
      return false;
    }
  }
}
