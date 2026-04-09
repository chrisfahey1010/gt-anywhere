import { describe, expect, it } from "vitest";
import { planTrafficVehicleControls } from "../../src/traffic/agents/traffic-driving";

describe("traffic driving rules", () => {
  it("accelerates toward the route target when the lane is clear", () => {
    const controls = planTrafficVehicleControls({
      currentSpeed: 2,
      obstacleDistance: null,
      steeringAngleRadians: 0.05,
      targetSpeed: 8
    });

    expect(controls.throttle).toBeGreaterThan(controls.brake);
    expect(controls.handbrake).toBe(false);
    expect(Math.abs(controls.steering)).toBeLessThan(0.2);
  });

  it("brakes instead of accelerating into a blocked gap", () => {
    const controls = planTrafficVehicleControls({
      currentSpeed: 7,
      obstacleDistance: 3.5,
      steeringAngleRadians: 0,
      targetSpeed: 10
    });

    expect(controls.brake).toBeGreaterThan(controls.throttle);
    expect(controls.handbrake).toBe(false);
  });

  it("keeps steering input clamped while turning toward an off-axis route target", () => {
    const controls = planTrafficVehicleControls({
      currentSpeed: 5,
      obstacleDistance: null,
      steeringAngleRadians: Math.PI,
      targetSpeed: 9
    });

    expect(controls.steering).toBeGreaterThan(0);
    expect(controls.steering).toBeLessThanOrEqual(1);
  });
});
