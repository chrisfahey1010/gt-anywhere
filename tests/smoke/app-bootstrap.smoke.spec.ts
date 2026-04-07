import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import { validLocationQuery } from "../fixtures/location-queries";

describe("app bootstrap smoke", () => {
  it("boots to the location shell and advances on a valid submission", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const app = await createGameApp({ host });

    expect(host.textContent).toContain("Enter a real-world location");

    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-generation-requested");
    expect(host.textContent).toContain("Loading");
  });
});
