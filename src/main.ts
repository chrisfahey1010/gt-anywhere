import "./styles.css";
import { createGameApp } from "./app/bootstrap/create-game-app";

const host = document.querySelector("#app");

if (!(host instanceof HTMLElement)) {
  throw new Error("App root element '#app' was not found.");
}

void createGameApp({ host }).catch((error) => {
  console.error("app.bootstrap.failed", error);
  host.innerHTML = `
    <main class="location-shell">
      <section class="location-card">
        <h1>Unable to start the session shell</h1>
        <p class="error-message">Reload the page and try again.</p>
      </section>
    </main>
  `;
});
