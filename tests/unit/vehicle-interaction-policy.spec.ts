import { describe, expect, it } from "vitest";
import { isVehicleHijackInteractionAllowed } from "../../src/sandbox/on-foot/vehicle-interaction-policy";

describe("vehicle interaction policy", () => {
  it("only allows explicitly hijackable vehicles into the hijack interaction path", () => {
    expect(
      isVehicleHijackInteractionAllowed({
        mesh: {
          metadata: {
            interactionRole: "hijackable"
          }
        }
      })
    ).toBe(true);

    expect(
      isVehicleHijackInteractionAllowed({
        mesh: {
          metadata: {
            interactionRole: "traffic"
          }
        }
      })
    ).toBe(false);

    expect(
      isVehicleHijackInteractionAllowed({
        mesh: {
          metadata: {
            interactionRole: "active"
          }
        }
      })
    ).toBe(false);
  });
});
