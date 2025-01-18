const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
		super();
        this.crawl = null;
        this.round = 1;
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
            toggleCombat: this.toggleCombat,
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
        await game.combat.startCombat();
        this.render();
    }
    static async endCrawling(event, target) {
        await game.combat.endCombat();
        await this.createCrawl();
        this.render();
    }

    static async toggleCombat(event, target) {
        // TODO save crawling initative and roll combate initiative
        if (this.crawl.system.inCombat) {
            await this.crawl.update({"system": {
                "inCombat": false,
                "encounterClock": this.crawl.system.danagerLevel
            }})
            // TODO remove all monsters restore crawling initiative
        }
        else {
            await this.crawl.update({"system.inCombat": true})
            // TODO add monsters?
        }
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
        if (!game.combat.combatants.map(c => c.id).includes(this.crawl.system.gmId)) {
            const gm = await game.combat.createEmbeddedDocuments("Combatant", [{
                name: "Game Master", 
                img: "modules/shadowdark-crawl-helper/assets/dungeon-master.png", // TODO needs to be a default config and setting 
                hidden: false
            }]);
            await this.crawl.update({"system.gmId": gm[0].id})
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
        if(this.crawl && this.crawl.started){
            context.isStarted = this.crawl.started;
            context.round = this.round;
            context.inCombat = this.crawl.system.inCombat;
            context.mode = this.crawl.system.inCombat ? "Combat" : "Crawling"; //TODO needs i18n
            context.nextEncounter = this.crawl.round + this.crawl.system.encounterClock;
        }
        return context;
    }
    
    async initializeCrawl() { // loads tracking data from an exiting combat on initialization
        //Confirm if there is a crawl loaded already
        if (game?.combat?.type !== "shadowdark-crawl-helper.crawl") {
            this.crawl = await this.createCrawl();
        }
        else
        {
            this.crawl = game.combat;
        }

        //if linked to a scene, unlink combat
        if (game.combat._source.scene) game.combat.toggleSceneLink();
    }

    async createCrawl() {
        // create encounter
        this.crawl = await Combat.create({type:"shadowdark-crawl-helper.crawl"}); 
        const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

        //add GM to game
        //await this.addGameMaster();
    }

    async updateRound(updateData, direction) {
        this.round = updateData.round;
        const encounterUpdate = this.crawl.system.encounterClock -= direction;
        //test for encounters
        // TODO should be on GM's turn instead
        if (encounterUpdate <= 0) {
            await this.crawl.update({"system.encounterClock": this.crawl.system.danagerLevel})
            ui.notifications.info("encounter");
        }
        else {
            await this.crawl.update({"system.encounterClock": encounterUpdate})
        }

        this.render();
    }

    async updateTurn(updateData, direction) {
        //set anything related to a new turn
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