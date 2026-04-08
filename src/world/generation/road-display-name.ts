import type { SliceRoad, SliceRoadKind } from "../chunks/slice-manifest";

const FALLBACK_ROAD_LABELS: Record<SliceRoadKind, string> = {
  primary: "Arterial Road",
  secondary: "Cross Street",
  tertiary: "Connector Lane"
};

function compareRoadsForStableOrder(left: SliceRoad, right: SliceRoad): number {
  if (left.kind !== right.kind) {
    const roadKindPriority: Record<SliceRoadKind, number> = {
      primary: 0,
      secondary: 1,
      tertiary: 2
    };

    return roadKindPriority[left.kind] - roadKindPriority[right.kind];
  }

  return left.id.localeCompare(right.id);
}

export function formatFallbackRoadDisplayName(kind: SliceRoadKind, zeroBasedIndex: number): string {
  const baseLabel = FALLBACK_ROAD_LABELS[kind];

  return zeroBasedIndex === 0 ? baseLabel : `${baseLabel} ${zeroBasedIndex + 1}`;
}

export function applyRoadDisplayNames(roads: SliceRoad[]): SliceRoad[] {
  const missingRoads = roads
    .filter((road) => !road.displayName?.trim())
    .sort(compareRoadsForStableOrder);
  const missingCounts: Record<SliceRoadKind, number> = {
    primary: 0,
    secondary: 0,
    tertiary: 0
  };
  const fallbackLabels = new Map<string, string>();

  for (const road of missingRoads) {
    const zeroBasedIndex = missingCounts[road.kind];
    fallbackLabels.set(road.id, formatFallbackRoadDisplayName(road.kind, zeroBasedIndex));
    missingCounts[road.kind] += 1;
  }

  return roads.map((road) => ({
    ...road,
    displayName: road.displayName?.trim() || fallbackLabels.get(road.id)
  }));
}
