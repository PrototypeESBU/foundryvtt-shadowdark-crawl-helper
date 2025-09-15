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

    if (game.user.isGM){
        //Check if there are non crawl or non active combats and delete
        game.combats.combats.forEach(c => {
            if(c.type !== "shadowdark-crawl-helper.crawl" || c.id != game.combat.id) {
                c.delete();
            }
        })
    }

    // Persistent apps placeholder
    game.crawlHelper = {
        tracker: new crawlTracker()
    };

    if(game?.combat?.started) {
        game.crawlHelper.tracker.render(true);
    }

    if(game.user.isGM) {
        game.crawlHelper.gmtools = new gmTools();
        game.crawlHelper.gmtools.render(true);
    }

    if(game.settings.get("shadowdark-crawl-helper", "carousel")) {
        game.crawlHelper.carousel = new actorCarousel();
        if(game?.combat?.started) game.crawlHelper.carousel.render(true);
    } 

});


// -----------------------------------------------
// Combatant Triggers
// -----------------------------------------------
Hooks.on("preCreateCombatant", async (combatant, data, options, userId) => 
{
    //Enforce crawler combatant type
    if (combatant?.type === "base") {
        //switch type to crawler
        const updateData = {type: "shadowdark-crawl-helper.crawler"};
        // TODO use a better way of detecting player types post v4.0.0 rollout
        if (combatant.actorId && (game.actors.get(combatant.actorId).type === "Player")) {
            updateData.system = {"type": "Player"};
        } else {
            const masked = game.settings.get("shadowdark-crawl-helper", "npc-default-masked") ?? false;
            updateData.system = {
                "type": "NPC",
                "isMasked": masked,
            };
        }
        await combatant.updateSource(updateData, {recursive: false});
    }
});

Hooks.on("preCreateCombat", async (combat, data, options, userId) => 
{
    //Enforce crawl combat type
    if (combat?.type !== "shadowdark-crawl-helper.crawl") {
        const updateData = {type: "shadowdark-crawl-helper.crawl", system: {}};
         await combat.updateSource(updateData, {recursive: false});
    }
});

Hooks.on("createCombat", async (combat, data, options, userId) => 
{
    //prevent more then one combat at a time
    if (game.combats.size > 1) {
        await game.combats.combats[0].activate();
        combat.delete();
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

