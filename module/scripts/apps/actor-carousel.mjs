const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class actorCarousel extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor() {
		super();
    };

    static DEFAULT_OPTIONS = {
        id: "actorCarousel",
        classes: ["actor-carousel"],
        position: {
            width: "auto",
            height: "auto",
        },
        window: {
            frame: false,
        },
        actions: {
            nextRound: this.nextRound,
            previousRound: this.previousRound,
            nextTurn: this.nextTurn,
            previousTurn: this.previousTurn,
        }
    };

    static PARTS = {
        main: {
          template: "./modules/shadowdark-crawl-helper/templates/actor-carousel.hbs"
        }
    };

    /** @override */
    _prePosition(pos = {}) {
        const box = this.element.getBoundingClientRect();
        foundry.utils.mergeObject(pos, {
          top: 0,
          left: ui.nav.element[0].getBoundingClientRect().right,
          width: 1000
        });
    }

    /** @override */
    async _preparePartContext(partId, context, options) {
        if(game.combat){
            //get combatants in current initative order
            const combatants = game.combat.turns.map(c => 
                ({...c, actor: game.actors.get(c.actorId)})
            )
            // add in the round divider
            combatants.push({isDivider: true});

            // shift order up to current turn
            for(let x=0; x < game.combat.turn; x++) {
                combatants.push(combatants.shift());
            }
            context.combatants = combatants
        }
        return context;
    }

    static async nextRound(event, target) {
        game.combat.nextRound();
    };

    static async previousRound(event, target) {
        game.combat.previousRound();
    };

    static async nextTurn(event, target) {
        game.combat.nextTurn();
    };

    static async previousTurn(event, target) {
        game.combat.previousTurn();
    };
}