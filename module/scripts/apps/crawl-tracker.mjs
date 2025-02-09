import { render } from "sass";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
		super();
        this.dangerIndex = [
            "Deadly",
            "Risky",
            "Unsafe"
        ]
    }

    static DEFAULT_OPTIONS = {
        id: "crawlTracker",
        classes: ["crawl-tracker"],
        position: {
            width: 200,
            height: "auto",
        },
        window: {
            title: "Crawl Tracker",
            frame: false,
            controls: [
                {
                   icon: 'fa-solid fa-swords',
                  label: "Combat Tracker",
                  action: "openCombatTracker",
                },
              ]
        },
        actions: {
            startCrawling: this.startCrawling,
            endCrawling: this.endCrawling,
            toggleCombat: this.toggleCombat,
            addParty: this.addParty,
            toggleGameMaster: this.toggleGameMaster,
            triggerEncounter: this.triggerEncounter,
            openCombatTracker: this.openCombatTracker,
        }
    };

    static PARTS = {
        gmtools: {
            template: "./modules/shadowdark-crawl-helper/templates/crawl-tracker-gmtools.hbs"
        },
        main: {
          template: "./modules/shadowdark-crawl-helper/templates/crawl-tracker.hbs"
        }
    }

    // -----------------------------------------------
    //  Parent Override Functions
    // -----------------------------------------------

    /** @override */
    _prePosition(pos = {}) {
        const middle = document.querySelector("#ui-middle").getBoundingClientRect();
        const thisApp = this.element.getBoundingClientRect();
        foundry.utils.mergeObject(pos, {
            left: middle.right - 210,
            top: middle.bottom - thisApp.height - 15
        });
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);

        if (game.user.isGM) {
            options.parts = ['gmtools','main']
        }
        else {
            options.parts = ['main']
        }
    }
    async _prepareContext(context, options) {
        if(game.combat?.started) context.started = true;
        return context;
    }

    async _preparePartContext(partId, context, options) {
        if(game.combat) {
            if (partId === "gmtools") {
                context.danger = this.dangerIndex[game.combat.system.dangerLevel];
            }
            else if (partId === "main") {
                context.round = game.combat.round;
                context.inCombat = game.combat.system.inCombat;
                context.mode = game.combat.system.inCombat ? "Combat" : "Crawling"; //TODO needs i18n
                context.nextEncounter = game.combat.system.nextEncounter;
            }
        }
        return context;
    }

    // -----------------------------------------------
    // Action Functions
    // -----------------------------------------------

    static async startCrawling(event, target) {
        await this.initializeCrawl();
        await this._addGameMaster(); // TODO add GM at the start based on a setting
        await this._addParty(); // TODO add party based on settings
        await game.combat.startCombat();
    
    }
    static async endCrawling(event, target) {
        await game.combat.endCombat();
    }

    static async triggerEncounter(event, target) {
        this.encounter();
    }

    static async triggerEncounterCheck(event, target) {
        this.checkForEncounter();
    }

    static async toggleCombat(event, target) {
        //turn off combat
        if (game.combat.system.inCombat) {
           await this._stopCombat();
        }
        //turn on combat
        else {
           await this._startCombat();
        }
    }

    static async toggleGameMaster() {
        // TODO make this it a toggle
        this._addGameMaster();
    }

    static async toggleParty() {
        // TODO make this it a toggle
        this._addParty();
    }

    static async openCombatTracker() {
        game.combats.directory.createPopout().render(true);
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
        }
    }

    async onSceneChange(canvas) {
        if (game.combat) this._connectSceneTokens();
    }

    async onUpdateCombat(changes, options) { 
        if ("turn" in changes) {
            this._updateTurn(options.direction);
        }
        if ("round" in changes) {
            this._updateRound();
        }
        if (game.combat) {
            this.render();
        }
    }

    async onDeleteCombat() { 
        if (game.user.isGM) {
            this.render(true);
        }
        else {
            this.close({animate:false});
        }
    }

    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    async _addGameMaster() {
        if (!game.combat.combatants.map(c => c.id).includes(game.combat.system.gmId)) {
            const gm = await game.combat.createEmbeddedDocuments("Combatant", [{
                name: "Game Master", 
                type: "shadowdark-crawl-helper.crawler",
                system: {type:"GM"},
                img: "modules/shadowdark-crawl-helper/assets/dungeon-master.png", // TODO needs to be a default config and setting 
                hidden: false
            }]);
            await game.combat.update({"system.gmId": gm[0].id})
        }
    }

    async _addParty() {
        //get all party members
        const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

        //get exiting combatants
        const combatantActorsIDs = game.combat.combatants
        .map(combatant => combatant.actorId);

        //create placeholder combatants if not already added
        for (const actor of partyActors) {
            //add any missing actors to combants
            if (!combatantActorsIDs.includes(actor.id)) {
                await game.combat.createEmbeddedDocuments("Combatant", [{
                    actorId: actor.id,
                    name: actor.name, 
                    img: actor.img, 
                    hidden: false
                }]);
            }
        }
        this._connectSceneTokens();
    }

    async _connectSceneTokens() { //connects scene tokens to player placeholders in crawl
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

    async _startCombat() {
        // save crawling Initiative
        for (const combatant of game.combat.combatants) {
            await combatant.update({"system.crawlingInit": combatant.initiative});
        }
        //reset Initiative
        game.combat.resetAll();
        await game.combat.update({"system.inCombat": true})

        // TODO maybe a setting to auto role initative?
    }

    async _stopCombat() {
            //Remove NPCs from tracker
            // TODO should this be done only based on a setting of auto remove Monsters or something like that?
            const npcs = game.combat.combatants
                .filter(c => c.system.type === "NPC")
                .map(c => c.id);
            await game.combat.deleteEmbeddedDocuments("Combatant", npcs);

            // restore saved crawling Initiative
            for (const combatant of game.combat.combatants) {
                await game.combat.setInitiative(combatant.id, combatant.system.crawlingInit);
            }

            // Reset nexEncounter
            await game.combat.update({"system": {
                "inCombat": false,
                "nextEncounter": game.combat.round + game.combat.system.dangerLevel + 1
            }})

            // start a fresh round
            await game.combat.nextRound();
    }

    async _gmTurn() { //Automatic activites that run on the GM turn
        //test for encounters
        if (game.combat.system.nextEncounter <= game.combat.round) {
            await game.combat.update({"system.nextEncounter": game.combat.round + game.combat.system.dangerLevel + 1})
            this.checkForEncounter();
        }

    }

    async _updateRound() {
        // if there is no GM turn, take the turn now.
        if (game.user.isGM){
            if(game.combat.system.gmId === null){
                this._gmTurn();
            }
        }

        this.render(true);
    }

    async _updateTurn(direction) {
       // TODO Announce to player that's it's there turn based on a global setting
       // play a sound? annouce player that's on deck next?

       if (game.user.isGM){
            //test for GM's turn
            if ((game.combat.combatant.id === game.combat.system.gmId) && (direction > 0))
                {
                this._gmTurn();
            }
       }
    }



    async checkForEncounter(){
        // TODO add more encounter actions based on settings
        ui.notifications.info("Checking for encounter");
    }

    async encounter(){
        // TODO add more encounter actions based on settings
        ui.notifications.info("encounter!");
        this.render();
    }

    async timePasses(minutes){
        // TODO Clear all round based active effects from players
        // TODO Game time / Torch timer runs down by minutes
        // TODO 50% change for random encounter
    }

    async moralCheck(targets=[], groupRoll=false){
        // TODO Roll moral checks for all targets as defined on pg 89

    }

    async onCombatantUpdate() {
        // Do things when a combatant is updated

        // TODO set flag for moral checks
    }



}