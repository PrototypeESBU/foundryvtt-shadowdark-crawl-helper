import gulp from "gulp";
import fs from "fs";
import path from "node:path";
import * as css from "./utils/css.mjs";
import * as javascript from "./utils/javascript.mjs";

/********************/
/*      Config      */
/********************/
const PACKAGE_ID = "shadowdark-crawl-helper";
const MODULE_SOURCE_PATH = "./module";

/********************/
/*      BUILD       */
/********************/
export const build = gulp.parallel(
		css.compile,
		//javascript.lint,
		javascript.compile
);

/********************/
/*      WATCH       */
/********************/
export const watch = gulp.series(
	gulp.parallel(
		css.compile,
		//javascript.lint,
		javascript.compile
	),

	gulp.parallel(
		css.watchUpdates,
		javascript.watchUpdates
	)
);

/********************/
/*      LINK        */
/********************/
export async function link() {
    const args = process.argv.splice(3, process.argv.length - 3);
    if (args.length !== 2 || args[0] !== "--user-data-path") {
        console.error("ERROR: Missing --user-data-path Argument");
        return;
    }

    const dataPath = args[1];
    if (!fs.existsSync(dataPath)){
        console.error("ERROR: User data path not found");
        return;
    }

    const linkFile = `${dataPath}/Data/modules/${PACKAGE_ID}`;
    if (fs.existsSync(linkFile)){
        console.error("ERROR: module directory already exists. Uninstall module and try again.");
        return;
    }

    fs.symlink(path.resolve(MODULE_SOURCE_PATH), linkFile, "dir", (err) => {
        if (err) 
            console.error("ERROR: failed to link");
        else
            console.info(`Linked ${path.resolve(MODULE_SOURCE_PATH)} folder to ${linkFile}.`);
    });
}
