const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class crawlingHelperMacro extends HandlebarsApplicationMixin(ApplicationV2) {
    
    // -----------------------------------------------
    // Default Application Options
    // -----------------------------------------------
    static DEFAULT_OPTIONS = {
        id: "crawling-helper-macro",
        form: {
            handler: crawlingHelperMacro.formHandler,
            submitOnChange: false,
            closeOnSubmit: false
        },
        position: {
            width: 400,
            height: "auto"
        },
        window: {
            icon: "fas fa-dungeon",
            title: "Crawling Helper"
        },
        actions: {
            updateDangerLevel: crawlingHelperMacro.updateDangerLevel,
            updateRollTable: crawlingHelperMacro.updateRollTable,
            addParty: crawlingHelperMacro.addPartyToTracker,
            addSelected: crawlingHelperMacro.addSelectedToTracker,
            resetInitiative: crawlingHelperMacro.resetInitiative,
            beginCrawling: crawlingHelperMacro.beginCrawlingTracker,
            beginCombat: crawlingHelperMacro.beginCombatTracker
        }
    };

    // ✅ Corrected PARTS definition
    static PARTS = {
        main: {
            template: "modules/shadowdark-crawl-helper/templates/dialog.hbs"
        }
    };

    // -----------------------------------------------
    // Class Constructor
    // -----------------------------------------------
    constructor() {
        super();
        this.dangerLevels = ["Unsafe", "Risky", "Deadly"];
        this.currentDangerLevel = "Unsafe";
        this.encounterTableId = null;
    }

    // -----------------------------------------------
    // Data Preparation for Template Rendering
    // -----------------------------------------------
    async _prepareContext(options) {
        const rollTables = await this.getRollTables();

        return {
            dangerLevels: this.dangerLevels,
            currentDangerLevel: this.currentDangerLevel,
            rollTables: rollTables,
            selectedRollTable: this.encounterTableId
        };
    }

    // -----------------------------------------------
    // Ensure Buttons Work After Render
    // -----------------------------------------------
    async _onRender(context, options) {
        console.log("🛠️ Crawling Helper Dialog Rendered");

        this.element.querySelector("#danger-level")?.addEventListener("change", (e) =>
            this.updateDangerLevel(e.target.value)
        );
        this.element.querySelector("#roll-table")?.addEventListener("change", (e) =>
            this.updateRollTable(e.target.value)
        );
        this.element.querySelector("#add-party")?.addEventListener("click", () =>
            this.addPartyToTracker()
        );
        this.element.querySelector("#add-selected")?.addEventListener("click", () =>
            this.addSelectedToTracker()
        );
        this.element.querySelector("#reset-initiative")?.addEventListener("click", () =>
            this.resetInitiative()
        );
        this.element.querySelector("#begin-crawling")?.addEventListener("click", () =>
            this.beginCrawlingTracker()
        );
        this.element.querySelector("#begin-combat")?.addEventListener("click", () =>
            this.beginCombatTracker()
        );
    }

    // -----------------------------------------------
    // Action Handlers for UI Buttons
    // -----------------------------------------------

static async updateDangerLevel(event, target) {
    const level = target.value;
    game.crawlHelper.crawlingHelperMacro.currentDangerLevel = level;
    ui.notifications.info(`🛡️ Danger level set to: ${level}`);
}

static async updateRollTable(event, target) {
    const tableId = target.value;
    game.crawlHelper.crawlingHelperMacro.encounterTableId = tableId;
    ui.notifications.info("📜 Encounter table selected.");
}

static async addPartyToTracker() {
    const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

    if (partyActors.length === 0) {
        ui.notifications.warn("⚠️ No active party members found.");
        return;
    }

    for (const actor of partyActors) {
        ui.notifications.info(`🛡️ ${actor.name} added to tracker.`);
    }
}

static async addSelectedToTracker() {
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
        ui.notifications.warn("⚠️ No tokens selected.");
        return;
    }

    for (const token of selectedTokens) {
        ui.notifications.info(`🛡️ ${token.name} added to tracker.`);
    }
}

static async resetInitiative() {
    if (game.combat) {
        await game.combat.resetAll();
        ui.notifications.info("♻️ Initiative has been reset.");
    } else {
        ui.notifications.warn("⚠️ No active combat to reset.");
    }
}

static async beginCrawlingTracker() {
    ui.notifications.info("🗺️ Crawling mode started.");
    // TODO: Add crawling tracker logic here.
}

static async beginCombatTracker() {
    ui.notifications.info("⚔️ Combat mode started.");
    // TODO: Add combat tracker logic here.
}

    // -----------------------------------------------
    // Fetch Available Roll Tables
    // -----------------------------------------------
    async getRollTables() {
        const tables = game.tables.contents.filter(t => /Random\s+Encounters:/i.test(t.name));
        return tables.map(t => ({ name: t.name, id: t.uuid }));
    }

    // -----------------------------------------------
    // Optional Form Handler (If Needed)
    // -----------------------------------------------
    static async formHandler(event, form, formData) {
        console.warn("Form submitted", formData);
    }
}
