import registerSettings from "./scripts/settings.mjs";

// -----------------------------------------------
// Hooks Once: Triggers only one time per event
// -----------------------------------------------
// Init: triggered when the module is first initialized
Hooks.once("init", () => {
    registerSettings();
});

// -----------------------------------------------
// Hooks On: Triggers once per event
// -----------------------------------------------
// Ready: triggers once the module is fully loaded
Hooks.on("ready", async () => {
    console.log("Crawl Helper Ready");
});