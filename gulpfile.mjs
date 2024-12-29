import fs from "fs";
import path from "node:path";

/********************/
/*      Config      */
/********************/
const PACKAGE_ID = "shadowdark-crawl-helper";
const MODULE_SOURCE_PATH = "./module";

/********************/
/*      BUILD       */
/********************/
// nothing needed yet

/********************/
/*      LINK        */
/********************/
export async function link() {
    const args = process.argv.splice(3, process.argv.length - 3);
    if (args.length !== 2 || args[0] !== "--user-data-path") {
        Logger.error("ERROR: Missing --user-data-path Argument");
        return;
    }

    const dataPath = args[1];
    if (!fs.existsSync(dataPath)){
        Logger.error("ERROR: User data path not found");
        return;
    }

    const linkFile = `${dataPath}/Data/modules/${PACKAGE_ID}`;
    if (fs.existsSync(linkFile)){
        Logger.error("ERROR: module directory already exists. Uninstall module and try again.");
        return;
    }

    fs.symlink(path.resolve(MODULE_SOURCE_PATH), linkFile, "dir", (err) => {
        if (err) 
            Logger.error("ERROR: failed to link");
        else
            Logger.info(`Linked ${path.resolve(MODULE_SOURCE_PATH)} folder to ${linkFile}.`);
    });
}
