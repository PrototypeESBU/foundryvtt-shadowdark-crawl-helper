import { rollup } from "rollup";
import eslint from "gulp-eslint-new";
import gulp from "gulp";
import gulpIf from "gulp-if";
import mergeStream from "merge-stream";
import nodeResolve from "@rollup/plugin-node-resolve";

const SRC_LINT_PATHS = ["./module/crawl-helper.mjs","./module/scripts/"];

// Compile javascript source files into a single output file.
//
async function compileJavascript() {
	const bundle = await rollup({
		input: "./module/crawl-helper.mjs",
		plugins: [nodeResolve()],
	});
	await bundle.write({
		file: "./module/crawl-helper-compiled.mjs",
		format: "es",
		sourcemap: true,
		sourcemapFile: "./module/crawl-helper.mjs",
	});
}
export const compile = compileJavascript;

// Use eslint to check for formatting issues
//
function lintJavascript() {
	const tasks = SRC_LINT_PATHS.map(path => {
		const src = path.endsWith("/")
			? `${path}**/*.mjs`
			: path;
        console.log(src);
		const dest = path.endsWith("/")
			? path
			: `${path.split("/").slice(0, -1).join("/")}/`;
        console.log(dest);
		return gulp
			.src(src)
			.pipe(eslint({ fix: true }))
			.pipe(eslint.format())
			.pipe(
				gulpIf(
					file => file.eslint != null && file.eslint.fixed,
					gulp.dest(dest)
				)
			);
	});

	return mergeStream(tasks);
}
export const lint = lintJavascript;

// Watch for file changes and lint when they do 
//
export async function watchJavascriptUpdates() {
	gulp.watch(SRC_LINT_PATHS, gulp.parallel(compile));
}
export const watchUpdates = watchJavascriptUpdates;