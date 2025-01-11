export class crawlingHelper {
    constructor() {
        this.dangerLevels = ["Unsafe", "Risky", "Deadly"];
        this.currentDangerLevel = "Unsafe";
        this.encounterTableId = null;
    }

    async openDialog() {
        const rollTables = await this.getRollTables();

        const content = await renderTemplate("modules/crawling-helper/templates/dialog.hbs", {
            dangerLevels: this.dangerLevels,
            currentDangerLevel: this.currentDangerLevel,
            rollTables: rollTables,
            selectedRollTable: this.encounterTableId
        });

        new Dialog({
            title: "Crawling Helper",
            content,
            buttons: {
                close: { label: "Close" }
            },
            render: (html) => {
                html.find("#danger-level").change((e) => this.updateDangerLevel(e.target.value));
                html.find("#roll-table").change((e) => this.updateRollTable(e.target.value));
                html.find("#add-party").click(() => this.addPartyToTracker());
                html.find("#add-selected").click(() => this.addSelectedToTracker());
                html.find("#reset-initiative").click(() => this.resetInitiative());
                html.find("#begin-crawling").click(() => this.beginCrawlingTracker());
                html.find("#begin-combat").click(() => this.beginCombatTracker());
            }
        }).render(true);
    }

    async getRollTables() {
        const tables = game.tables.contents.filter(t => /Random\s+Encounters:/i.test(t.name));
        return tables.map(t => ({ name: t.name, id: t.uuid }));
    }

    async updateDangerLevel(level) {
        this.currentDangerLevel = level;
        ui.notifications.info(`Danger level set to: ${level}`);
    }

    async updateRollTable(tableId) {
        this.encounterTableId = tableId;
        ui.notifications.info(`Encounter table selected.`);
    }

    async addPartyToTracker() {
        ui.notifications.info("Added party to tracker.");
    }

    async addSelectedToTracker() {
        ui.notifications.info("Added selected tokens.");
    }

    async resetInitiative() {
        if (game.combat) {
            await game.combat.resetAll();
            ui.notifications.info("Initiative has been reset.");
        }
    }

    async beginCrawlingTracker() {
        ui.notifications.info("Crawling mode started.");
    }

    async beginCombatTracker() {
        ui.notifications.info("Combat mode started.");
    }
}
