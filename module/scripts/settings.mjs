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
        hint: "",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
        requiresReload: true,
	});

    game.settings.register("shadowdark-crawl-helper", "add-gm", {
		name: "Add GM When Crawl Starts",
        hint: "",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "gm-img", {
		name: "GM Portrait Art",
        hint: "",
        scope: "world",
        config: true,
		default: "modules/shadowdark-crawl-helper/assets/dungeon-master.png",
		type: String,
        filePicker: true,
	});

    game.settings.register("shadowdark-crawl-helper", "add-party", {
		name: "Add Party When Crawl Starts",
        hint: "",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "roll-encounter", {
		name: "Automatically Roll Encounter Table",
        hint: "",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "notify-on-turn", {
		name: "Turn Start Notifications",
        hint: "",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "sound-on-turn-path", {
		name: "Turn Start Sound File",
        hint: "",
        scope: "world",
        config: true,
		default: "sounds/combat/epic-turn-1hit.ogg",
		type: String,
        filePicker: true,
	});
    

    game.settings.register("shadowdark-crawl-helper", "hide-combat-sidebar", {
		name: "Hide Combat Sidebar",
        hint: "",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
        requiresReload: true,
	});

    game.settings.register("shadowdark-crawl-helper", "show-NPC-Health-Bars", {
		name: "Show NPC Health Bars",
        hint: "Allows players to see the health bar percentages of monsters in the carousel",
        scope: "world",
        config: true,
		default: false,
		type: Boolean,
        requiresReload: true,
	});

    //Player Settings (client level)

    game.settings.register("shadowdark-crawl-helper", "sound-on-turn", {
		name: "Play Sound on Turn Start",
        hint: "",
        scope: "Client",
        config: true,
		default: true,
		type: Boolean,
	});
}