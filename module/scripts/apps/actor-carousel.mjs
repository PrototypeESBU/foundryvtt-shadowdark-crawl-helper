const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class actorCarousel extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor() {
		super();
        this.combatants = [];
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
            rollAllInit: this.rollAllInit,
            resetInit: this.resetInit
        }
    };

    static PARTS = {
        main: {
          template: "./modules/shadowdark-crawl-helper/templates/actor-carousel.hbs"
        }
    };

    /** @override */
    _prePosition(pos = {}) {
        const middle = document.querySelector("#ui-middle").getBoundingClientRect();
        foundry.utils.mergeObject(pos, {
          top: 0,
          left: middle.left,
          width: middle.width
        });
    }

    /** @override */
    async _preparePartContext(partId, context, options) {
        this._getCombatantsContext();
        this._updateOrder(game.combat.turn);
        context.combatants = this.combatants;
        context.containerWidth = (this.combatants.length * 94)-28;
        return context;
    }

    _getCombatantsContext() {
        this.combatants = [];
        if(game.combat?.started){
            for (const combatant of game.combat.turns){
                let actor = null;
                if (combatant.actorId) {
                   actor = game.actors.get(combatant.actorId);
                } 
                //add combatant
                this.combatants.push({
                    ...combatant,
                    img: actor? actor.img : combatant.img,
                    id: combatant.id
                })
            }

            //set initial style on first combatant
            if ( this.combatants.length > 0) {
                this.combatants[game.combat.turn].styleClass = "first";

                // add in the round divider
                this.combatants.push({
                    id: "Divider",
                    isDivider: true,
                    round: game.combat.round + 1
                });
            }
        }
    }

    _updateOrder(currentTurn) {
        // update order based on combat turn
        const modifer = this.combatants.length - currentTurn;
        for(let x=0; x < this.combatants.length; x++) {
            this.combatants[x].order = (modifer + x) % this.combatants.length;
        }
    }

    async updateTurn(updateData, direction) {
        this._updateOrder(updateData.turn);
        //get current and next combatant
        const current = this.element.querySelector(
            `div[data-combatant-id="${
                this.combatants[game.combat.turn].id
            }"]`
        );
        const next = this.element.querySelector(
            `div[data-combatant-id="${
                this.combatants[updateData.turn].id
            }"]`
        );

        //start fadeout for current target
        let fadeTarget = current;
        // unless going backwards
        if (direction < 0) fadeTarget = next;

        //start CSS transitions
        fadeTarget.classList.add("fadeout");
        current.classList.remove("first");
        next.classList.add("first");

        //wait for CSS transitions
        setTimeout(() => {
            // update order of combatant
            this.combatants.forEach( c => {
                this.element.querySelector(`div[data-combatant-id="${c.id}"]`)
                .style.setProperty("order", c.order);
            });
            //reveal faded combatant
            fadeTarget.classList.remove("fadeout");
        }, "300");
    }

    async updateRound(updateData, direction) {
        this.updateTurn(updateData, direction);
        const dividerText = this.element.querySelector('.round-divider span');
        const divider = this.element.querySelector('.round-divider');
        dividerText.classList.add("fadeout");
        divider.classList.add("fadeout");
        setTimeout(() => {
            divider.classList.remove("fadeout");
        }, "300");
        setTimeout(() => {
            dividerText.textContent = updateData.round +1;
            dividerText.classList.remove("fadeout");  
        }, "600");
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

    static async rollAllInit(event, target) {
        game.combat.rollAll();
    };

    static async resetInit(event, target) {
        game.combat.resetAll();
    };
}