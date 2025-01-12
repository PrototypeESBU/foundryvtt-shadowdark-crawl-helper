const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
		super();
        this.inCombat = true;
        this.danagerLevel = 0;
        this.encounterClock = 0;
        this.encoutnerTable = "";
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
            myAction: this.myAction,
            nextRound: this.nextRound,
            previousRound: this.previousRound
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

    static async myAction(event, target) {
        ui.notifications.warn("myAction Tiggered");
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
        context = {
            partId: `${partId}`,
            inCombat: this.inCombat,
            round: this.inCombat? this.combatRound : this.crawlingRound,
        }
        return context;
    }

    async loadTracking() {

        if(!game.combat) return createTracking()           

        // check for flags

    }

    async createTracking() {
        // create encounter
        // toggleSceneLink();
        // start
    }

    async updateTracking() {
        let delta = game.combat.current.round - game.combat.previous.round;
        if (this.inCombat) {
            this.combatRound += delta;
        }
        else {
            this.crawlingRound += delta;
        }
        ui.notifications.info(`round ${game.combat.current.round}`);
    }
 /*
    async updateScene() {
        console.warn("scene Updated");
        game.scenes.viewed.setFlag("shadowdark-crawl-helper", "tracking", 
        {
            crawlingRound: this.crawlingRound,
            combatRound: this.combatRound,
            inCombat: this.inCombat
        });
        console.log(await game.scenes.viewed.getFlag("shadowdark-crawl-helper", "tracking"));
    }

        async loadCombat() {
            console.warn("scene Loaded");
            let sceneFlag = await game.combat.getFlag("shadowdark-crawl-helper", "tracking");
            console.log(sceneFlag);
            if (sceneFlag) {
                console.warn("scene values Loaded");
                this.crawlingRound = sceneFlag.crawlingRound;
                this.combatRound = sceneFlag.combatRound;
                this.inCombat = sceneFlag.inCombat;
            } else {
                this.updateScene()
            }
            
        }*/
}