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
            crawlingInit: new fields.NumberField({integer: true, min: 0, nullable: true, initial: null}),
            isMasked: new fields.BooleanField({ initial: false }),
            dyingRounds: new fields.NumberField({integer: true, min: 0, nullable: true, initial: null}),
        };
    }

    async toggleMasked() {
        const combatant = this.parent;
        combatant.update({"system.isMasked": !this.isMasked});
    }

    async toggleVisibility() {
        const combatant = this.parent;
        combatant?.token.update({hidden: !combatant.hidden});
        combatant.update({hidden: !combatant.hidden});
        
    };

    async toggleDefeated() {
        const combatant = this.parent;
        const isDefeated = !combatant.isDefeated;
        await combatant.update({defeated: isDefeated});
        const defeatedId = CONFIG.specialStatusEffects.DEFEATED;
        await combatant.actor?.toggleStatusEffect(defeatedId, {overlay: true, active: isDefeated});
    };

    async rollDeathTimer() {
        const actor = this.parent.actor;
        const formula = "d4 +" + actor.system.abilities.con.mod;
        let roll = await new Roll(formula).evaluate();
        const msg = await ChatMessage.create({
            content: `<div class="shadowdark"><h3>${actor.name} will die in ${roll.total} rounds</h3><br>${await roll.render()}</div>`,
            rolls: [roll.toJSON()]
        });
        if (game.dice3d) await game.dice3d.waitFor3DAnimationByMessageID(msg.id);
        await this.parent.update({"system.dyingRounds": roll.total});

        // TODO revisit this. Currently conditions are fairly broken in the shadowdark system. 
            /* 
            const img = "icons/skills/wounds/injury-body-pain-gray.webp";
            const effect = {
                name: "Dying",
                type: "Effect",
                img,
                system: { 
                    category: "condition",
                    effectPanel: {show: true},
                    tokenIcon: {show: true},
                    source: {title: ""},
                }
            };
            const effects = await actor.createEmbeddedDocuments("Item",[effect]);
            if (effects) {
                const activeEffect = {name: "Dying", img, duration: {dyingRounds}};
                effects[0].createEmbeddedDocuments("ActiveEffect",[activeEffect]);
            }
            */
    }

    async updateDeathTimer() {
        const actor = this.parent.actor;
        const msg = await ChatMessage.create({
            content: `<div class="shadowdark"><h3>${actor.name} will die in ${this.dyingRounds - 1} rounds</h3></div>`,
        });
        await this.parent.update({"system.dyingRounds": this.dyingRounds - 1});
    }

    async rollRecovery() {
        const roll = await new Roll("d20").evaluate();
        const actor = this.parent.actor;
        const msg = await ChatMessage.create({
            content: `<div class="shadowdark"><h3>Dying Recovery Roll</h3><br>${await roll.render()}</div>`,
            speaker: {actor: actor.id},
            user: game.users.find(u => u.character?.id === actor.id),
            rolls: [roll.toJSON()]
        });
        if (game.dice3d) await game.dice3d.waitFor3DAnimationByMessageID(msg.id);
        return roll.total === 20 ?? false;
    }

    get isDying() {
        return this.parent?.actor?.getFlag("shadowdark-crawl-helper", "dying")? true : false;
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