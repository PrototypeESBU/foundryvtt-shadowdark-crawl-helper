const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class actorCarousel extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor() {
		super();
        this.combatants = [];
        if (game.modules.get("lights-out-theme-shadowdark")?.active){
            this.lightsOut = true;
        } else {
            this.lightsOut = false;
        }
    };

    static DEFAULT_OPTIONS = {
        id: "actorCarousel",
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
            resetInit: this.resetInit,
            toggleVisibility: this.toggleVisibility,
            toggleDefeated: this.toggleDefeated,
            editCombatant: this.editCombatant,
            deleteCombatant: this.deleteCombatant
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
        if (this.lightsOut) {
            foundry.utils.mergeObject(pos, {
                top: 250,
                left: 250,
                width: 500
                });
        } else {
            foundry.utils.mergeObject(pos, {
            top: 0,
            left: middle.left,
            width: middle.width
            });
        }
    }

    //Generates context for each UI part before rendering it
    async _preparePartContext(partId, context, options) {
        if (partId === "main" && game.combat) {
            this._updateCombatantsList();
            this._updateOrder();
            context.crawlStarted = game.combat.started;
            context.isGM = game.user.isGM;
            context.combatants = this.combatants;
            context.containerWidth = 138 + ((this.combatants.length-2) * 98) + 30;
        }
        return context;
    }

    _onRender(context, options) {

        if (this.lightsOut){
            this.classList.add("lights-out-carousel");
        } else {
            this.classList.add("actor-carousel");
        }

        //shows player overlay on first render
        if (this.combatants.length > 1) {
            const currentCombatant = this.combatants[game.combat.turn];
            if(currentCombatant.overlay === "" && currentCombatant.isOwner && !game.user.isGM) {
                this.element.querySelector(".first .overlay").classList.remove("hidden");
            }
        }
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

    static async toggleVisibility(event, target) {
        const combatant = game.combat.combatants.get(target.dataset.combatantId);
        await combatant.update({hidden: !combatant.hidden});
    };

    static async toggleDefeated(event, target) {
        const combatant = game.combat.combatants.get(target.dataset.combatantId);
        const isDefeated = !combatant.isDefeated;
        await combatant.update({defeated: isDefeated});
        const defeatedId = CONFIG.specialStatusEffects.DEFEATED;
        await combatant.actor?.toggleStatusEffect(defeatedId, {overlay: true, active: isDefeated});
    };

    static async editCombatant(event, target) {
        const combatant = game.combat.combatants.get(target.dataset.combatantId);
        new CombatantConfig(combatant).render(true);
    };

    static async deleteCombatant(event, target) {
        const combatant = game.combat.combatants.get(target.dataset.combatantId);
        combatant.delete();
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
        let barPercent = 100;
        let hp = null;
        let ac = null;
        let level = null;
        let styleClass = "";
        
        //Calculate overlays
        let overlay = "";
        if (combatant.initiative === null) {
            overlay = "initiative";
        }
        else if (combatant.hidden) {
            overlay = "hidden";
            if(!game.user.isGM) {
                styleClass = "unknown";
                combatant.name = "unknown";
            }
        }
        else if (combatant.defeated) {
            overlay = "defeated";
        }

        // calculate health bar
        if (actor){
            barPercent = Math.min(100, (
                actor.system.attributes.hp.value / 
                actor.system.attributes.hp.max
                ) * 100
            );
            hp = actor.system.attributes.hp
            ac = actor.system.attributes.ac.value;
            level = actor.system.level.value;
        }

        return {
            ...combatant,
            id: combatant.id,
            initiativeSet: (combatant.initiative != null),
            isOwner: (combatant.actor?.permission === 3 || game.user.isGM),
            canView: (combatant.system.type === "Player" || game.user.isGM),
            overlay,
            img: actor? actor.img : combatant.img,
            barPercent,
            hp,
            ac,
            level,
            styleClass
        }

    }

    _updateCombatantsList() { //Updates combatants data
        this.combatants = [];
        if(game.combat?.started){
            for (const combatant of game.combat.turns){
                //add combatant
                this.combatants.push(this._enrichCombatant(combatant));
            }

            if ( this.combatants.length > 0) {
                const current = this.combatants[game.combat.turn]

                //set initial style on first combatant
                current.styleClass = current.styleClass.concat(" first");

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

        //get previous and current combatants
        const previousCombatant = this.combatants[game.combat.previous.turn];
        const previousElement = this.element.querySelector(
            `div[data-combatant-id="${
                previousCombatant.id
            }"]`
        );
        const currentCombatant = this.combatants[game.combat.turn];
        const currentElement = this.element.querySelector(
            `div[data-combatant-id="${
                currentCombatant.id
            }"]`
        );

        //start fadeout for previous target
        let fadeTarget = previousElement;
        // unless going backwards
        if (direction < 0) fadeTarget = currentElement;

        //start CSS transitions
        fadeTarget.classList.add("fadeout");
        previousElement.classList.remove("first");
        currentElement.classList.add("first");

        //add or remove nextTurn overlay
        if(previousCombatant.overlay === "") {
            previousElement.querySelector(".overlay").classList.add("hidden");
        }
        if(currentCombatant.overlay === "" && currentCombatant.isOwner && !game.user.isGM) {
            currentElement.querySelector(".overlay").classList.remove("hidden");
        }

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