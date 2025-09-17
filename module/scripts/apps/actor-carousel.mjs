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

        Hooks.on('deleteCombat', this._onDeleteCombat.bind(this));
        Hooks.on('updateCombat', this._onUpdateCombat.bind(this));
        Hooks.on('createCombatant', this._onCreateCombatant.bind(this));
        Hooks.on('deleteCombatant', this._onDeleteCombatant.bind(this));
        Hooks.on('updateCombatant', this._onUpdateCombatant.bind(this));
        Hooks.on('updateActor', this._onUpdateActor.bind(this));
        Hooks.on('applyTokenStatusEffect', this._onApplyTokenStatusEffect.bind(this));
        Hooks.on("renderChatMessageHTML", this._onRenderChatMessageHTML.bind(this));

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

    async _preFirstRender(context, options) {
        const uiMiddle = document.getElementById("ui-middle");
        uiMiddle.insertAdjacentHTML("afterbegin", `<template id="actorCarousel"></template>`);
    }

    //Generates context for each UI part before rendering it
    async _preparePartContext(partId, context, options) {
        if (partId === "main" && game.combat) {
            this._updateCombatantsList();
            this._updateOrder();
            context.crawlStarted = game.combat.started;
            context.isGM = game.user.isGM;
            context.combatants = this.combatants;
            context.unrolledInit = this.combatants.some(c => (c.initiative === null && c.isOwner));
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
        new foundry.applications.ux.ContextMenu.implementation(
            this.element, 
            ".combatant", 
            this._getContextOptions(),
            {jQuery:false}
        );
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
            if(currentCombatant.isOwner || game.user.isGM) {
                this.element.querySelector("#nextTurn").classList.remove("unavailable");
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
    // Hook Callbacks
    // -----------------------------------------------

    //chat

    async _onRenderChatMessageHTML(document, html, context) {
        const combantant = game.combat?.combatants.find(c => c.actorId === document.speaker.actor);
        if (combantant && combantant?.system?.isMasked) {
            if(game.user.isGM) {
                html.innerHTML = html.innerHTML.replaceAll(combantant.actor.name, "<i class='fas fa-mask'></i> " + combantant.actor.name);
            } else{
                html.innerHTML = html.innerHTML.replaceAll(combantant.actor.name, "?");
            }
        }
    }

    //combat

    async _onDeleteCombat(document, changed, options, userId) {
        this.close({animate: false});
    };

    async _onUpdateCombat(document, changed, options, userId) {
        if(game?.combat?.combatants.size > 0 && game?.combat?.started) {
            if (this.state === 2){
                const isTurn = "turn" in changed;
                const isRound = "round" in changed;
                if (isTurn) this._updateTurn(options.direction);
                if (isRound) this._updateRound();
                if (!isTurn && !isRound) this.render();
            }
            else {
                this.render(true);
            }
        }
    }

    //combatant
    async _onCreateCombatant(document, options, userId) {
        this.rerender()
    };

    async _onDeleteCombatant(document, options, userId){ 
        this.rerender()
    };

    async _onUpdateCombatant(document, changed, options, userId) {
        this.rerender()
    };

    //Actors & Tokens
    async _onUpdateActor(document, changed, options, userId) {
        this.rerender()
    };

    async _onApplyTokenStatusEffect(statusId) {
        if(statusId === "dead") this.rerender();
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
        if (game.user.isGM) await game.combat.update({turn: 0});
    };

    static async resetInit(event, target) {
        game.combat.resetAll({updateTurn: false});
    };

    // -----------------------------------------------
    // Public functions
    // -----------------------------------------------

    async controlToken(event) {
        const combatantId = event.currentTarget.dataset.combatantId;
        if (combatantId) {
            const combatant = game.combat.combatants.get(combatantId);
            if (combatant.token?.object?.control()) {
                const {x, y} = combatant.token.object.center;
                await canvas.animatePan({x, y, scale: Math.max(canvas.stage.scale.x, 0.5)});
            }
        }
    }

    async openSheet(event) {
        const combatantId = event.currentTarget.dataset.combatantId;
        const actor = game.combat.combatants.get(combatantId).actor;
        actor.sheet.render(true);
    }

    async rerender() {
        if (game?.combat?.started) this.render();
    }

    async editCombatant(combatantId) {
        const combatant = game.combat.combatants.get(combatantId);
        new CombatantConfig(combatant).render(true);
    };

    async deleteCombatant(combatantId) {
        const combatant = game.combat.combatants.get(combatantId);
        combatant.delete();
    };

    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    _enrichCombatant(combatant) {
        const actor = combatant.actor;
    
        //Set actor stats
        let barPercent = 100;
        let hp = null;
        let ac = null;
        let level = null;
        let styleClass = "";
        let img = actor? actor.img : combatant.img;
        const canView = (combatant.system.type === "Player" || game.user.isGM);
        const isOwner = (combatant?.actor?.permission === 3 || game.user.isGM);
        
        //Calculate overlays and special statuses
        let overlay = false;
        if (combatant.system.isMasked) {
            if (!game.user.isGM) {
                combatant.name = "?";
            }
            else overlay = true;
        } 

        if(combatant.hidden) {
            if (!game.user.isGM) styleClass = "hidden"
            else overlay = true;
        }

        if (combatant.isDefeated) {
            overlay = true;
        }

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
            masked: combatant.system.isMasked && game.user.isGM,
            isOwner,
            canView,
            overlay,
            img,
            barPercent,
            hp,
            ac,
            level,
            styleClass,
        };
    }

    _getContextOptions() {
        return [
            {
                name: "",
                icon: '<i class="fas fa-mask"></i>',
                condition: game.user.isGM,
                callback: element => { 
                    const combatant = game.combat.combatants.get(element.dataset.combatantId);
                    combatant?.system.toggleMasked();
                }
            },
            {
                name: "",
                icon: '<i class="fas fa-eye-slash"></i>',
                condition: game.user.isGM,
                callback: element => {
                    const combatant = game.combat.combatants.get(element.dataset.combatantId);
                    combatant?.system.toggleVisibility();
                }
            },
            {
                name: "",
                icon: '<i class="fas fa-skull"></i>',
                condition: game.user.isGM,
                callback: element => {
                    const combatant = game.combat.combatants.get(element.dataset.combatantId);
                    combatant?.system.toggleDefeated();
                }
            },
            {
                name: "",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM,
                callback: element => {
                    const combatant = game.combat.combatants.get(element.dataset.combatantId);
                    new CombatantConfig(combatant).render(true);
                }
            },
            {
                name: "",
                icon: '<i class="fas fa-trash"></i>',
                condition: game.user.isGM,
                callback: element => {
                    const combatant = game.combat.combatants.get(element.dataset.combatantId);
                    combatant.delete();
                }
            }
        ];
    }

    _inputHP(event) {
        if (event.keyCode !== 13) return;
        const combatantId = event.currentTarget.dataset.combatantId;
        const actor = game.combat.combatants.get(combatantId).actor;
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
        if(currentCombatant.isOwner || game.user.isGM) {
            this.element.querySelector("#nextTurn").classList.remove("unavailable");
        }
        else {
            this.element.querySelector("#nextTurn").classList.add("unavailable");
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