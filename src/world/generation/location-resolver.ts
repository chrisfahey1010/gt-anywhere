import {
  RECOVERABLE_UNRESOLVABLE_QUERIES,
  SESSION_SEED,
  SUPPORTED_LOCATION_ALIASES,
  SUPPORTED_SINGLE_TOKEN_LOCATIONS,
  WORLD_GENERATION_PIPELINE
} from "../../app/config/session-config";

export type LocationResolveFailureCode =
  | "LOCATION_QUERY_REQUIRED"
  | "LOCATION_QUERY_INVALID"
  | "LOCATION_QUERY_UNRESOLVABLE"
  | "LOCATION_RESOLVE_FAILED";

export interface LocationResolveFailure {
  ok: false;
  code: LocationResolveFailureCode;
  message: string;
  recoverable: true;
  query: string;
}

export interface SessionLocationIdentity {
  query: string;
  normalizedQuery: string;
  placeName: string;
  sessionKey: string;
  reuseKey: string;
}

export interface WorldGenerationRequest {
  stage: "requested";
  requestedAt: string;
  sliceSeed: string;
  location: SessionLocationIdentity;
  pipeline: readonly string[];
}

export type ResolveLocationResult =
  | { ok: true; value: SessionLocationIdentity }
  | LocationResolveFailure;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatToken(token: string): string {
  if (/^[a-z]{2}$/i.test(token)) {
    return token.toUpperCase();
  }

  return token
    .split("-")
    .map((part) => (part ? `${part[0]!.toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join("-");
}

function toPlaceName(query: string): string {
  return query
    .split(",")
    .map((segment) => segment.trim().split(" ").filter(Boolean).map(formatToken).join(" "))
    .join(", ");
}

function isAddressLikeQuery(query: string): boolean {
  return /\d/.test(query) && /[a-z]/i.test(query);
}

function hasStructuredPlaceParts(query: string): boolean {
  return query.includes(",") || query.split(" ").length >= 2;
}

function canResolveLocationQuery(normalizedQuery: string, lookupKey: string): boolean {
  return (
    Object.hasOwn(SUPPORTED_LOCATION_ALIASES, lookupKey) ||
    SUPPORTED_SINGLE_TOKEN_LOCATIONS.has(lookupKey) ||
    hasStructuredPlaceParts(normalizedQuery) ||
    isAddressLikeQuery(normalizedQuery)
  );
}

export function normalizeLocationQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function validateLocationQuery(query: string): { ok: true; value: string } | LocationResolveFailure {
  const normalizedQuery = normalizeLocationQuery(query);

  if (normalizedQuery.length === 0) {
    return {
      ok: false,
      code: "LOCATION_QUERY_REQUIRED",
      message: "Enter a city, neighborhood, landmark, or address to start.",
      recoverable: true,
      query: normalizedQuery
    };
  }

  const letterCount = normalizedQuery.replace(/[^a-z]/gi, "").length;

  if (letterCount < 2) {
    return {
      ok: false,
      code: "LOCATION_QUERY_INVALID",
      message: "Use a real-world place name or address-like query.",
      recoverable: true,
      query: normalizedQuery
    };
  }

  return { ok: true, value: normalizedQuery };
}

export class LocationResolver {
  async resolve(query: string): Promise<ResolveLocationResult> {
    const validation = validateLocationQuery(query);

    if (!validation.ok) {
      return validation;
    }

    await Promise.resolve();

    const normalizedQuery = validation.value;
    const lookupKey = normalizedQuery.toLowerCase();

    if (RECOVERABLE_UNRESOLVABLE_QUERIES.has(lookupKey)) {
      return {
        ok: false,
        code: "LOCATION_QUERY_UNRESOLVABLE",
        message: "That place could not be resolved yet. Try a different city, landmark, or address.",
        recoverable: true,
        query: normalizedQuery
      };
    }

    if (!canResolveLocationQuery(normalizedQuery, lookupKey)) {
      return {
        ok: false,
        code: "LOCATION_QUERY_UNRESOLVABLE",
        message: "That place could not be resolved yet. Try a different city, landmark, or address.",
        recoverable: true,
        query: normalizedQuery
      };
    }

    const placeName = SUPPORTED_LOCATION_ALIASES[lookupKey] ?? toPlaceName(normalizedQuery);
    const reuseKey = slugify(placeName);

    return {
      ok: true,
      value: {
        query: normalizedQuery,
        normalizedQuery: lookupKey,
        placeName,
        sessionKey: `${reuseKey}-${SESSION_SEED}`,
        reuseKey
      }
    };
  }
}

export function createWorldGenerationRequest(
  identity: SessionLocationIdentity,
  clock: () => string = () => new Date().toISOString()
): WorldGenerationRequest {
  return {
    stage: "requested",
    requestedAt: clock(),
    sliceSeed: SESSION_SEED,
    location: identity,
    pipeline: [...WORLD_GENERATION_PIPELINE]
  };
}
