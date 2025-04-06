export default class utilitiesCH {

    getCombatantActor(combatantId) {
        const combatant = game.combat.combatants.get(combatantId);
        if (combatant.tokenId) {
            return game.scenes.get(combatant.sceneId)?.tokens.get(combatant.tokenId)?.actor
        }
        else {
            return game.actors.get(combatant.actorId);
        }
    }

}