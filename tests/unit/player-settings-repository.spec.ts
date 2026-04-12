import type { PlayerSettings } from "../../src/app/config/settings-schema";
import {
  LocalStoragePlayerSettingsRepository,
  PLAYER_SETTINGS_STORAGE_KEY,
  PLAYER_SETTINGS_STORAGE_VERSION
} from "../../src/persistence/settings/local-storage-player-settings-repository";

function createStorageStub(overrides: Partial<Storage> = {}): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    ...overrides
  } as Storage;
}

describe("local storage player settings repository", () => {
  const savedSettings: PlayerSettings = {
    worldSize: "large",
    graphicsPreset: "high",
    trafficDensity: "medium",
    pedestrianDensity: "off"
  };

  it("writes a versioned payload through the persistence seam", () => {
    const storage = createStorageStub();
    const repository = new LocalStoragePlayerSettingsRepository({ storage });

    expect(repository.save(savedSettings)).toBe(true);
    expect(JSON.parse(storage.getItem(PLAYER_SETTINGS_STORAGE_KEY) ?? "null")).toEqual({
      version: PLAYER_SETTINGS_STORAGE_VERSION,
      settings: savedSettings
    });
  });

  it("loads the last saved settings when the version and schema are valid", () => {
    const storage = createStorageStub();
    const repository = new LocalStoragePlayerSettingsRepository({ storage });

    storage.setItem(
      PLAYER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: PLAYER_SETTINGS_STORAGE_VERSION,
        settings: {
          ...savedSettings,
          drawDistance: "far"
        }
      })
    );

    expect(repository.load()).toEqual(savedSettings);
  });

  it("falls back safely when browser storage is unavailable or blocked", () => {
    const storage = createStorageStub({
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("SecurityError");
      }
    });
    const repository = new LocalStoragePlayerSettingsRepository({ storage });

    expect(repository.load()).toBeNull();
    expect(repository.save(savedSettings)).toBe(false);
  });

  it("ignores malformed or mismatched payload versions instead of throwing during boot", () => {
    const storage = createStorageStub();
    const repository = new LocalStoragePlayerSettingsRepository({ storage });

    storage.setItem(PLAYER_SETTINGS_STORAGE_KEY, "not-json");
    expect(repository.load()).toBeNull();

    storage.setItem(
      PLAYER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: PLAYER_SETTINGS_STORAGE_VERSION + 1,
        settings: savedSettings
      })
    );
    expect(repository.load()).toBeNull();
  });
});
