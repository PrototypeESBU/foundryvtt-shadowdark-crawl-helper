
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
        super();

        Hooks.on('deleteCombat', this._onDeleteCombat.bind(this));
        Hooks.on('updateCombat', this._onUpdateCombat.bind(this));

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
        context.started = game?.combat?.started;
        return context;
    }

    async _preparePartContext(partId, context, options) {
        if (partId === "main") {
            context.isGM = game.user.isGM;
            if(game.combat) { 
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

    async _onDeleteCombat(document, changed, options, userId) { 
        this.close({animate:false});
    }

    async _onUpdateCombat(document, changed, options, userId) {
        if (game?.combat?.started) { 
            if (("round" in changed)||("turn" in changed))  {
                await this._updateTurn(options.direction);
            }
        }
        this.render(true);
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

    static async startCrawling(event, target) {
        if (game.user.isGM) game.crawlHelper.gmtools.startCrawling();
    }

    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    async _updateTurn(direction) {

        //if current player's turn
        if ((game.user.character?.id) && (game.combat?.combatant?.actorId === game.user.character?.id)){

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