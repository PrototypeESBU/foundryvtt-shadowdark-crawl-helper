export default async function timePasses() {

    const dialogContent = await renderTemplate("modules/shadowdark-crawl-helper/templates/dialogs/timepasses-dialog.hbs");
  
    new foundry.applications.api.DialogV2({
      window: { title: "Time Passes" },
      content: dialogContent,
      buttons: [{
        action: "advance",
        label: "Pass Time",
        default: true,
        callback: (event, button, dialog) => button.form.elements.minutes.valueAsNumber
      }],
      submit: async (result) => {
        if (isNaN(result) || result <= 0) {
          return ui.notifications.warn("Please enter a valid number of minutes greater than 0.");
        }
  
        const seconds = result * 60;
        await game.time.advance(seconds);
  
        const players = game.combat.combatants.filter(c => c.system.type === "Player");
        let expiredEffectsList = [];
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
            expiredEffectsList.push(`<strong>${actor.name}</strong> - ${names.join(", ")}`);
          }
        }
        const expiredEffectsText = expiredEffectsList.length > 0 ? expiredEffectsList.join("<br>") : "None";
  
        const cardContent = await renderTemplate("modules/shadowdark-crawl-helper/templates/chats/timepasses-card.hbs", {
          minutes: result,
          expiredEffectsText
        });
        await ChatMessage.create({ content: cardContent });
        ui.notifications.info(`Time advanced by ${result} minute(s).`);
  
        await checkForEncounter(3);
      },
      rejectClose: false,
      modal: true
    }).render({ force: true });
  }
  
  async function checkForEncounter(threshold = 3) {
    const result = await new Roll("1d6").evaluate({ async: true });
    const encounter = result.total <= threshold;
    const content = await renderTemplate("modules/shadowdark-crawl-helper/templates/chats/encounter-check.hbs", {
      result: result.total,
      encounter
    });
    await ChatMessage.create({ content, whisper: [game.user] });
    if (encounter) {
      // Add encounter logic here if needed.
    }
  }
  