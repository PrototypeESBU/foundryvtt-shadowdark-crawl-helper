const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class gmTools extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor() {
        super();

        this._dragDrop = this.options.dragDrop.map(d => {
            d.callbacks = {drop: this._onDrop.bind(this)};
            return new DragDrop(d);
        }); 
        this.dangerIndex = [
            game.i18n.localize("CRAWLHELPER.danger.deadly"),
            game.i18n.localize("CRAWLHELPER.danger.risky"),
            game.i18n.localize("CRAWLHELPER.danger.unsafe")
        ]

        Hooks.on("canvasReady", this._onCanvasReady.bind(this));
        Hooks.on('updateCombat', this._onUpdateCombat.bind(this));
        Hooks.on('deleteCombatant', this._onDeleteCombatant.bind(this));
        Hooks.on('updateCombatant', this._onUpdateCombatant.bind(this));
        Hooks.on("renderChatInput", () => {this.render()});
    }

    static DEFAULT_OPTIONS = {
        id: "gmtools",
        classes: ["gm-tools"],
        dragDrop: [{ dragSelector: null, dropSelector: '[data-drop]' }],
        position: {
            top:0,
            left:0,
        },
        window: {
            frame: false,
        },
        actions: {
            endCrawling: this.endCrawling,
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
            context.dangerIndex = this.dangerIndex
            if(game.combat) {
                context.dangerLevel = game.combat.system.dangerLevel;
                context.encounterTable = game.combat.system.encounterTable ? 
                    fromUuidSync(game.combat.system.encounterTable) : "";
            }
            else {
                context.dangerLevel = 0;
                context.encounterTable = null;
            }
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
    async _onUpdateCombat(changed, options) {
         if (game?.combat?.started) { 
            if ("round" in changed) {
                await this._updateRound();
            } 
            else if ("turn" in changed) {
                await this._updateTurn(options.direction);
            }
        }
    }
    
    //Combatants
    async _onDeleteCombatant(combatant, updates){ 
        if(combatant.id === game.combat.system.gmId){
            await game.combat.update({"system.gmId": null})
        }
    };

    async _onUpdateCombatant(combatant, updates) {
        // TODO check for < 50% defeated and call moral check
    }

    //other
    async _onCanvasReady(canvas) {
        // detect scene changes and attempt to link scene tokens to combatants
        if (game.combat) this._connectSceneTokens();
    }

    // -----------------------------------------------
    // Action Functions
    // -----------------------------------------------

    static async endCrawling(event, target) {
        await game.combat.endCombat();
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
        game.combat.update({"system.encounterTable": ""})
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

        //do required setup 
        await this._setEncounterCheck();
        if (game.settings.get("shadowdark-crawl-helper", "add-gm"))
            await this._addGameMaster(); 
        if (game.settings.get("shadowdark-crawl-helper", "add-party"))
            await this._addParty();

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
        const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

        for (const actor of partyActors) {
            //gets first combatant and token and matches them 
            const combatant = game.combat.combatants.find(c => c.actorId === actor.id); 
            const token = game.scenes.active.tokens.find(t => t.actorId === actor.id);
            if (combatant && token) {
                game.combat.updateEmbeddedDocuments("Combatant", [{
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

    async _gmTurn(round) { 
        //test for encounters
        if ((game.combat.system.nextEncounter <= round) && !game.combat.system.inCombat) {
            await this._checkForEncounter(1);

            //set new encounter check
            await game.combat.update({"system": {
                "nextEncounter": round + game.combat.system.dangerLevel + 1
            }})
        }

    }

    async _initializeCrawl() { 
        // loads tracking data from an exiting combat on initialization
        
        // TODO run this during config init
        if (game.combat._source.scene) game.combat.toggleSceneLink();  

    }

    async _onDangerChange(event) {
        await game.combat.update({"system.dangerLevel": parseInt(event.currentTarget.value)})
        game.crawlHelper.tracker._setEncounterCheck();
    }

    async _onDrop(event) {
        // get table that was dropped based on event
        const eventData = TextEditor.getDragEventData(event);
        if(eventData.type === "RollTable") {
            await game.combat.update({"system.encounterTable": eventData.uuid});
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
        //test for GM's turn
        if ((game.combat.combatant.id === game.combat.system.gmId) && (direction > 0)) {
            await this._gmTurn(game.combat.round);
        }
    }

    async _setEncounterCheck() {
        await game.combat.update({"system": {
            "nextEncounter": game.combat.round + game.combat.system.dangerLevel + 1
        }})
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
        const encounterTable = await fromUuid(game.combat.system.encounterTable);
        if (encounterTable) {
            const options = {displayChat:true, rollMode: CONST.DICE_ROLL_MODES.PRIVATE};
            const results = encounterTable.draw(options);
        }
    }

}