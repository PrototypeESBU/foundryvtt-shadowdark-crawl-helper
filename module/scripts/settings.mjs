// a function that registers all the settings used by the module
export default function registerSettings() {
    game.settings.register("shadowdark-crawl-helper", "lastVersion", {
		name: "shadowdark-crawl-helper.lastVersion",
		default: "",
		type: String,
	});
}