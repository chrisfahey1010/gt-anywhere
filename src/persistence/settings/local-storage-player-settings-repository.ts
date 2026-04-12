import {
  isCompletePlayerSettings,
  parsePartialPlayerSettings,
  type PlayerSettings
} from "../../app/config/settings-schema";

export const PLAYER_SETTINGS_STORAGE_KEY = "gt-anywhere.player-settings";

export const PLAYER_SETTINGS_STORAGE_VERSION = 1;

export interface PlayerSettingsRepository {
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
  private readonly storage: Storage | null;

  private readonly storageKey: string;

  constructor(options: LocalStoragePlayerSettingsRepositoryOptions = {}) {
    this.storage = options.storage ?? resolveDefaultStorage();
    this.storageKey = options.storageKey ?? PLAYER_SETTINGS_STORAGE_KEY;
  }

  load(): Partial<PlayerSettings> | null {
    if (this.storage === null) {
      return null;
    }

    try {
      const serialized = this.storage.getItem(this.storageKey);

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
      return null;
    }
  }

  save(settings: PlayerSettings): boolean {
    if (this.storage === null) {
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

      return true;
    } catch {
      return false;
    }
  }
}
