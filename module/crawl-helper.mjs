import registerSettings from "./scripts/settings.mjs";

// -----------------------------------------------
// Hooks on Init: triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {
    registerSettings();
});

// -----------------------------------------------
// Hooks on Ready: triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {
    console.log("Crawl Helper Ready");
});