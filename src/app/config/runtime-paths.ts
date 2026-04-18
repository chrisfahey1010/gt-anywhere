function normalizePublicBasePath(baseUrl: string): string {
  if (!baseUrl || baseUrl === "/") {
    return "/";
  }

  const withLeadingSlash = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;

  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function resolvePublicAssetPath(relativePath: string, baseUrl: string = import.meta.env.BASE_URL): string {
  const normalizedRelativePath = relativePath.replace(/^\/+/, "");
  const normalizedBasePath = normalizePublicBasePath(baseUrl);

  return normalizedBasePath === "/" ? `/${normalizedRelativePath}` : `${normalizedBasePath}${normalizedRelativePath}`;
}

export function resolveLocationPresetPath(baseUrl?: string): string {
  return resolvePublicAssetPath("data/world-gen/location-presets.json", baseUrl);
}

export function resolveVehicleTuningPath(vehicleType: string, baseUrl?: string): string {
  return resolvePublicAssetPath(`data/tuning/${vehicleType}.json`, baseUrl);
}

export function resolveAssetRegistryPath(baseUrl?: string): string {
  return resolvePublicAssetPath("data/assets/registry.json", baseUrl);
}
