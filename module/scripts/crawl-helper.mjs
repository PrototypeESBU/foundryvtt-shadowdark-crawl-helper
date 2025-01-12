import registerSettings from "./settings.mjs";
import crawlTracker from "./apps/crawl-tracker.mjs";
import crawlingHelperMacro from "./apps/crawling-helper-macro.mjs";

// -----------------------------------------------
// Hooks on Init: triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {
    registerSettings();

    // Initialize persistent apps and variables
    game.crawlHelper = {
        crawlTracker: new crawlTracker(),
        crawlingHelperMacro: new crawlingHelperMacro()
    };
});

// -----------------------------------------------
// Hooks on Ready: triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {
    // Show crawlTracker
    game.crawlHelper.crawlTracker.render(true);

    console.warn("Crawl Helper Ready");
});

// -----------------------------------------------
// Hook: Add Button to Token Layer Controls
// -----------------------------------------------
Hooks.on("getSceneControlButtons", (controls) => {
    // Only GMs should see the button
    if (game.user.isGM) {
        // Find the Token layer controls
        let tokenControls = controls.find(control => control.name === "token");

        if (tokenControls) {
            // Add a new button to the Token layer
            tokenControls.tools.push({
                name: "crawl-helper-toggle",
                title: "Crawling Helper",
                icon: "fas fa-dungeon",  // Dungeon icon (FontAwesome)
                toggle: true,            // Makes it a toggle button
                active: false,           // Default state is off
                onClick: (toggled) => {
                    if (toggled) {
                        game.crawlHelper.crawlingHelperMacro.render(true);  // Open the dialog
                        ui.notifications.info("🗺️ Crawling Helper opened.");
                    } else {
                        game.crawlHelper.crawlingHelperMacro.close();       // Close the dialog
                        ui.notifications.info("🛑 Crawling Helper closed.");
                    }
                }
            });

            console.log("🛠️ Crawling Helper | Token Layer Button Added");
        }
    }
});
