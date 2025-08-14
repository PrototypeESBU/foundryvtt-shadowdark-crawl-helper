
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
        super();

        Hooks.on('deleteCombat', this._onDeleteCombat.bind(this));
        Hooks.on('updateCombat', this._onUpdateCombat.bind(this));
        Hooks.on('deleteCombatant', this._onDeleteCombatant.bind(this));
        Hooks.on('updateCombatant', this._onUpdateCombat.bind(this));
        Hooks.on("canvasReady", this._onSceneChange.bind(this));

    }

    static DEFAULT_OPTIONS = {
        id: "crawlTracker",
        classes: ["crawl-tracker", "application", "faded-ui"],
        position: {
            width: 200,
            height: "auto",
        },
        window: {
            frame: false,
        },
        actions: {
            startCrawling: this.startCrawling,
            toggleCombat: this.toggleCombat,
        }
    };

    static PARTS = {
        main: {
          template: "./modules/shadowdark-crawl-helper/templates/crawl-tracker.hbs"
        }
    }

    // -----------------------------------------------
    //  Parent Override Functions
    // -----------------------------------------------

    async _preFirstRender(context, options) {
        const uiLeft = document.getElementById("ui-left-column-1");
        uiLeft.insertAdjacentHTML("beforeend", `<template id="crawlTracker"></template>`);
    }
    /** @override */
    _prePosition(pos = {}) {
        foundry.utils.mergeObject(pos, {
            left: 0,
            top: 0
        });
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['main']
    }

    async _prepareContext(context, options) {
        if(game.combat?.started) context.started = true;
        return context;
    }

    async _preparePartContext(partId, context, options) {
        if(game.combat) {
            if (partId === "main") {
                context.isGM = game.user.isGM;
                context.round = game.combat.round;
                context.inCombat = game.combat.system.inCombat;
                context.mode = game.combat.system.inCombat ? 
                    game.i18n.localize("CRAWLHELPER.combat") : //combat
                    game.i18n.localize("CRAWLHELPER.crawling"); // Crawling
                context.nextEncounter = game.combat.system.nextEncounter;
            }
        }
        return context;
    }

    _onRender(context, options) {

        if (game.modules.get("lights-out-theme-shadowdark")?.active) {
            this.classList.add("lights-out-tracker");
        }
    }
    // -----------------------------------------------
    // Hook Callbacks
    // -----------------------------------------------

    //Combatants
    async _onDeleteCombatant(combatant, updates){ 
        if(combatant.id === game.combat.system.gmId && game.user.isGM){
            await game.combat.update({"system.gmId": null})
        }
    };

    async _onUpdateCombatant(combatant, updates) {
        // TODO check for < 50% defeated and call moral check
    }

    //Combat

    async _onDeleteCombat(document, changed, options, userId) { 
        if (game.user.isGM) {
            await this.initializeCrawl();
            this.render(true);
        }
        else {
            this.close({animate:false});
        }
    }

    async _onUpdateCombat(document, changed, options, userId) {
        if (game?.combat?.started) { 
            if (("round" in changed)||("turn" in changed))  {
                await this._updateTurn(options.direction);
            }
            this.render();
        }
    }

    // other
    async _onSceneChange(canvas) {
        if (game.combat && game.user.isGM) 
            this.connectSceneTokens();
    }

    // -----------------------------------------------
    // Action Functions
    // -----------------------------------------------

    static async toggleCombat(event, target) {
        //turn off combat
        if (game.combat.system.inCombat) {
           await game.crawlHelper.gmtools.stopCombat();
        }
        //turn on combat
        else {
           await await game.crawlHelper.gmtools.startCombat();
        }
    }

    // -----------------------------------------------
    // Public functions
    // -----------------------------------------------
    async initializeCrawl() { // loads tracking data from an exiting combat on initialization

        if (game.user.isGM) {
            //Check if there is a crawl loaded already
            if (game?.combat?.type !== "shadowdark-crawl-helper.crawl") {
                await Combat.create({type:"shadowdark-crawl-helper.crawl"});
            }

            if (game.combat._source.scene) game.combat.toggleSceneLink();  
        } 

        if(game?.combat?.started || game.user.isGM){
            this.render(true);
            game.crawlHelper?.carousel?.render(true); //TODO is this even needed?
        }
    }

    async connectSceneTokens() { //connects scene tokens to player placeholders in crawl
        const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

        for (const actor of partyActors) {
            //gets first combatant and token and matches them 
            const combatant = game.combat.combatants.find(c => c.actorId === actor.id); 
            const token = game.scenes.active.tokens.find(t => t.actorId === actor.id);
            if (combatant && token) {
                game.combat.updateEmbeddedDocuments("Combatant", [{
                    "_id": combatant.id,
                    tokenId: token.id,
                    sceneId: game.scenes.active.id,
                    actorId: actor.id,
                    name: actor.name, 
                    img: actor.img, 
                }]);
            }
        }
    }

    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    async _updateTurn(direction) {

        //if current player's turn
        if (game.combat.combatant.actorId === game.user.character?.id){

            const notifyOnTurn = game.settings.get("shadowdark-crawl-helper", "notify-on-turn");
            const soundOnTurn = game.settings.get("shadowdark-crawl-helper", "sound-on-turn");
            const soundOnTurnPath = game.settings.get("shadowdark-crawl-helper", "sound-on-turn-path");

            if(soundOnTurn && soundOnTurnPath) {
                await foundry.audio.AudioHelper.play({
                    src: soundOnTurnPath,
                    volume: 1,
                    autoplay: true,
                }, false)
            }
            if (notifyOnTurn)
                ui.notifications.info(game.i18n.localize("CRAWLHELPER.turn-notification"));
        }

    }


}