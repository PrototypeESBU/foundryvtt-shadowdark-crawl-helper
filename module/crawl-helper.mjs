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
        "shadowdark-crawl-helper.crawler": crawlCombatant
    });
  
    // load settings
    registerSettings();

    // load templates
    loadTemplates({
        combatant:"modules/shadowdark-crawl-helper/templates/combatant.hbs"
    });

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
    //Setup and render apps
    await game.crawlHelper.crawlTracker.initializeCrawl();
    await game.crawlHelper.actorCarousel.render(true);
    

    //collaspe nav bar 
    // TODO only if actorCarousel is on
    await ui.nav.collapse();
    await ui.nav.render();
});

// -----------------------------------------------
// Combat Triggers
// -----------------------------------------------

Hooks.on('updateCombat', async (document, changed, options, userId) => {
    game.crawlHelper.actorCarousel.onUpdateCombat(changed,options);
    game.crawlHelper.crawlTracker.onUpdateCombat(changed,options);
});

Hooks.on('deleteCombat', async (document, changed, options, userId) => {
    game.crawlHelper.crawlTracker.onDeleteCombat(document); 
    game.crawlHelper.actorCarousel.render(true);
});

// -----------------------------------------------
// Combatant Triggers
// -----------------------------------------------
Hooks.on("preCreateCombatant", async (combatant, data, options, userId) => 
    {
        if (combatant.type === "base") {
            //switch type to crawler
            const updateData = {type: "shadowdark-crawl-helper.crawler"};
            if (combatant.actorId && (game.actors.get(combatant.actorId).type === "Player")) {
                updateData.system = {"type": "Player"};
            }
            await combatant.updateSource(updateData);
        }
});

Hooks.on('createCombatant', async (combatant, updates) => {
    game.crawlHelper.actorCarousel.onCreateCombatant(combatant, updates);
});

Hooks.on('deleteCombatant', async (combatant, updates) => {
    game.crawlHelper.actorCarousel.onDeleteCombatant(combatant, updates);
});

Hooks.on('updateCombatant', async (combatant, updates) => {
    game.crawlHelper.actorCarousel.onUpdateCombatant(combatant, updates);
});

// -----------------------------------------------
// UI Triggers
// -----------------------------------------------
Hooks.on("collapseSidebar", async (sidebar, collapsed) => {
    game.crawlHelper.actorCarousel.render();
    game.crawlHelper.crawlTracker.render();
});

Hooks.on('renderSceneNavigation', async (application, html, data) => { 
    // TODO only if actorCarousel is on
    ui.nav.element.addClass("verticle");
});

// -----------------------------------------------
// Other triggers
// -----------------------------------------------

Hooks.on("canvasReady", async (canvas) => {
    game.crawlHelper.crawlTracker.onSceneChange(canvas);
});


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
