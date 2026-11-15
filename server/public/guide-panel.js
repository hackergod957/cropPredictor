import { getCropGuide } from "./crop-guides.js";

const guidePanel = document.querySelector("#farming-guide");
let selectedCropButton;

export function closeGuide(restoreFocus = false) {
  guidePanel.hidden = true;
  selectedCropButton?.setAttribute("aria-expanded", "false");
  if (restoreFocus && selectedCropButton?.isConnected)
    selectedCropButton.focus();
  selectedCropButton = undefined;
}

document
  .querySelector("#close-guide")
  .addEventListener("click", () => closeGuide(true));
guidePanel.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeGuide(true);
});

export function openGuide(crop, button, context) {
  const guide = getCropGuide(crop);
  if (!guide) {
    return;
  }
  closeGuide();
  selectedCropButton = button;
  button.setAttribute("aria-expanded", "true");
  const title = document.querySelector("#guide-title");
  title.textContent = `How to grow ${guide.name.toLowerCase()}`;
  document.querySelector("#guide-system").textContent = guide.system;
  const { data, lat, lon } = context;
  document.querySelector("#guide-location").textContent =
    `Location: ${lat.toFixed(4)}°, ${lon.toFixed(4)}° · Annual temperature: ${data.temperature} °C · Annual relative humidity: ${data.humidity}% · Soil pH: ${data.ph}${data.ph_is_default ? " (default estimate)" : ""}. Annual averages; check local seasonal conditions before planting.`;
  document.querySelector("#guide-steps").replaceChildren(
    ...guide.steps.map((step, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      number.className = "guide-step-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const content = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = step.title;
      const text = document.createElement("p");
      text.textContent = step.text;
      content.append(heading, text);
      item.append(number, content);
      return item;
    }),
  );
  const source = document.querySelector("#guide-source");
  source.href = guide.source.url;
  source.textContent = `${guide.source.title} ↗`;
  guidePanel.hidden = false;
  guidePanel.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
    block: "start",
  });
  title.focus({ preventScroll: true });
}
