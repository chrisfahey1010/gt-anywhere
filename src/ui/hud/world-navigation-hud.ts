import type { WorldNavigationRoadSnapshot, WorldNavigationSnapshot } from "../../rendering/scene/world-scene-runtime";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const MINIMAP_SIZE = 100;
const MINIMAP_PADDING = 8;

function createSvgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, name);
}

function getRoadStrokeWidth(road: WorldNavigationRoadSnapshot): number {
  switch (road.kind) {
    case "primary":
      return 3.5;
    case "secondary":
      return 2.5;
    default:
      return 1.8;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function projectWorldNavigationPoint(
  bounds: WorldNavigationSnapshot["bounds"],
  point: { x: number; z: number }
): { x: number; y: number } {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const depth = Math.max(bounds.maxZ - bounds.minZ, 1);
  const drawableSize = MINIMAP_SIZE - MINIMAP_PADDING * 2;
  const normalizedX = clamp((point.x - bounds.minX) / width, 0, 1);
  const normalizedZ = clamp((point.z - bounds.minZ) / depth, 0, 1);

  return {
    x: MINIMAP_PADDING + normalizedX * drawableSize,
    y: MINIMAP_PADDING + (1 - normalizedZ) * drawableSize
  };
}

interface WorldNavigationHudOptions {
  host: HTMLElement;
}

export class WorldNavigationHud {
  private readonly root: HTMLDivElement;

  private readonly districtLabel: HTMLParagraphElement;

  private readonly streetLabel: HTMLParagraphElement;

  private readonly locationLabel: HTMLParagraphElement;

  private readonly minimap: SVGSVGElement;

  private readonly roadLayer: SVGGElement;

  private readonly boundary: SVGRectElement;

  private readonly actorMarker: SVGCircleElement;

  private readonly actorHeading: SVGLineElement;

  private renderedBounds: WorldNavigationSnapshot["bounds"] | null = null;

  private renderedRoads: WorldNavigationRoadSnapshot[] | null = null;

  private hasSnapshot = false;

  private isVisible = false;

  constructor(options: WorldNavigationHudOptions) {
    this.root = document.createElement("div");
    this.root.className = "world-navigation-hud";
    this.root.dataset.testid = "world-navigation-hud";
    this.root.setAttribute("aria-hidden", "true");
    this.root.style.pointerEvents = "none";
    this.root.hidden = true;

    const copy = document.createElement("div");
    copy.className = "world-navigation-hud__copy";

    this.districtLabel = document.createElement("p");
    this.districtLabel.className = "world-navigation-hud__district";
    this.streetLabel = document.createElement("p");
    this.streetLabel.className = "world-navigation-hud__street";
    this.locationLabel = document.createElement("p");
    this.locationLabel.className = "world-navigation-hud__location";

    copy.append(this.districtLabel, this.streetLabel, this.locationLabel);

    const minimapFrame = document.createElement("div");
    minimapFrame.className = "world-navigation-hud__minimap-frame";

    this.minimap = createSvgElement("svg");
    this.minimap.classList.add("world-navigation-hud__minimap");
    this.minimap.dataset.testid = "world-navigation-minimap";
    this.minimap.setAttribute("viewBox", `0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`);
    this.minimap.setAttribute("aria-hidden", "true");

    this.boundary = createSvgElement("rect");
    this.boundary.setAttribute("x", String(MINIMAP_PADDING));
    this.boundary.setAttribute("y", String(MINIMAP_PADDING));
    this.boundary.setAttribute("width", String(MINIMAP_SIZE - MINIMAP_PADDING * 2));
    this.boundary.setAttribute("height", String(MINIMAP_SIZE - MINIMAP_PADDING * 2));
    this.boundary.setAttribute("rx", "10");
    this.boundary.setAttribute("class", "world-navigation-hud__bounds");

    this.roadLayer = createSvgElement("g");
    this.actorHeading = createSvgElement("line");
    this.actorHeading.setAttribute("class", "world-navigation-hud__marker-heading");
    this.actorMarker = createSvgElement("circle");
    this.actorMarker.dataset.testid = "world-navigation-marker";
    this.actorMarker.setAttribute("r", "3.6");
    this.actorMarker.setAttribute("class", "world-navigation-hud__marker");

    this.minimap.append(this.boundary, this.roadLayer, this.actorHeading, this.actorMarker);
    minimapFrame.append(this.minimap);
    this.root.append(copy, minimapFrame);
    options.host.append(this.root);
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.syncVisibility();
  }

  clear(): void {
    this.hasSnapshot = false;
    this.districtLabel.textContent = "";
    this.streetLabel.textContent = "";
    this.locationLabel.textContent = "";
    this.syncVisibility();
  }

  render(snapshot: WorldNavigationSnapshot | null): void {
    if (snapshot === null) {
      this.clear();
      return;
    }

    const hasStreetLabel = Boolean(snapshot.streetLabel);

    this.hasSnapshot = true;
    this.districtLabel.textContent = hasStreetLabel ? snapshot.districtName : snapshot.locationName;
    this.streetLabel.textContent = snapshot.streetLabel ?? snapshot.districtName;
    this.locationLabel.textContent = hasStreetLabel ? snapshot.locationName : "";

    if (snapshot.bounds !== this.renderedBounds || snapshot.roads !== this.renderedRoads) {
      this.renderedBounds = snapshot.bounds;
      this.renderedRoads = snapshot.roads;
      this.rebuildRoadLayer(snapshot);
    }

    const actorPoint = projectWorldNavigationPoint(snapshot.bounds, snapshot.actor.position);
    const headingLength = 8;
    const headingX = actorPoint.x + Math.sin(snapshot.actor.facingYaw) * headingLength;
    const headingY = actorPoint.y - Math.cos(snapshot.actor.facingYaw) * headingLength;

    this.actorMarker.setAttribute("cx", actorPoint.x.toFixed(2));
    this.actorMarker.setAttribute("cy", actorPoint.y.toFixed(2));
    this.actorHeading.setAttribute("x1", actorPoint.x.toFixed(2));
    this.actorHeading.setAttribute("y1", actorPoint.y.toFixed(2));
    this.actorHeading.setAttribute("x2", headingX.toFixed(2));
    this.actorHeading.setAttribute("y2", headingY.toFixed(2));

    this.syncVisibility();
  }

  private rebuildRoadLayer(snapshot: WorldNavigationSnapshot): void {
    this.roadLayer.replaceChildren();

    snapshot.roads.forEach((road) => {
      const polyline = createSvgElement("polyline");
      polyline.setAttribute(
        "points",
        road.points
          .map((point) => {
            const projectedPoint = projectWorldNavigationPoint(snapshot.bounds, point);

            return `${projectedPoint.x.toFixed(2)},${projectedPoint.y.toFixed(2)}`;
          })
          .join(" ")
      );
      polyline.setAttribute("class", `world-navigation-hud__road world-navigation-hud__road--${road.kind}`);
      polyline.setAttribute("stroke-width", String(getRoadStrokeWidth(road)));
      this.roadLayer.append(polyline);
    });
  }

  private syncVisibility(): void {
    this.root.hidden = !(this.isVisible && this.hasSnapshot);
  }
}
