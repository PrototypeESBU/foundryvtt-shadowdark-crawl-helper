const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
		super();
        this.crawl = null;
    }

    static DEFAULT_OPTIONS = {
        id: "crawlTracker",
        classes: ["crawl-tracker"],
        position: {
            width: 300,
            height: "auto",
        },
        window: {
            title: "Crawl Tracker",
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
        await this.crawl.startCombat();
        this.render();
    }
    static async endCrawling(event, target) {
        await this.crawl.endCombat();
        await this.createCrawl();
        this.render();
    }

    static async toggleCombat(event, target) {
        //turn off combat
        if (this.crawl.system.inCombat) {
            for (const combatant of this.crawl.combatants) {
                // restore saved crawling Initiative
                await this.crawl.setInitiative(combatant.id, combatant.system.crawlingInit);

                // TODO should this be done only based on a setting of auto remove Monsters or something like that?
                if(combatant.system.type === "NPC") combatant.delete(); 
            }

            // TODO should the encounterClock be reset after combat?
            await this.crawl.update({"system": {
                "inCombat": false,
                "encounterClock": this.crawl.system.danagerLevel
            }})
        }
        //turn on combat
        else {
            // save crawling Initiative
            for (const combatant of this.crawl.combatants) {
                await combatant.update({"system.crawlingInit": combatant.initiative});
            }
            //reset Initiative
            this.crawl.resetAll();
            await this.crawl.update({"system.inCombat": true})
        }
        this.render();
    }

    static async addGameMaster() {
        if (!this.crawl.combatants.map(c => c.id).includes(this.crawl.system.gmId)) {
            const gm = await this.crawl.createEmbeddedDocuments("Combatant", [{
                name: "Game Master", 
                type: "shadowdark-crawl-helper.crawlActor",
                system: {type:"GM"},
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
        const combatantActorsIDs = this.crawl.combatants
        .map(combatant => combatant.actorId);

        //create placeholder combatants if not already added
        for (const actor of partyActors) {
            //add any missing actors to combants
            if (!combatantActorsIDs.includes(actor.id)) {
                await this.crawl.createEmbeddedDocuments("Combatant", [{
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
        if(this.crawl?.started){
            context.isStarted = true
            context.round = this.crawl.round;
            context.inCombat = this.crawl.system.inCombat;
            context.mode = this.crawl.system.inCombat ? "Combat" : "Crawling"; //TODO needs i18n
            context.nextEncounter = this.crawl.round + this.crawl.system.encounterClock;
        }
        return context;
    }
    
    async initializeCrawl() { // loads tracking data from an exiting combat on initialization
        //Confirm if there is a crawl loaded already
        if (game?.combat?.type === "shadowdark-crawl-helper.crawl") {
            console.warn("Assign Existing Crawl");
            this.crawl = game.combat;
        }
        else
        {
            console.warn("Creating new Crawl");
            await this.createCrawl();
        }

        //if linked to a scene, unlink combat
        if (this.crawl._source.scene) this.crawl.toggleSceneLink();
    }

    async createCrawl() {
        // create encounter
        this.crawl = await Combat.create({type:"shadowdark-crawl-helper.crawl"}); 

        //add GM to game
        //await this.addGameMaster(); // TODO add GM at the start based on a setting
    }

    async updateRound(updateData, direction) {
        // if GM turn hasn't gone, take the turn now.
    }

    async updateTurn(updateData, direction) {
       // TODO Announce to player that's it's there turn based on a global setting
       // play a sound? annouce player that's on deck next?
    }

    async _gmTurn() {
        //test for encounters
        const encounterUpdate = this.crawl.system.encounterClock -= direction;
        if (encounterUpdate <= 0) {
            await this.crawl.update({"system.encounterClock": this.crawl.system.danagerLevel})
            this._encounter();
        }
        else {
            await this.crawl.update({
                "system.encounterClock": this.crawl.system.encounterClock + encounterUpdate
            })
        }
    }

    async checkEncounter(){
        // TODO add more encounter actions based on settings
    }

    async triggerEncounter(){
        // TODO add more encounter actions based on settings
        ui.notifications.info("encounter");
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


    async connectSceneTokens() { 
    //connects scene tokens to player placeholders
        const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

        for (const actor of partyActors) {
            //gets first combatant and token and matches them 
            const combatant = this.crawl.combatants.find(c => c.actorId === actor.id); 
            const token = game.scenes.active.tokens.find(t => t.actorId === actor.id);
            if (combatant && token) {
                this.crawl.updateEmbeddedDocuments("Combatant", [{
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