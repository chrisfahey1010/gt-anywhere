import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resolveVehicleInteractionTarget,
  type VehicleInteractionCandidate,
  type VehicleInteractionRuntime
} from "../../src/sandbox/on-foot/vehicle-interaction-target";

interface TestVehicleRuntime extends VehicleInteractionRuntime {
  physicsAggregate: {
    body: {
      getLinearVelocity(): Vector3;
      setAngularVelocity(): void;
      setLinearVelocity(): void;
    };
  };
}

describe("vehicle interaction target resolution", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    root = new TransformNode("world-root", scene);
  });

  afterEach(() => {
    root.dispose();
    scene.dispose();
    engine.dispose();
  });

  function createCandidate(
    name: string,
    position: Vector3,
    isStoredVehicle: boolean = false
  ): VehicleInteractionCandidate<TestVehicleRuntime> {
    const mesh = MeshBuilder.CreateBox(name, { size: 1 }, scene);
    mesh.parent = root;
    mesh.position.copyFrom(position);

    return {
      isStoredVehicle,
      vehicle: {
        mesh,
        physicsAggregate: {
          body: {
            getLinearVelocity: () => Vector3.Zero(),
            setAngularVelocity: () => {},
            setLinearVelocity: () => {}
          }
        }
      }
    };
  }

  it("prefers the smallest facing angle before a shorter distance", () => {
    const target = resolveVehicleInteractionTarget({
      actorPosition: Vector3.Zero(),
      candidates: [
        createCandidate("closer-off-axis", new Vector3(3.4, 0, 3.4)),
        createCandidate("farther-centered", new Vector3(0.4, 0, 5.5))
      ],
      facingYaw: 0,
      interactionRange: 6
    });

    expect(target?.vehicle.mesh.name).toBe("farther-centered");
  });

  it("breaks exact ties by preferring the stored vehicle and then a stable runtime identifier", () => {
    const nonStored = createCandidate("hijackable-b", new Vector3(0, 0, 4));
    const stored = createCandidate("starter-vehicle-a", new Vector3(0, 0, 4), true);

    expect(
      resolveVehicleInteractionTarget({
        actorPosition: Vector3.Zero(),
        candidates: [nonStored, stored],
        facingYaw: 0,
        interactionRange: 6
      })?.vehicle.mesh.name
    ).toBe("starter-vehicle-a");

    expect(
      resolveVehicleInteractionTarget({
        actorPosition: Vector3.Zero(),
        candidates: [
          createCandidate("hijackable-z", new Vector3(0, 0, 4)),
          createCandidate("hijackable-a", new Vector3(0, 0, 4))
        ],
        facingYaw: 0,
        interactionRange: 6
      })?.vehicle.mesh.name
    ).toBe("hijackable-a");
  });
});
