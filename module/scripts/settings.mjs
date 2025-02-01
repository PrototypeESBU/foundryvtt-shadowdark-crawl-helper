// a function that registers all the settings used by the module
export default function registerSettings() {
    //Settings not shown in the menu
    game.settings.register("shadowdark-crawl-helper", "lastVersion", {
		name: "shadowdark-crawl-helper.lastVersion",
		default: "",
		type: String,
	});

    
}