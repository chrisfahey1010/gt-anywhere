export interface ReleaseMetadata {
  appName: string;
  appVersion: string;
  releaseCommit: string;
  releaseCommittedAt: string;
  releaseId: string;
}

export interface ReleaseMetadataTelemetry {
  appName: string;
  appVersion: string;
  releaseCommit: string;
  releaseCommittedAt: string;
  releaseId: string;
}

export function createReleaseMetadataTelemetry(releaseMetadata: ReleaseMetadata): ReleaseMetadataTelemetry {
  return {
    appName: releaseMetadata.appName,
    appVersion: releaseMetadata.appVersion,
    releaseCommit: releaseMetadata.releaseCommit,
    releaseCommittedAt: releaseMetadata.releaseCommittedAt,
    releaseId: releaseMetadata.releaseId
  };
}

export function applyReleaseMetadataDataset(target: HTMLElement, releaseMetadata: ReleaseMetadata): void {
  const telemetry = createReleaseMetadataTelemetry(releaseMetadata);

  Object.entries(telemetry).forEach(([key, value]) => {
    target.dataset[key] = value;
  });
}

export function formatReleaseBuildLabel(releaseMetadata: ReleaseMetadata): string {
  return `Build ${releaseMetadata.releaseId}`;
}
