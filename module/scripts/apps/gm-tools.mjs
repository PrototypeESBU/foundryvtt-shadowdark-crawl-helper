const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class gmTools extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
        super();

        this._dragDrop = this.options.dragDrop.map(d => {
            d.callbacks = {drop: this._onDrop.bind(this)};
            return new foundry.applications.ux.DragDrop.implementation(d);
        }); 
        this.dangerIndex = [
            game.i18n.localize("CRAWLHELPER.danger.deadly"),
            game.i18n.localize("CRAWLHELPER.danger.risky"),
            game.i18n.localize("CRAWLHELPER.danger.unsafe")
        ]

        Hooks.on("updateScene", this._onUpdateScene.bind(this));
        Hooks.on('combatStart', this._onCombatStart.bind(this));
        Hooks.on('deleteCombat', this._onDeleteCombat.bind(this));
        Hooks.on('updateCombat', this._onUpdateCombat.bind(this));
        Hooks.on('deleteCombatant', this._onDeleteCombatant.bind(this));
        Hooks.on('updateCombatant', this._onUpdateCombatant.bind(this));
        Hooks.on('updateActor', this._onUpdateActor.bind(this));
        Hooks.on("renderChatInput", () => {this.render()});
        Hooks.on('updateToken', this._onUpdateToken.bind(this));
    }

    static DEFAULT_OPTIONS = {
        id: "gmtools",
        classes: ["gm-tools"],
        dragDrop: [{ dragSelector: null, dropSelector: '[data-drop]' }],
        position: {
            top:0,
            left:0,
        },
        form: {
            submitOnChange: false,
        },
        window: {
            frame: false,
        },
        actions: {
            startCrawling: this.startCrawlingAction,
            endCrawling: this.endCrawlingAction,
            toggleCombat: this.toggleCombat,
            toggleParty: this.toggleParty,
            toggleGameMaster: this.toggleGameMaster,
            triggerEncounterCheck: this.triggerEncounterCheck,
            triggerEncounter: this.triggerEncounter,
            moralCheck: this.moralCheck,
            timePasses: this.timePasses,
            openSettingsMenu: this.openSettingsMenu,
            clearRollTable: this.clearRollTable,
        }
    };

    static PARTS = {
        main: {
            template: "./modules/shadowdark-crawl-helper/templates/gm-tools.hbs"
        },
    }

    // -----------------------------------------------
    //  Parent Override Functions
    // -----------------------------------------------

    async _preFirstRender(context, options) {
        const uiLeft = document.getElementById("ui-bottom");
        uiLeft.insertAdjacentHTML("afterbegin", `<template id="gmtools"></template>`);
    }

    _prePosition(pos = {}) {
        const hotbar = document.querySelector("#hotbar");
        const offset = parseInt(hotbar.style.getPropertyValue('--offset'));
        this.element.style.setProperty("--offset", `${offset}px`);

        foundry.utils.mergeObject(pos, {
            width: hotbar.getBoundingClientRect().width,
        });
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['main']
    }

    async _prepareContext(context, options) {
        if(game?.combat?.started) context.started = true;
        return context;
    }

    async _preparePartContext(partId, context, options) {
        if (partId === "main") {
            context.dangerIndex = this.dangerIndex;
            context.started = game?.combat?.started;
            context.inCombat = game?.combat?.system?.inCombat;
            context.dangerLevel = this._getDangerLevel();
            const encounterTableUuid = this._getEncounterTable();
            context.encounterTable = encounterTableUuid ? fromUuidSync(encounterTableUuid) : "";
        }
        return context;
    }

    _onRender(context, options) {
        if(game.user.isGM){
            const hotbar = document.querySelector("#hotbar")
            const offset = parseInt(hotbar.style.getPropertyValue('--offset'));
            context.position.left = offset;

            //add dragdrop event lisners
            this._dragDrop.forEach((d) => d.bind(this.element));

            //Add event handler for danger selection
            const dangerSelect = this.element.querySelector('select[name="dangerLevel"]');
            dangerSelect.addEventListener("change", event => this._onDangerChange(event));
        }
    }

    // -----------------------------------------------
    // Hook Callbacks
    // -----------------------------------------------
    


    //combat
    async _onCombatStart(combat, updateData) {
        //do required setup 
        await this._setEncounterCheck();
        if (game.settings.get("shadowdark-crawl-helper", "add-gm"))
            await this._addGameMaster(); 
        if (game.settings.get("shadowdark-crawl-helper", "add-party"))
            await this._addParty();
    }

    async _onDeleteCombat(document, changed, options, userId) { 
        this.render(true);
    }

    async _onUpdateCombat(document, changed, options, userId) {
        if (!("system" in changed)) this.render();
        if (game?.combat?.started) { 
            if ("round" in changed) {
                await this._updateRound();
            } 
            else if ("turn" in changed) {
                //wait for animation to finish
                this._wait(300);
                this._updateTurn(options.direction);
            }
        }
    }
    
    //Combatants
    async _onDeleteCombatant(document, changed, options, userId){ 
        if(document.id === game.combat.system.gmId){
            await game.combat.update({"system.gmId": null})
        }
    };

    async _onUpdateCombatant(document, changed, options, userId){ 
        if ("hidden" in changed) {
            if (document?.token && document?.token.hidden !== changed.hidden)
                document.token.update({hidden: changed.hidden});
        }
    };

    async _onUpdateActor(document, changed, options, userId) {
        if (document.type === "Player") {
            const hpChange = foundry.utils.getProperty(changed, "system.attributes.hp.value");
            
            if (hpChange === 0) {
                //set dying
                document.setFlag("shadowdark-crawl-helper", "dying", true)
            }
            else if (hpChange > 0) {
                document.unsetFlag("shadowdark-crawl-helper", "dying");
                const combatant = game.combat?.combatants.find(c => c.actorId === document.id);
                if (combatant) await combatant.update({"system.dyingRounds": null})
            }
        }

        // TODO check for < 50% defeated and call moral check
    }

    //other

    async _onUpdateToken(document, changed, options, userId) {
        if ("hidden" in changed) {
            const combatant = game?.combat?.combatants.find(c => c.tokenId === changed._id)
            if (combatant && combatant?.hidden !== changed.hidden) 
                combatant.update({hidden: changed.hidden});
        }
    };

    async _onUpdateScene(document, changed, options, userId) {
        if(changed?.active) {
            // detect scene changes and attempt to link scene tokens to combatants
            await this._connectSceneTokens();
            this.render();
        }
    }

    // -----------------------------------------------
    // Action Functions
    // -----------------------------------------------

    static async startCrawlingAction(event, target) {
        this.startCrawling();
    }

    static async endCrawlingAction(event, target) {
        // TODO add prompt
        await game.combat.delete();
    }

    static async triggerEncounter(event, target) {
        this._checkForEncounter(0);
    }

    static async triggerEncounterCheck(event, target) {
        this._checkForEncounter(1);
    }

    static async toggleCombat(event, target) {
        //turn off combat
        if (game.combat.system.inCombat) {
           await this.stopCombat();
        }
        //turn on combat
        else {
           await this.startCombat();
        }
    }

    static async toggleGameMaster() {
        // TODO make this it a toggle
        this._addGameMaster();
    }

    static async toggleParty() {
        // TODO make this it a toggle
        this._addParty();
    }

    static async timePasses(){

        const fields = foundry.applications.fields;
        const textInput = fields.createNumberInput({name: 'minutes', value: '10'});
        const textGroup = fields.createFormGroup({input: textInput, label: "Minutes:"}); //TODO localize

        //open prompt for minutes
        const result = await foundry.applications.api.DialogV2.wait({
          window: { title: "Time Passes" }, //TODO localize
          content: `${textGroup.outerHTML}`,
          buttons: [{
            action: "advance",
            label: "Pass Time", //TODO localize
            default: true,
            callback: (event, button, dialog) => new FormDataExtended(button.form).object
          }],
          rejectClose: false,
          modal: true
        });
    
        if (!result) return
        if (!result?.minutes > 0) {
            return ui.notifications.warn("Minutes must be greater than 0"); //TODO localize
        }

        //Advance Time
        await game.time.advance(result.minutes * 60);

        //Remove Effects
        const players = game.combat.combatants.filter(c => c.system.type === "Player");
        const expiredEffectsList = [];
        for (const combatant of players) {
            const actor = game.actors.get(combatant.actorId);
            if (!actor) continue;

            const effectsToRemove = actor.items.filter(item => 
                item.type === "Effect" &&
                item.system.duration &&
                item.system.duration.type === "rounds" &&
                Number(item.system.duration.value) > 0
            );
            if (effectsToRemove.length > 0) {
                const names = effectsToRemove.map(item => item.name);
                const effectIds = effectsToRemove.map(item => item.id);
                await actor.deleteEmbeddedDocuments("Item", effectIds);
                expiredEffectsList.push({actor: actor.name, effects: names.join(", ")});
            }
        }

        //Post to chat
        const cardContent = await renderTemplate("modules/shadowdark-crawl-helper/templates/chats/timepasses-card.hbs", {
            minutes: result.minutes,
            expiredEffectsList
        });
        await ChatMessage.create({ content: cardContent });

        //Roll for encounter
        await this._checkForEncounter(3);

    }  
      
    static async moralCheck(mode="individual"){
        // TODO Roll moral checks for all targets as defined on pg 89
        const npcs = game.combat.combatants.filter(c => c.system.type === "NPC"); 

    }

    static async openSettingsMenu(){
        Hooks.once("renderSettingsConfig", (app, html, data) => {
            html[0].querySelector('a[data-tab="shadowdark-crawl-helper"]').click();
        });
        game.settings.sheet.render(true)
    }

    static async clearRollTable() {
        await this._setEncounterTable(null)
        this.render();
    }

    // -----------------------------------------------
    // Public functions
    // -----------------------------------------------

    async startCrawling() {
        //make sure the current combat is a crawl type
        if (game?.combat?.type !== "shadowdark-crawl-helper.crawl") {
            await Combat.create({type:"shadowdark-crawl-helper.crawl"});
        }
        await game.combat.activate();

        //start the crawl
        await game.combat.startCombat(); 
    }

    async startCombat() {
        // save crawling Initiative
        for (const combatant of game.combat.combatants) {
            await combatant.update({"system.crawlingInit": combatant.initiative});
        }
        //reset Initiative
        game.combat.resetAll();
        await game.combat.update({"system.inCombat": true})

        //add selected tokens to combat
        const tokens = game.canvas.tokens.controlled.map(t => t.document);
        TokenDocument.implementation.createCombatants(tokens);
    }

    async stopCombat() {
            //Remove NPCs from tracker
            const npcs = game.combat.combatants
                .filter(c => c.system.type === "NPC")
                .map(c => c.id);
            await game.combat.deleteEmbeddedDocuments("Combatant", npcs);

            await game.combat.update({"system.inCombat": false});

            // restore saved crawling Initiative based on setting
            if(game.settings.get("shadowdark-crawl-helper", "save-crawl-initiative")) {
                for (const combatant of game.combat.combatants) {
                    await game.combat.setInitiative(combatant.id, combatant.system.crawlingInit);
                }
            }

            // Set next encounter
            await this._setEncounterCheck()

            // start a fresh round
            await game.combat.nextRound();
    }


    // -----------------------------------------------
    // Private functions
    // -----------------------------------------------

    async _addGameMaster() {
        if (!game.combat.combatants.map(c => c.id).includes(game.combat.system.gmId)) {
            const gmImg = game.settings.get("shadowdark-crawl-helper", "gm-img");
            const gm = await game.combat.createEmbeddedDocuments("Combatant", [{
                name: game.user.name, 
                type: "shadowdark-crawl-helper.crawler",
                system: {type:"GM"},
                img: gmImg, 
                hidden: false
            }]);
            await game.combat.update({"system.gmId": gm[0].id})
        }
    }

    async _addParty() {
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
        this._connectSceneTokens();
    }

    async _connectSceneTokens() { //connects scene tokens to player placeholders in crawl
        if (!game.combat) return;
        const changes = [];
        for (const combatant of game.combat.combatants) {
            //gets first combatant and token and matches them 
            if (combatant.actorId) { 
                const token = game.scenes.active.tokens.find(t => t.actorId === combatant.actorId);
                if (token) {
                    changes.push({
                        "_id": combatant.id,
                        tokenId: token.id,
                        sceneId: game.scenes.active.id,
                    });
                }
            }
        }
        game.combat.updateEmbeddedDocuments("Combatant", changes)
    }

    async _gmTurn(round) { 
        //test for encounters
        if ((game.combat.system.nextEncounter <= round) && !game.combat.system.inCombat) {
            await this._checkForEncounter(1);

            //set new encounter check
            await game.combat.update({"system": {
                "nextEncounter": round + this._getDangerLevel(true) + 1
            }})
        }

    }

    async _onDangerChange(event) {
        await this._setDangerLevel(parseInt(event.currentTarget.value));
        this._setEncounterCheck();
    }

    async _onDrop(event) {
        // get table that was dropped based on event
        const eventData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        if(eventData.type === "RollTable") {
            await this._setEncounterTable(eventData.uuid);
            this.render();
        }
    }

    async _roll(formula, sound=false) {
        let roll = await new Roll(formula).evaluate();
        if(sound) shadowdark.utils.diceSound()
        return roll._total;
    }

    async _updateRound() {
        // Do a GM turn in case it was skipped.
        await this._gmTurn(game.combat.round-1);
    }

    async _updateTurn(direction) {
        if ((direction > 0)) {
            const combatant = game.combat?.combatant;
            const deathTimer = game.settings.get("shadowdark-crawl-helper", "death-timer");
            //test for GM's turn
            if (combatant.id === game.combat.system.gmId) {
                await this._gmTurn(game.combat.round);
            }
            //test for dying
            else if (combatant.system.isDying && deathTimer) {
                const dyingRounds = combatant.system.dyingRounds
                if (dyingRounds === null) {
                    //roll initial death timer
                    await combatant.system.rollDeathTimer();
                }
                else {
                    //test for recovery
                    if (await combatant.system.rollRecovery()) {
                        await combatant.update({"system.dyingRounds": null});
                        await combatant.actor.unsetFlag("shadowdark-crawl-helper", "dying");
                        await combatant.actor.update({"system.attributes.hp.value": 1});
                        await ChatMessage.create({
                            content: `<div class="shadowdark"><h2 class="centered">${combatant.actor.name} Recovers!</h2></div>`,
                        });
                    }
                    //decrement dying rounds left
                    else if (dyingRounds > 1) {
                        await combatant.system.updateDeathTimer();
                    }
                    //kill combatant
                    else if (dyingRounds <= 1) {
                        await combatant.update({"system.dyingRounds": null});
                        await combatant.system.toggleDefeated();
                        await combatant.actor.unsetFlag("shadowdark-crawl-helper", "dying");
                        await ChatMessage.create({
                            content: `<div class="shadowdark"><h2 class="centered">${combatant.actor.name} Dies</h2></div>`,
                        });
                    }
                }
            }
        }
    }

    async _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _setEncounterCheck() {
        if (game.combat) {
            await game.combat.update({"system": {
                "nextEncounter": game.combat.round + this._getDangerLevel(true) + 1
            }})
        }
    }

    async _checkForEncounter(onOrUnder=1){

        let result = null;
        let encounter = true;
        const rollEncounter = game.settings.get("shadowdark-crawl-helper", "roll-encounter");

        if (onOrUnder!=0){
            result = await this._roll("1d6", true);
            encounter = result <= onOrUnder;
        }

        //post message to chat
        const content = await renderTemplate("modules/shadowdark-crawl-helper/templates/chats/encounter-check.hbs", 
            {result, encounter, rollEncounter}
        );

        await ChatMessage.create( {
            content: content,
            whisper: [game.user],
        });

        if (encounter && rollEncounter) this._encounter();
 
        this._setEncounterCheck();
    }

    async _encounter(){
        const encounterTable = await fromUuid(this._getEncounterTable(true));
        if (encounterTable) {
            const options = {displayChat:true, rollMode: CONST.DICE_ROLL_MODES.PRIVATE};
            const results = encounterTable.draw(options);
        }
    }

    _getDangerLevel(activeScene=false) {
        const scene = activeScene? game.scenes.active : game.scenes.viewed;
        const dangerLevel = scene?.getFlag('shadowdark-crawl-helper', 'dangerLevel');
        if (dangerLevel >= 0 && dangerLevel <= 2 && Number.isInteger(dangerLevel)) {
            return dangerLevel;
        }
        else {
            this._setDangerLevel(2);
            return 2
        }
    }

    _getEncounterTable(activeScene=false) {
        const scene = activeScene? game.scenes.active : game.scenes.viewed;
        return scene?.getFlag('shadowdark-crawl-helper', 'encounterTable') ?? null;
    }

    async _setDangerLevel(dangerLevel) {
        const scene = game.scenes.viewed;
        if (dangerLevel >= 0 && dangerLevel <= 2 && Number.isInteger(dangerLevel)) {
            return await scene?.setFlag('shadowdark-crawl-helper', 'dangerLevel', dangerLevel);
        }
    }

    async _setEncounterTable(encounterTableUuid) {
        const scene = game.scenes.viewed;
        return await scene?.setFlag('shadowdark-crawl-helper', 'encounterTable', encounterTableUuid);
    }

}