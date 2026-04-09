import type { BreakablePropPlanEntry, BreakablePropType, SliceBreakablePropPlan } from "../../world/chunks/slice-manifest";

export type BreakablePropState = "intact" | "broken";

export interface BreakablePropImpact {
  impactSpeed: number;
  propId: string;
  sourceId: string;
}

export interface BreakablePropSnapshot extends BreakablePropPlanEntry {
  breakState: BreakablePropState;
}

export interface BreakablePropBrokenEvent {
  impactSpeed: number;
  propId: string;
  propType: BreakablePropType;
  sourceId: string;
  type: "prop.broken";
}

export interface BreakablePropSystem {
  getProps(): BreakablePropSnapshot[];
  update(options: {
    currentTimeSeconds: number;
    impacts: readonly BreakablePropImpact[];
  }): BreakablePropBrokenEvent[];
}

interface StoredBreakableProp {
  entry: BreakablePropPlanEntry;
  breakState: BreakablePropState;
}

const CONTACT_COOLDOWN_SECONDS = 0.3;

const BREAKABLE_PROP_THRESHOLDS: Record<BreakablePropType, number> = {
  barrier: 8,
  bollard: 7,
  hydrant: 7.5,
  "short-post": 6.5,
  signpost: 6.5
};

function createImpactKey(impact: BreakablePropImpact): string {
  return `${impact.propId}:${impact.sourceId}`;
}

export function createBreakablePropSystem(plan: SliceBreakablePropPlan): BreakablePropSystem {
  const props = new Map<string, StoredBreakableProp>(
    plan.props.map((entry) => [
      entry.id,
      {
        entry,
        breakState: "intact"
      }
    ])
  );
  const recentContacts = new Map<string, number>();

  return {
    getProps: () =>
      [...props.values()].map((prop) => ({
        ...prop.entry,
        breakState: prop.breakState
      })),
    update: ({ currentTimeSeconds, impacts }) => {
      return impacts.flatMap((impact) => {
        const prop = props.get(impact.propId);

        if (!prop || prop.breakState === "broken") {
          return [];
        }

        const threshold = BREAKABLE_PROP_THRESHOLDS[prop.entry.propType];

        if (impact.impactSpeed < threshold) {
          return [];
        }

        const impactKey = createImpactKey(impact);
        const previousContactTime = recentContacts.get(impactKey) ?? Number.NEGATIVE_INFINITY;

        if (currentTimeSeconds - previousContactTime < CONTACT_COOLDOWN_SECONDS) {
          return [];
        }

        recentContacts.set(impactKey, currentTimeSeconds);
        prop.breakState = "broken";

        return [
          {
            impactSpeed: impact.impactSpeed,
            propId: prop.entry.id,
            propType: prop.entry.propType,
            sourceId: impact.sourceId,
            type: "prop.broken"
          }
        ];
      });
    }
  };
}
