import registerSettings from "./scripts/settings.mjs";
import crawlTracker from "./scripts/apps/crawl-tracker.mjs";
import actorCarousel from "./scripts/apps/actor-carousel.mjs";
import crawlingHelperMacro from "./scripts/apps/crawling-helper-macro.mjs";
import {crawlCombat, crawlCombatant} from "./scripts/models.mjs";

// -----------------------------------------------
// Triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {
    // load combat and combatant data model sub-types
    Object.assign(CONFIG.Combat.dataModels, {
        "shadowdark-crawl-helper.crawl": crawlCombat
    });
    Object.assign(CONFIG.Combatant.dataModels, {
        "shadowdark-crawl-helper.crawlActor": crawlCombatant
    });
  
    registerSettings();

    // Initialize persistent apps and variables
    game.crawlHelper = {
        crawlTracker: new crawlTracker(),
        crawlingHelperMacro: new crawlingHelperMacro(),
        actorCarousel: new actorCarousel()
    };
});

// -----------------------------------------------
// Triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {
    //show crawlTracker
    await game.crawlHelper.crawlTracker.initializeCrawl();
    if (game.user.isGM){
        game.crawlHelper.crawlTracker.render(true);
    }
    //show ActorCarousel
    game.crawlHelper.actorCarousel.render(true);
});

// -----------------------------------------------
// Combat Triggers
// -----------------------------------------------
Hooks.on('combatStart', async (combat, updateData) => {  //unsure if this is needed
    game.crawlHelper.crawlTracker.render();  
});

Hooks.on('combatTurn', async (combat, updateData, updateOptions) => {  //unsure if this is needed
    game.crawlHelper.crawlTracker.updateTurn(updateData, updateOptions.direction); 
});

Hooks.on('combatRound', async (combat, updateData, updateOptions) => {
    game.crawlHelper.crawlTracker.updateRound(updateData, updateOptions.direction);
});

Hooks.on('updateCombat', async (combat, updates) => {
    game.crawlHelper.crawlTracker.render(true);
    game.crawlHelper.actorCarousel.render(true);
});

// -----------------------------------------------
// Combatant Triggers
// -----------------------------------------------
Hooks.on('createCombatant', async (combat, updates) => {
    game.crawlHelper.actorCarousel.render(true);
});

Hooks.on('updateCombatant', async (combat, updates) => {
    game.crawlHelper.actorCarousel.render(true);
});

Hooks.on('deleteCombatant', async (combat, updates) => {
    game.crawlHelper.actorCarousel.render(true);
});

Hooks.on("preCreateCombatant", async (combatant, data, options, userId) => 
    {
        if (combatant.type === "base") {
            //switch type to crawlActor
            const updateData = {type: "shadowdark-crawl-helper.crawlActor"};
            if (combatant.actorId && (game.actors.get(combatant.actorId).type === "Player")) {
                updateData.system = {"type": "Player"};
            }
            await combatant.updateSource(updateData);
        }
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
