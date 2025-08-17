const fields = foundry.data.fields;

export class crawlCombat extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            inCombat: new fields.BooleanField({ initial: false }),
            nextEncounter: new fields.NumberField({ integer: true, min: 0, initial: 3 }),
            dangerLevel: new fields.NumberField({ integer: true, min: 0, initial: 2 }),
            encounterTable: new fields.DocumentUUIDField({ initial: null }),
            gmId: new fields.DocumentIdField({ initial: null }),
        };
    }
}

export class crawlCombatant extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            type: new fields.StringField({
                initial: "NPC",
                choices: ["GM","Player","NPC"],
                nullable: false,
            }),
            crawlingInit: new fields.NumberField({ required: true, integer: true, min: 0, nullable: true, initial: null}),
        };
    }
}

export class party extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            type: new fields.StringField({
                required: true,
                initial: "NPC",
                choices: ["GM","Player","NPC"],
                nullable: false,
            }),
        };
    }

}