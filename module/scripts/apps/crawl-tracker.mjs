const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
		super();
        this.tracking = {
            round:0,
            turn:0,
            isStarted: false,
            inCombat: false,
            encounterClock: 3,
            danagerLevel: 3,
            encoutnerTable: "",
            gmId: ""
        }
    }

    static DEFAULT_OPTIONS = {
        id: "crawlTracker",
        classes: ["crawl-helper"],
        position: {
            width: 300,
            height: "auto",
        },
        window: {
            title: "Crawl Tracker"
        },
        actions: {
            startCrawling: this.startCrawling,
            endCrawling: this.endCrawling,
            startCombat: this.startCombat,
            endCombat: this.endCombat,
            nextRound: this.nextRound,
            previousRound: this.previousRound,
            nextTurn: this.nextTurn,
            previousTurn: this.previousTurn,
            addParty: this.addParty,
            addGameMaster: this.addGameMaster,
            openCombatTracker: this.openCombatTracker,
        }
    };

    static PARTS = {
        main: {
          template: "./modules/shadowdark-crawl-helper/templates/crawl-tracker.hbs"
        }
    }

    // ***************
    // Action Handlers
    // ***************
    static async startCrawling(event, target) {
        this.tracking.isStarted = true;
        this.tracking.round = 1;
        game.combat.startCombat();
    }
    static async endCrawling(event, target) {
        this.tracking.isStarted = false;
        game.combat.endCombat();
        this.createTracking();
        this.render();
    }

    static async startCombat(event, target) {
        // TODO save crawling initative and roll combate initiative
        this.tracking.inCombat = true;
        this.saveTrackingData();
        this.render();
    }
    static async endCombat(event, target) {
        this.tracking.inCombat = false;
        this.tracking.encounterClock = this.tracking.danagerLevel;
        // TODO remove all monsters restore crawling initiative
        this.saveTrackingData();
        this.render();
    }

    static async nextRound(event, target) {
        game.combat.nextRound();
    }

    static async previousRound(event, target) {
        game.combat.previousRound();
    }

    static async nextTurn(event, target) {
        game.combat.nextTurn();
    }

    static async previousTurn(event, target) {
        game.combat.previousTurn();
    }

    static async addGameMaster() {
        if (!game.combat.combatants.map(c => c.id).includes(this.tracking.gmId)) {
            const gm = await game.combat.createEmbeddedDocuments("Combatant", [{
                name: "Game Master", 
                img: "modules/shadowdark-crawl-helper/assets/dungeon-master.png", // TODO needs to be a default config and setting 
                hidden: false
            }]);
            this.tracking.gmId = gm[0].id;
            this.saveTrackingData();
        }
    }

    static async addParty() {
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
        this.connectSceneTokens();
    }

    static async openCombatTracker() {
        game.combats.directory.createPopout().render(true);
    }

    // ***************
    // other functions
    // ***************

    /** @override */
    async _preparePartContext(partId, context, options) {
        context = this.tracking;
        context.mode = this.tracking.inCombat ? "Combat" : "Crawling"; //TODO needs i18n
        context.nextEncounter = this.tracking.round + this.tracking.encounterClock;
        return context;
    }
    
    async loadTracking() { // loads tracking data from an exiting combat on initialization

        //check if there is an encounter loaded already
        if(!game.combat) await this.createTracking();  

        //Confirm the encounter was created by this module
        if (!game.combat.getFlag("shadowdark-crawl-helper", "tracking")) await this.createTracking();

        //if linked to a scene, unlink combat
        if (game.combat._source.scene) game.combat.toggleSceneLink();

        //load encounter values from stored flages
        this.tracking = game.combat.getFlag("shadowdark-crawl-helper", "tracking")
        console.log(game.combat.getFlag("shadowdark-crawl-helper", "tracking"))

    }

    async createTracking() {
        // create encounter
        const encounter = await Combat.implementation.create();
        
        const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

        //add GM to game
        await this.addGameMaster();

        //save tracking data
        await this.saveTrackingData();
    }

    async saveTrackingData() {  // Saves tracking data to the tracking combat to persist between loads
        //set tracking to flags on combat for persistance of state
        await game.combat.setFlag("shadowdark-crawl-helper", "tracking", this.tracking);
    }

    async initCombat(combat, updateData) {
        this.tracking.isStarted = true;
        this.tracking.round = 1;
        this.tracking.encounterClock = this.tracking.danagerLevel-1;
        this.tracking.inCombat = false;
        this.render();
    }

    async updateRound(updateData, direction) {
        //update round and turns
        this.tracking.round = updateData.round;
        this.tracking.turn = updateData.turn;
        if(!this.tracking.inCombat) this.tracking.encounterClock -= direction;

        //test for encounters
        // TODO should be on GM's turn instead
        if (this.tracking.encounterClock <= 0) {
            this.tracking.encounterClock = this.tracking.danagerLevel;
            ui.notifications.info("encounter");
        }

        this.saveTrackingData();
        this.render();
    }

    async updateTurn(updateData, direction) {
        //set anything related to a new turn
        this.tracking.turn = updateData.turn;
        this.saveTrackingData();
        this.render();
    }


    async connectSceneTokens() { //connects scene tokens to player placeholders
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
                    hidden: false
                }]);
            }
        }
    }
}