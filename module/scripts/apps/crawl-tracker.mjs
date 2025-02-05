const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
		super();
        this.crawl = null;
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
            addGameMaster: this.addGameMaster,
            triggerEncounter: this.triggerEncounter,
            openCombatTracker: this.openCombatTracker,
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

    /** @override */
    _prePosition(pos = {}) {
        const middle = document.querySelector("#ui-middle").getBoundingClientRect();
        const thisApp = this.element.getBoundingClientRect();
        foundry.utils.mergeObject(pos, {
            left: middle.right - 210,
            top: middle.bottom - thisApp.height - 15
        });
    }

    async _preparePartContext(partId, context, options) {
        if (partId === "main") {
            if(this.crawl?.started){
                context.isStarted = true
                context.round = this.crawl.round;
                context.inCombat = this.crawl.system.inCombat;
                context.mode = this.crawl.system.inCombat ? "Combat" : "Crawling"; //TODO needs i18n
                context.danger = this.dangerIndex[this.crawl.system.dangerLevel];
                context.nextEncounter = this.crawl.system.nextEncounter;
            }
        }
        return context;
    }

    // -----------------------------------------------
    // Action Functions
    // -----------------------------------------------

    static async startCrawling(event, target) {
        await this.crawl.startCombat();
        this.render();
    }
    static async endCrawling(event, target) {
        await this.crawl.endCombat();
        await this._createCrawl();
        this.render();
    }

    static async triggerEncounter(event, target) {
        this.encounter();
    }

    static async triggerEncounterCheck(event, target) {
        this.checkForEncounter();
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

            // Reset nexEncounter
            await this.crawl.update({"system": {
                "inCombat": false,
                "nextEncounter": this.crawl.round + this.crawl.system.dangerLevel + 1
            }})

            // start a fresh round
            await game.combat.nextRound();
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

            // TODO maybe a setting to auto role initative?
        }
        this.render();
    }

    static async addGameMaster() {
        if (!this.crawl.combatants.map(c => c.id).includes(this.crawl.system.gmId)) {
            const gm = await this.crawl.createEmbeddedDocuments("Combatant", [{
                name: "Game Master", 
                type: "shadowdark-crawl-helper.crawler",
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
        this._connectSceneTokens();
    }

    static async openCombatTracker() {
        game.combats.directory.createPopout().render(true);
    }


    // -----------------------------------------------
    // Public functions
    // -----------------------------------------------
    
    async initializeCrawl() { // loads tracking data from an exiting combat on initialization
        //Confirm if there is a crawl loaded already
        if (game?.combat?.type === "shadowdark-crawl-helper.crawl") {
            console.warn("Assign Existing Crawl");
            this.crawl = game.combat;
        }
        else
        // create a new crawl
        {
            console.warn("Creating new Crawl");
            await this._createCrawl();
        }

        //if linked to a scene, unlink combat
        if (this.crawl._source.scene) this.crawl.toggleSceneLink();
    }

    async onSceneChange(canvas) {
        if (this.crawl) this._connectSceneTokens();
    }

    async onUpdateCombat(changes, options) { 
        if (changes.turn >=0) {
            this._updateTurn(options.direction);
        }
        if (changes.round) {
            this._updateRound();
        }
    }

    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    async _connectSceneTokens() { //connects scene tokens to player placeholders in crawl
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
                }]);
            }
        }
    }


    async _createCrawl() { // creates a new crawl type encounter
        
        this.crawl = await Combat.create({type:"shadowdark-crawl-helper.crawl"}); 

        //add GM to game
        //await this.addGameMaster(); // TODO add GM at the start based on a setting
    }

    async _gmTurn() { //Automatic activites that run on the GM turn
        //test for encounters
        if (this.crawl.system.nextEncounter <= this.crawl.round) {
            await this.crawl.update({"system.nextEncounter": this.crawl.round + this.crawl.system.dangerLevel + 1})
            this.checkForEncounter();
        }
    }

    async _updateRound() {
        // if there is no GM turn, take the turn now.
        if(this.crawl.system.gmId === null){
            this._gmTurn();
        }
    }

    async _updateTurn(direction) {
       // TODO Announce to player that's it's there turn based on a global setting
       // play a sound? annouce player that's on deck next?

       //test for GM's turn
        if((this.crawl.nextCombatant.id === this.crawl.system.gmId) & direction > 0) {
            this._gmTurn();
        }
    }



    async checkForEncounter(){
        // TODO add more encounter actions based on settings
        ui.notifications.info("Checking for encounter");
    }

    async encounter(){
        // TODO add more encounter actions based on settings
        ui.notifications.info("encounter!");
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