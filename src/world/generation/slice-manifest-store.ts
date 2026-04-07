import type { SliceManifest } from "../chunks/slice-manifest";

export interface SliceManifestStore {
  save(manifest: SliceManifest): Promise<void>;
  getBySliceId(sliceId: string): SliceManifest | null;
  getByReuseKey(reuseKey: string): SliceManifest | null;
}

export class InMemorySliceManifestStore implements SliceManifestStore {
  private readonly manifestsById = new Map<string, SliceManifest>();

  private readonly manifestsByReuseKey = new Map<string, SliceManifest>();

  async save(manifest: SliceManifest): Promise<void> {
    this.manifestsById.set(manifest.sliceId, manifest);
    this.manifestsByReuseKey.set(manifest.location.reuseKey, manifest);
  }

  getBySliceId(sliceId: string): SliceManifest | null {
    return this.manifestsById.get(sliceId) ?? null;
  }

  getByReuseKey(reuseKey: string): SliceManifest | null {
    return this.manifestsByReuseKey.get(reuseKey) ?? null;
  }
}
