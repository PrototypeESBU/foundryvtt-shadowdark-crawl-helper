const fields = foundry.data.fields;

export class crawlCombat extends foundry.abstract.TypeDataModel {
static defineSchema() {
        return {
        inCombat: new fields.BooleanField({required: true, initial: false}),
        encounterClock: new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        danagerLevel: new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        encoutnerTable: new fields.DocumentIdField({ required: false, initial: null}),
        gmId: new fields.DocumentIdField({ required: false, initial: null}),
    };
}
}

export class crawlCombatant extends foundry.abstract.TypeDataModel {
static defineSchema() {
        return {
        type: new fields.StringField({
            required: true,
            initial: "NPC",
            choices: ["GM","Player","NPC"],
            nullable: false,
        }),
        crawlingInit: new fields.NumberField({ required: true, integer: true, min: 0, nullable: true, initial: null}),
    };
}
}