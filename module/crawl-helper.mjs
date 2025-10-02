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
    
});

// -----------------------------------------------
// Triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {

    if (game.user.isGM){
        //Check if there are non crawl or non active combats and delete
        game.combats.forEach(c => {
            if(c.type !== "shadowdark-crawl-helper.crawl" || c.id != game.combat?.id) {
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
        game.crawlHelper.gmtools._connectSceneTokens();
    }

    // initialize carousel
    const carouselSetting = game.settings.get("shadowdark-crawl-helper", "carousel");
    const lightsOut = game.modules.get("lights-out-theme-shadowdark")?.active;
    const useLightsOut = (carouselSetting === 2 || (carouselSetting === 0 && lightsOut));

    
    if( carouselSetting < 3) {
        // load correct template
        let template = {};
        if (useLightsOut) {
            template = {combatant:"modules/shadowdark-crawl-helper/templates/lights-out-combatant.hbs"};
        }
        else {
            template = {combatant:"modules/shadowdark-crawl-helper/templates/combatant.hbs"};
        }
        loadTemplates(template);

        // initialze carousel
        game.crawlHelper.carousel = new actorCarousel(useLightsOut);
        if(game?.combat?.started) game.crawlHelper.carousel.render(true);
    } 

    // show release notes if needed
    if (game.user.isGM) {
        const lastVersion = game.settings.get("shadowdark-crawl-helper", "lastVersion");
        const currentVersion = game.modules.get("shadowdark-crawl-helper").version;

        if (lastVersion !== currentVersion) {
            const response = await fetch("modules/shadowdark-crawl-helper/release-notes.html");
            if (!response.ok) throw new Error(`Failed to load ${path}`);
            const html = await response.text()

            new foundry.applications.api.DialogV2({
                window: {title: "Release Notes"},
                position: {width:600},
                classes: ["release-notes"],
                content: `<header>Crawl Helper</header>${html}`,
                buttons: [{label: "Close"}],
            }).render(true)

            game.settings.set("shadowdark-crawl-helper", "lastVersion", currentVersion);
        }
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
        if (combatant.actorId && (game.actors.get(combatant.actorId)?.type === "Player")) {
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
    //prevent more then one crawl at a time
    game.combats.forEach(c => {
        if (c.id !== combat.id) c.delete();
    })
});

Hooks.on("preUpdateCombat", async (combat, changed, options, userId) => 
{
    //prevent linking crawls to a scene
    if (changed?.scene) {
        changed.scene = null;
        ui.notifications.error("Error: Crawls cannot be linked in this way");
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

