// a function that registers all the settings used by the module
export default function registerSettings() {
    //Settings not shown in the menu
    game.settings.register("shadowdark-crawl-helper", "lastVersion", {
        name: "shadowdark-crawl-helper.lastVersion",
        default: "",
        type: String,
    });

    //GM Settings (World level)
    game.settings.register("shadowdark-crawl-helper", "carousel", {
        name: "Enabled Actor Carousel",
        hint: "CRAWLHELPER.settings.carousel.hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        requiresReload: true,
    });

    game.settings.register("shadowdark-crawl-helper", "add-gm", {
        name: "Add GM When Crawl Starts",
        hint: "CRAWLHELPER.settings.add-gm.hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("shadowdark-crawl-helper", "gm-img", {
        name: "GM Portrait Art",
        hint: "CRAWLHELPER.settings.gm-img.hint",
        scope: "world",
        config: true,
        default: "modules/shadowdark-crawl-helper/assets/dungeon-master.png",
        type: String,
        filePicker: true,
    });

    game.settings.register("shadowdark-crawl-helper", "add-party", {
        name: "Add Party When Crawl Starts",
        hint: "CRAWLHELPER.settings.add-party.hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("shadowdark-crawl-helper", "save-crawl-initiative", {
	    name: "CRAWLHELPER.settings.save-crawl-initiative.name",
        hint: "CRAWLHELPER.settings.save-crawl-initiative.hint",
        scope: "world",
        config: true,
		default: false,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "roll-encounter", {
        name: "CRAWLHELPER.settings.roll-encounter.name",
        hint:"CRAWLHELPER.settings.roll-encounter.hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("shadowdark-crawl-helper", "notify-on-turn", {
        name: "CRAWLHELPER.settings.notify-on-turn.name",
        hint: "CRAWLHELPER.settings.notify-on-turn.hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register("shadowdark-crawl-helper", "sound-on-turn-path", {
        name: "CRAWLHELPER.settings.sound-on-turn-path.name",
        hint: "CRAWLHELPER.settings.sound-on-turn-path.hint",
        scope: "world",
        config: true,
        default: "sounds/combat/epic-turn-1hit.ogg",
        type: String,
        filePicker: true,
    });
    

    game.settings.register("shadowdark-crawl-helper", "hide-combat-sidebar", {
        name: "CRAWLHELPER.settings.hide-combat-sidebar.name",
        hint: "CRAWLHELPER.settings.hide-combat-sidebar.hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        requiresReload: true,
    });

    game.settings.register("shadowdark-crawl-helper", "show-NPC-Health-Bars", {
        name: "CRAWLHELPER.settings.show-NPC-Health-Bars.name",
        hint: "CRAWLHELPER.settings.show-NPC-Health-Bars.hint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true,
    });

    game.settings.register("shadowdark-crawl-helper", "show-hidden-portraits", {
        name: "Show Hidden Portraits",
        hint: " Playsers can see the portrait picture of hidden monsters / NPCs",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true
    });

    game.settings.register("shadowdark-crawl-helper", "death-timer", {
        name: "Automate Death Timer",
        hint: "Automatically prompt for and track death timer rolls.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    //Player Settings (client level)

    game.settings.register("shadowdark-crawl-helper", "sound-on-turn", {
        name: "CRAWLHELPER.settings.sound-on-turn.name",
        hint: "CRAWLHELPER.settings.sound-on-turn.hint",
        scope: "Client",
        config: true,
        default: true,
        type: Boolean,
    });
}