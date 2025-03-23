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
        foundry.utils.mergeObject(pos, {
            top: middle.top,
            left: middle.left,
            height: middle.height,
            width: middle.width
        });
    }

    //Generates context for each UI part before rendering it
    async _preparePartContext(partId, context, options) {
        if (partId === "main" && game.combat) {
            this._updateCombatantsList();
            this._updateOrder();
            context.crawlStarted = game.combat.started;
            context.isGM = game.user.isGM;
            context.combatants = this.combatants;
            if (this.lightsOut) {
                context.containerStyle = `height:${(this.combatants.length*64)-8}px`;
            } else {
                context.containerStyle = `width:${138 + ((this.combatants.length-2) * 98) + 30}px`;
            }
        }
        return context;
    }

    _onFirstRender(context, options) {
        //register context menu handler
        new ContextMenu(this.element, ".combatant", this._getContextOptions());
        
    }


    _onRender(context, options) {

        // activate the correct CSS class
        if (this.lightsOut){
            this.classList.add("lights-out-carousel");
        } else {
            this.classList.add("actor-carousel");
        }

        //shows player the next turn overlay
        if (this.combatants.length > 1) {
            const currentCombatant = this.combatants[game.combat.turn];
            if(currentCombatant.overlay === "" && currentCombatant.isOwner && !game.user.isGM) {
                this.element.querySelector(".first .overlay").classList.remove("hidden");
            }
        }

        //register click handlers
        const portraits = this.element.querySelectorAll('.portrait img');
        for (const portrait of portraits) {
            portrait.addEventListener("click", this.controlToken);
            portrait.addEventListener("dblclick", this.openSheet);
        }

        //register HP input handlers
        const healthInputs = this.element.querySelectorAll('.current-health');
        for (const input of healthInputs) {
            input.addEventListener("focus", (e) => {e.currentTarget.value = "";});
            input.addEventListener("blur", (e) => {e.currentTarget.value = e.currentTarget.dataset.value;});
            input.addEventListener("keyup", this._inputHP);
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
        if(game.combat.combatants.size > 0 && game.combat.started) {
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
        else {
            this.close({animate: false});
        }
    }
    async controlToken(event) {
        const combatantId = event.currentTarget.dataset.combatantId;
        if (combatantId) {
            const combatant = game.combat.combatants.get(combatantId);
            if (combatant.token?.object.control()) {
                const {x, y} = combatant.token.object.center;
                await canvas.animatePan({x, y, scale: Math.max(canvas.stage.scale.x, 0.5)});
            }
        }
    }

    async openSheet(event) {
        let actor;
        const combatant = game.combat.combatants.get(event.currentTarget.dataset.combatantId);
        if (combatant.tokenId) {
            actor = game.scenes.active.tokens.get(combatant.tokenId).actor;
        }
        else {
            actor = game.actors.get(combatant.actorId);
        }
        actor.sheet.render(true);
    }

    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    _enrichCombatant(combatant) {
        const actor = this._getActor(combatant.id);
    
        //Set actor stats
        let barPercent = 100;
        let hp = null;
        let ac = null;
        let level = null;
        let styleClass = "";
        const canView = (combatant.system.type === "Player" || game.user.isGM);
        const isOwner = (combatant.actor?.permission === 3 || game.user.isGM);
        
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
        else if (combatant.isDefeated) {
            overlay = "defeated";
        }
    
        // --- New Spoiler-Free Logic ---
        if (game.settings.get("shadowdark-crawl-helper", "spoiler-free") &&
        combatant.system.type === "NPC" &&
        !game.user.isGM) {
      combatant.name = "? ? ? ?";
    }
        // --- End New Logic ---
    
        // Calculate health bar and other stats if actor is present
        if (actor){
            const showNPCHealthBars = game.settings.get("shadowdark-crawl-helper", "show-NPC-Health-Bars");
            if(game.user.isGM || canView || showNPCHealthBars) {
                barPercent = Math.min(100, (
                    actor.system.attributes.hp.value /
                    actor.system.attributes.hp.max
                ) * 100
            );
            }
            hp = actor.system.attributes.hp;
            ac = actor.system.attributes.ac.value;
            level = actor.system.level.value;
        }
    
        return {
            ...combatant,
            id: combatant.id,
            initiativeSet: (combatant.initiative != null),
            isOwner,
            canView,
            overlay,
            img: actor? actor.img : combatant.img,
            barPercent,
            hp,
            ac,
            level,
            styleClass,
        };
    }
   
        
    //TODO make into a global untility
    _getActor(combatantId) {
        const combatant = game.combat.combatants.get(combatantId);
        if (combatant.tokenId) {
            return game.scenes.active.tokens.get(combatant.tokenId).actor;
        }
        else {
            return game.actors.get(combatant.actorId);
        }
    }

    _getContextOptions() {
    	return [
			{
				name: "",
				icon: '<i class="fas fa-eye-slash"></i>',
				condition: game.user.isGM,
				callback: element => {
                    const combatant = game.combat.combatants.get(element.data("combatant-id"));
                    combatant.update({hidden: !combatant.hidden});
				}
			},
            {
				name: "",
				icon: '<i class="fas fa-skull"></i>',
				condition: game.user.isGM,
				callback: element => {
                    const combatant = game.combat.combatants.get(element.data("combatant-id"));
                    const isDefeated = !combatant.isDefeated;
                    combatant.update({defeated: isDefeated});
                    const defeatedId = CONFIG.specialStatusEffects.DEFEATED;
                    combatant.actor?.toggleStatusEffect(defeatedId, {overlay: true, active: isDefeated});
				}
			},
            {
				name: "",
				icon: '<i class="fas fa-edit"></i>',
				condition: game.user.isGM,
				callback: element => {
                    const combatant = game.combat.combatants.get(element.data("combatant-id"));
                    return new CombatantConfig(combatant).render(true);
				}
			},
            {
				name: "",
				icon: '<i class="fas fa-trash"></i>',
				condition: game.user.isGM,
				callback: element => {
                    const combatant = game.combat.combatants.get(element.data("combatant-id"));
                    combatant.delete();
				}
			}
		];
	}

    _inputHP(event) {
        if (event.keyCode !== 13) return;

        let actor;
        const combatant = game.combat.combatants.get(event.currentTarget.dataset.combatantId);
        if (combatant.tokenId) {
            actor = game.scenes.active.tokens.get(combatant.tokenId).actor;
        }
        else {
            actor = game.actors.get(combatant.actorId);
        }
        if (!actor) return;

        const currentHP = actor.system.attributes.hp.value;
        const inputValue = event.currentTarget.value.trim();
    
        let damageAmount;
        let multiplier;
    
        if (inputValue.startsWith('+')) {
          damageAmount = parseInt(inputValue.slice(1), 10);
          multiplier = -1;
        } else if (inputValue.startsWith('-')) {
          damageAmount = parseInt(inputValue.slice(1), 10);
          multiplier = 1;
        } else {
          const newHP = parseInt(inputValue, 10);
          damageAmount = currentHP - newHP;
          multiplier = 1; 
        }
    
        if (!isNaN(damageAmount)) {
          actor.applyDamage(damageAmount, multiplier);
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