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
            rollInitiative: this.rollInitiative,
            rollAllInit: this.rollAllInit,
            resetInit: this.resetInit
        }
    };

    static PARTS = {
        main: {
          template: "./modules/shadowdark-crawl-helper/templates/actor-carousel.hbs"
        }
    };

    // -----------------------------------------------
    //  Parent Override Functions
    // -----------------------------------------------

    // sets the position of the app before rendering
    _prePosition(pos = {}) {
        const middle = document.querySelector("#ui-middle").getBoundingClientRect();
        foundry.utils.mergeObject(pos, {
          top: 0,
          left: middle.left,
          width: middle.width
        });
    }

    //Generates context for each UI part before rendering it
    async _preparePartContext(partId, context, options) {
        if (partId === "main" && game.combat) {
            this._updateCombatantsList();
            this._updateOrder();
            context.crawlStarted = true;
            context.isGM = game.user.isGM;
            context.combatants = this.combatants;
            context.containerWidth = 138 + ((this.combatants.length-2) * 98) + 30;
        }
        return context;
    }

    // -----------------------------------------------
    // Action Functions
    // -----------------------------------------------
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

    static async rollInitiative(event, target) {
        game.combat.rollInitiative(target.dataset.combatantId, {updateTurn: false});
    }

    static async rollAllInit(event, target) {
        await game.combat.rollAll();
        await game.combat.update({turn: 0});
    };

    static async resetInit(event, target) {
        game.combat.resetAll();
    };

    // -----------------------------------------------
    // Public functions
    // -----------------------------------------------
    async onUpdateCombat(changes, options) {
        if(game.combat.combatants.size > 0) {
            if ("combatants" in changes || game.combat.previous.round === 0) {
                await this.render(true);
            } else {
                if ("turn" in changes ) {
                    this._updateTurn(options.direction);
                }
                if ("round" in changes) {
                    this._updateRound();
                }
            }

        }
    }

    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    _enrichCombatant(combatant) {
        let actor = null;
                if (combatant.actorId) {
                   actor = game.actors.get(combatant.actorId);
                } 

                //Set actor stats
                let hpPercent = 100;
                let ac = null;
                let level = null;
                if (actor){
                    hpPercent = Math.min(100, (
                        actor.system.attributes.hp.value / 
                        actor.system.attributes.hp.max
                        ) * 100
                    );
                    ac = actor.system.attributes.ac.value;
                    level = actor.system.level.value;
                }
        return {
            ...combatant,
            id: combatant.id,
            initiativeSet: (combatant.initiative != null),
            control: (game.user.isGM || game.user.character.id === combatant.actorId),
            img: actor? actor.img : combatant.img,
            hpPercent,
            ac,
            level
        }

    }

    _updateCombatantsList() { //Updates combatants data
        this.combatants = [];
        if(game.combat?.started){
            for (const combatant of game.combat.turns){
                //add combatant
                this.combatants.push(this._enrichCombatant(combatant))
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

    _updateOrder() { // update order based on combat turn
        const modifer = this.combatants.length - game.combat.turn;
        for(let x=0; x < this.combatants.length; x++) {
            this.combatants[x].order = (modifer + x) % this.combatants.length;
        }
    }

    
    async _updateRound() { //updates HTML based on the current round number
        const dividerText = this.element.querySelector('.round-divider span');
        const divider = this.element.querySelector('.round-divider');
        dividerText.classList.add("fadeout");
        divider.classList.add("fadeout");
        setTimeout(() => {
            divider.classList.remove("fadeout");
        }, "300");
        setTimeout(() => {
            dividerText.textContent = game.combat.round +1;
            dividerText.classList.remove("fadeout");  
        }, "600");
    }

    
    async _updateTurn(direction) { //updates HTML based on the current turn
        this._updateOrder();

        //only animate is more than 1 combatant
        if (this.combatants.length < 2) return

        //get current and next combatant
        const current = this.element.querySelector(
            `div[data-combatant-id="${
                this.combatants[game.combat.previous.turn].id
            }"]`
        );
        const next = this.element.querySelector(
            `div[data-combatant-id="${
                this.combatants[game.combat.turn].id
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

}