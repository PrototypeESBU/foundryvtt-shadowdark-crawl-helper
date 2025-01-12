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
        const rollTables = await this.getAllRollTables();
    
        return {
            dangerLevels: this.dangerLevels,
            currentDangerLevel: this.currentDangerLevel,
            rollTables: rollTables,
            selectedRollTable: this.encounterTableId
        };
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
    const scene = game.scenes.active;

    if (!scene) {
        ui.notifications.error("⚠️ No active scene found.");
        return;
    }

    const partyActors = game.users
        .filter(user => user.active && user.character)
        .map(user => user.character);

    if (partyActors.length === 0) {
        ui.notifications.warn("⚠️ No active party members found.");
        return;
    }

    let addedCount = 0;

    for (const actor of partyActors) {
        // Get active tokens on the scene
        let tokens = actor.getActiveTokens();

        // If no token exists, spawn one
        if (tokens.length === 0) {
            const tokenData = await actor.getTokenDocument();
            tokenData.updateSource({ 
                x: Math.floor(scene.width / 2), 
                y: Math.floor(scene.height / 2) 
            });

            const [createdToken] = await scene.createEmbeddedDocuments("Token", [tokenData]);
            tokens = [createdToken];
            ui.notifications.info(`📌 Spawned token for ${actor.name}.`);
        }

        // ✅ Use token.document to access toggleCombatant()
        for (const token of tokens) {
            await token.document.toggleCombatant();
            addedCount++;
        }
    }

    if (addedCount > 0) {
        ui.notifications.info(`🛡️ Toggled ${addedCount} party token(s) to the Combat Tracker.`);
    } else {
        ui.notifications.warn("⚠️ No party tokens were added to the Combat Tracker.");
    }
}

static async addSelectedToTracker() {
    const selectedTokens = canvas.tokens.controlled;

    if (selectedTokens.length === 0) {
        ui.notifications.warn("⚠️ No tokens selected on the canvas.");
        return;
    }

    for (const token of selectedTokens) {
        await token.document.toggleCombatant();  // 💡 Add or remove from combat tracker
    }

    ui.notifications.info(`🛡️ ${selectedTokens.length} token(s) toggled in the Combat Tracker.`);
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
    // Fetch All Roll Tables (World + Compendiums)
    // -----------------------------------------------
async getAllRollTables(searchTerm = "Random Encounters") {
    const foundTables = [];

    // 🔎 Search World Roll Tables
    game.tables.forEach(table => {
        if (table.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            foundTables.push({ name: table.name, id: table.uuid });
        }
    });

    // 🔎 Search Compendium Roll Tables
    for (const pack of game.packs) {
        if (pack.metadata.type === "RollTable") {
            try {
                const tables = await pack.getDocuments();
                tables.forEach(table => {
                    if (table.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                        foundTables.push({
                            name: `[${pack.metadata.label}] ${table.name}`,
                            id: table.uuid
                        });
                    }
                });
            } catch (err) {
                console.warn(`❗ Failed to load compendium: ${pack.metadata.label}`, err);
            }
        }
    }

    // 🚨 Warn if no tables are found
    if (foundTables.length === 0) {
        ui.notifications.warn(`⚠️ No roll tables found with "${searchTerm}".`);
    }

    return foundTables;
}

    // -----------------------------------------------
    // Populate Roll Table Dropdown
    // -----------------------------------------------
async populateRollTableDropdown() {
    const tables = await this.getAllRollTables();

    return tables.map(
        (table) => `<option value="${table.id}">${table.name}</option>`
    ).join("\n");
}

    // -----------------------------------------------
    // Optional Form Handler (If Needed)
    // -----------------------------------------------
    static async formHandler(event, form, formData) {
        console.warn("Form submitted", formData);
    }
}
