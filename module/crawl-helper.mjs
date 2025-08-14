import registerSettings from "./scripts/settings.mjs";
import actorCarousel from "./scripts/apps/actor-carousel.mjs";
import crawlTracker from "./scripts/apps/crawl-tracker.mjs";
import gmTools from "./scripts/apps/gm-tools.mjs";
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
    if (game.modules.get("lights-out-theme-shadowdark")?.active){
        loadTemplates({combatant:"modules/shadowdark-crawl-helper/templates/lights-out-combatant.hbs"});
    }
    else{
        loadTemplates({combatant:"modules/shadowdark-crawl-helper/templates/combatant.hbs"});
    }


    
});

// -----------------------------------------------
// Triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {

    // Initialize persistent apps and variables
    game.crawlHelper = {
        tracker: new crawlTracker(),
    };

    if(game.settings.get("shadowdark-crawl-helper", "carousel")) {
        game.crawlHelper.carousel = new actorCarousel();
    }  

    if(game.user.isGM) {
        game.crawlHelper.gmtools = new gmTools();
        game.crawlHelper.gmtools.render(true);
    }

    //Setup a crawl
    await game.crawlHelper.tracker.initializeCrawl();

});


// -----------------------------------------------
// Combatant Triggers
// -----------------------------------------------
Hooks.on("preCreateCombatant", async (combatant, data, options, userId) => 
    {
        if (combatant?.type === "base") {
            //switch type to crawler
            const updateData = {type: "shadowdark-crawl-helper.crawler"};
            // TODO use a better way of detecting player types post v4.0.0 rollout
            if (combatant.actorId && (game.actors.get(combatant.actorId).type === "Player")) {
                updateData.system = {"type": "Player"};
            } else {
                updateData.system = {"type": "NPC"};
            }
            await combatant.updateSource(updateData, {recursive: false});
        }
});


// -----------------------------------------------
// UI Triggers
// -----------------------------------------------

Hooks.on("renderTokenHUD", async function(app, html) {
    const combatHub = html.querySelector("[data-action=combat]");
    
    if (combatHub.classList.contains("active")){
        combatHub.innerHTML = '<i class="fa-solid fa-minus"></i>';
        combatHub.setAttribute('data-tooltip', "CRAWLHELPER.token-hud.remove");
    }
    else {
        combatHub.innerHTML = '<i class="fa-solid fa-plus"></i>';
        combatHub.setAttribute('data-tooltip', "CRAWLHELPER.token-hud.add");
    }
});

