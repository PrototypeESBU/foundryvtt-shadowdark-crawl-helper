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
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
        requiresReload: true,
	});

    game.settings.register("shadowdark-crawl-helper", "add-gm", {
		name: "Add GM When Crawl Starts",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "gm-img", {
		name: "GM Portrait Art",
        scope: "world",
        config: true,
		default: "modules/shadowdark-crawl-helper/assets/dungeon-master.png",
		type: String,
        filePicker: true,
	});

    game.settings.register("shadowdark-crawl-helper", "add-party", {
		name: "Add Party When Crawl Starts",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "roll-encounter", {
		name: "Automatically Roll Encounter Table",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "notify-on-turn", {
		name: "Turn Start Notifications",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
	});

    game.settings.register("shadowdark-crawl-helper", "sound-on-turn-path", {
		name: "Turn Start Sound File",
        scope: "world",
        config: true,
		default: "sounds/combat/epic-turn-1hit.ogg",
		type: String,
        filePicker: true,
	});
    

    //Player Settings (client level)

    game.settings.register("shadowdark-crawl-helper", "sound-on-turn", {
		name: "Play Sound on Turn Start",
        scope: "Client",
        config: true,
		default: true,
		type: Boolean,
	});
}