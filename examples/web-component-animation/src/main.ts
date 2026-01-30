import { Helios } from "@helios-project/core";
import { MyCard } from "./components/MyCard";

// Register custom element
customElements.define("my-card", MyCard);

// Initialize Helios
const helios = new Helios({
  fps: 30,
  durationInSeconds: 5,
  width: 1920,
  height: 1080,
  autoSyncAnimations: true,
});

helios.bindToDocumentTimeline();
