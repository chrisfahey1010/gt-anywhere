import type { HeatRuntimeSnapshot } from "../../sandbox/heat/heat-runtime";

interface WorldHeatHudOptions {
  host: HTMLElement;
}

function formatHeatIncidentLabel(incidentType: HeatRuntimeSnapshot["recentEvents"][number]["incidentType"]): string {
  switch (incidentType) {
    case "combat.weapon.fired":
      return "PUBLIC GUNFIRE";
    case "pedestrian.struck":
      return "PEDESTRIAN HIT";
    case "prop.broken":
      return "PROP DAMAGE";
    case "vehicle.damaged":
      return "VEHICLE DAMAGE";
  }
}

export class WorldHeatHud {
  private readonly root: HTMLDivElement;

  private readonly stageLabel: HTMLDivElement;

  private readonly scoreLabel: HTMLDivElement;

  private readonly eventLabel: HTMLDivElement;

  private readonly pips: HTMLSpanElement[];

  private hasSnapshot = false;

  private isVisible = false;

  constructor(options: WorldHeatHudOptions) {
    this.root = document.createElement("div");
    this.root.className = "world-heat-hud";
    this.root.dataset.testid = "world-heat-hud";
    this.root.setAttribute("aria-hidden", "true");
    this.root.style.pointerEvents = "none";
    this.root.hidden = true;

    const title = document.createElement("div");
    title.className = "world-heat-hud__title";
    title.textContent = "HEAT";

    this.stageLabel = document.createElement("div");
    this.stageLabel.className = "world-heat-hud__stage";

    this.scoreLabel = document.createElement("div");
    this.scoreLabel.className = "world-heat-hud__score";

    const pips = document.createElement("div");
    pips.className = "world-heat-hud__pips";
    this.pips = Array.from({ length: 4 }, (_, index) => {
      const pip = document.createElement("span");

      pip.className = "world-heat-hud__pip";
      pip.dataset.level = String(index + 1);
      pips.append(pip);
      return pip;
    });

    this.eventLabel = document.createElement("div");
    this.eventLabel.className = "world-heat-hud__event";

    this.root.append(title, this.stageLabel, this.scoreLabel, pips, this.eventLabel);
    options.host.append(this.root);
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.syncVisibility();
  }

  clear(): void {
    this.hasSnapshot = false;
    this.stageLabel.textContent = "";
    this.scoreLabel.textContent = "";
    this.eventLabel.textContent = "";
    this.pips.forEach((pip) => {
      pip.classList.remove("world-heat-hud__pip--active");
    });
    this.syncVisibility();
  }

  render(snapshot: HeatRuntimeSnapshot): void {
    const latestEvent = snapshot.recentEvents[snapshot.recentEvents.length - 1] ?? null;

    this.hasSnapshot = true;
    this.stageLabel.textContent = snapshot.stage.toUpperCase();
    this.scoreLabel.textContent = `${snapshot.score}/${snapshot.maxScore}`;
    this.eventLabel.textContent = latestEvent ? formatHeatIncidentLabel(latestEvent.incidentType) : "KEEP IT COOL";
    this.pips.forEach((pip, index) => {
      pip.classList.toggle("world-heat-hud__pip--active", index < snapshot.level);
    });
    this.syncVisibility();
  }

  private syncVisibility(): void {
    this.root.hidden = !(this.isVisible && this.hasSnapshot);
  }
}
