import registerSettings from "./scripts/settings.mjs";
import crawlTracker from "./scripts/apps/crawl-tracker.mjs";
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
        tracker: new crawlTracker(),
        crawlingHelperMacro: new crawlingHelperMacro()
    };
    
});

// -----------------------------------------------
// Triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {
    //Setup a crawl
    await game.crawlHelper.tracker.initializeCrawl();

    //collaspe nav bar 
    if(game.settings.get("shadowdark-crawl-helper", "carousel")) {
        await ui.nav.collapse();
        await ui.nav.render();
    }
});

// -----------------------------------------------
// Combat Triggers
// -----------------------------------------------

Hooks.on('updateCombat', async (document, changed, options, userId) => {
    game.crawlHelper.tracker.onUpdateCombat(changed,options);
});

Hooks.on('deleteCombat', async (document, changed, options, userId) => {
    game.crawlHelper.tracker.onDeleteCombat(document); 
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
    game.crawlHelper.tracker.onCreateCombatant(combatant, updates);
});

Hooks.on('deleteCombatant', async (combatant, updates) => {
    game.crawlHelper.tracker.onDeleteCombatant(combatant, updates);
});

Hooks.on('updateCombatant', async (combatant, updates) => {
    game.crawlHelper.tracker.onUpdateCombatant(combatant, updates);
});

Hooks.on('updateActor', async (actor, updates) => {
    game.crawlHelper.tracker.onUpdateActor(actor, updates);
});

// -----------------------------------------------
// UI Triggers
// -----------------------------------------------
Hooks.on("collapseSidebar", async (sidebar, collapsed) => {
    game.crawlHelper.tracker.onSideBarChange();
});

Hooks.on('renderSceneNavigation', async (application, html, data) => { 
    // TODO only if Carousel is on
    ui.nav.element.addClass("verticle");
});

Hooks.on("renderSidebar", async function(app, html) {
    //hide combat tracker
    document.querySelector('#sidebar [data-tab="combat"]').classList.add("hidden");
});

// -----------------------------------------------
// Other triggers
// -----------------------------------------------

Hooks.on("canvasReady", async (canvas) => {
    game.crawlHelper.tracker.onSceneChange(canvas);
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
