import type { CombatEvent, CombatWeaponId } from "../../sandbox/combat/combat-runtime";

interface WorldCombatHudOptions {
  host: HTMLElement;
}

export class WorldCombatHud {
  private readonly root: HTMLDivElement;
  private readonly crosshair: HTMLDivElement;
  private readonly weaponLabel: HTMLDivElement;
  private readonly flashOverlay: HTMLDivElement;

  private impactTimeout: number | null = null;
  private isVisible = false;
  private activeWeaponId: CombatWeaponId | null = null;
  private hitMarkerTimeout: number | null = null;
  private flashTimeout: number | null = null;

  constructor(options: WorldCombatHudOptions) {
    this.root = document.createElement("div");
    this.root.className = "world-combat-hud";
    this.root.dataset.testid = "world-combat-hud";
    this.root.setAttribute("aria-hidden", "true");
    this.root.style.pointerEvents = "none";
    this.root.hidden = true;

    this.flashOverlay = document.createElement("div");
    this.flashOverlay.className = "world-combat-hud__flash";

    this.crosshair = document.createElement("div");
    this.crosshair.className = "world-combat-hud__crosshair";

    this.weaponLabel = document.createElement("div");
    this.weaponLabel.className = "world-combat-hud__weapon";

    this.root.append(this.flashOverlay, this.crosshair, this.weaponLabel);
    options.host.append(this.root);
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.root.hidden = !this.isVisible;
  }

  updateWeapon(weaponId: CombatWeaponId): void {
    if (this.activeWeaponId !== weaponId) {
      this.activeWeaponId = weaponId;
      this.weaponLabel.textContent = `WEAPON: ${weaponId.toUpperCase()}`;
    }
  }

  clear(): void {
    if (this.flashTimeout !== null) {
      window.clearTimeout(this.flashTimeout);
      this.flashTimeout = null;
    }

    if (this.hitMarkerTimeout !== null) {
      window.clearTimeout(this.hitMarkerTimeout);
      this.hitMarkerTimeout = null;
    }

    if (this.impactTimeout !== null) {
      window.clearTimeout(this.impactTimeout);
      this.impactTimeout = null;
    }

    this.activeWeaponId = null;
    this.weaponLabel.textContent = "";
    this.crosshair.classList.remove("world-combat-hud__crosshair--hit");
    this.flashOverlay.classList.remove("world-combat-hud__flash--active");
    this.root.classList.remove("world-combat-hud--impact");
  }

  triggerFire(): void {
    this.flashOverlay.classList.remove("world-combat-hud__flash--active");
    // force reflow
    void this.flashOverlay.offsetWidth;
    this.flashOverlay.classList.add("world-combat-hud__flash--active");

    if (this.flashTimeout !== null) {
      window.clearTimeout(this.flashTimeout);
    }
    this.flashTimeout = window.setTimeout(() => {
      this.flashOverlay.classList.remove("world-combat-hud__flash--active");
    }, 50);
  }

  triggerHit(): void {
    this.crosshair.classList.add("world-combat-hud__crosshair--hit");

    if (this.hitMarkerTimeout !== null) {
      window.clearTimeout(this.hitMarkerTimeout);
    }
    this.hitMarkerTimeout = window.setTimeout(() => {
      this.crosshair.classList.remove("world-combat-hud__crosshair--hit");
    }, 150);
  }

  triggerImpact(): void {
    this.root.classList.add("world-combat-hud--impact");

    if (this.impactTimeout !== null) {
      window.clearTimeout(this.impactTimeout);
    }

    this.impactTimeout = window.setTimeout(() => {
      this.root.classList.remove("world-combat-hud--impact");
    }, 180);
  }

  processEvents(events: readonly CombatEvent[]): void {
    let fired = false;
    let hit = false;
    for (const event of events) {
      if (event.type === "combat.weapon.fired") fired = true;
      if (event.type === "combat.target.hit") hit = true;
    }
    if (fired) this.triggerFire();
    if (hit) this.triggerHit();
  }

  processImpactEventTypes(eventTypes: readonly string[]): void {
    if (eventTypes.some((eventType) => eventType === "prop.broken" || eventType === "vehicle.damaged")) {
      this.triggerImpact();
    }
  }
}
