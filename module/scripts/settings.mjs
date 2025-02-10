// a function that registers all the settings used by the module
export default function registerSettings() {
    //Settings not shown in the menu
    game.settings.register("shadowdark-crawl-helper", "lastVersion", {
		name: "shadowdark-crawl-helper.lastVersion",
		default: "",
		type: String,
	});

    //
    game.settings.register("shadowdark-crawl-helper", "carousel", {
		name: "Enabled Actor Carousel",
        scope: "world",
        config: true,
		default: true,
		type: Boolean,
        requiresReload: true,
	});
    
}