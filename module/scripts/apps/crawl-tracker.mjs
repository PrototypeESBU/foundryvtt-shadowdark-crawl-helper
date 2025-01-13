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
            encoutnerTable: ""
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
        this.tracking.inCombat = true;
        // TODO load selected monsters
        this.render();
    }
    static async endCombat(event, target) {
        this.tracking.inCombat = false;
        this.tracking.encounterClock = this.tracking.danagerLevel;
        // TODO remove all monsters
        this.render();
    }

    static async nextRound(event, target) {
        game.combat.nextRound();
    }

    static async previousRound(event, target) {
        game.combat.previousRound();
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
        if(!game.combat) this.createTracking();        

        //Confirm the encounter was created by this module
        if (!game.combat.getFlag("shadowdark-crawl-helper", "tracking")) this.createTracking();

        //if linked to a scene, unlink combat
        if (game.combat._source.scene) game.combat.toggleSceneLink();

        //load encounter values from stored flages
        this.tracking = game.combat.getFlag("shadowdark-crawl-helper", "tracking")

    }

    async createTracking() {
        // create encounter
        const encounter = Combat.implementation.create();
        
        // TODO add party to current combat

        // TODO add GM to current combat

        this.saveTrackingData();
    }

    async saveTrackingData() {  // Saves tracking data to the tracking combat to persist between loads
        //set tracking to flags on combat for persistance of state
        game.combat.setFlag("shadowdark-crawl-helper", "tracking", this.tracking);
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
        this.tracking.encounterClock -= direction;

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
        console.log(updateData, direction);
    }

}