import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distKeycloakDir = path.join(projectRoot, "dist_keycloak");

const resourcePathPatch = `<#if xKeycloakify.resourcesPath?has_content && !xKeycloakify.resourcesPath?starts_with("/") && !xKeycloakify.resourcesPath?starts_with("http://") && !xKeycloakify.resourcesPath?starts_with("https://")>
    <#assign xKeycloakify = xKeycloakify + { "resourcesPath": "/" + xKeycloakify.resourcesPath }>
</#if>`;

const themeAssetVersion = "20260416-index-imports-v3";
const vitePreloadUrlPatch = `if(e.startsWith("/")||e.startsWith("http://")||e.startsWith("https://"))return e;const t=globalThis.kcContext&&globalThis.kcContext["x-keycloakify"]&&globalThis.kcContext["x-keycloakify"].resourcesPath;if(t&&e.startsWith(t.replace(/^\\//,"")+"/"))return"/"+e;return t?t.replace(/\\/$/,"")+"/dist/"+e:e`;

function patchFtlFile(filePath) {
    const original = readFileSync(filePath, "utf8");
    let patched = original;

    const marker = `<#if resourceUrl?? && resourceUrl?is_string>
    <#assign xKeycloakify = xKeycloakify + { "resourcesPath": resourceUrl }>
</#if>`;

    if (patched.includes(marker) && !patched.includes("!xKeycloakify.resourcesPath?starts_with(\"/\")")) {
        patched = patched.replace(marker, `${marker}\n${resourcePathPatch}`);
    }

    patched = patched.replace(/^\s*<base href="\$\{xKeycloakify\.resourcesPath\}\/dist\/">\r?\n/m, "");
    patched = patched.replace(
        /(src="\$\{xKeycloakify\.resourcesPath\}\/dist\/assets\/index-[^"]+\.js)(?:\?v=[^"]*)?(")/,
        `$1?v=${themeAssetVersion}$2`,
    );

    if (patched === original) {
        return false;
    }

    writeFileSync(filePath, patched, "utf8");
    return true;
}

function patchJsFile(filePath) {
    const original = readFileSync(filePath, "utf8");
    let patched = original;
    const vitePreloadHelperPattern = /(const [A-Za-z_$][\w$]*="modulepreload",[A-Za-z_$][\w$]*=function\(e\)\{)return e(\},[A-Za-z_$][\w$]*=\{\})/;

    patched = patched.replace(
        /(globalThis|window)\.kcContext\["x-keycloakify"\]\.resourcesPath\.substring\(1\)/g,
        '$1.kcContext["x-keycloakify"].resourcesPath',
    );
    patched = patched.replace(
        /from"\.\/(index-[^"]+\.js)(?:\?v=[^"]*)?"/g,
        `from"./$1?v=${themeAssetVersion}"`,
    );
    patched = patched.replace(
        /"assets\/(index-[^"]+\.js)(?:\?v=[^"]*)?"/g,
        `"assets/$1?v=${themeAssetVersion}"`,
    );
    patched = patched.replace(vitePreloadHelperPattern, `$1${vitePreloadUrlPatch}$2`);
    patched = patched.replace(
        /function ([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\)\{const ([A-Za-z_$][\w$]*)=new Event\("vite:preloadError",\{cancelable:!0\}\);if\(\3\.payload=\2,window\.dispatchEvent\(\3\),!\3\.defaultPrevented\)throw \2\}/,
        'function $1($2){console.warn("Unable to preload Keycloak theme asset",$2)}',
    );

    if (patched === original) {
        return false;
    }

    writeFileSync(filePath, patched, "utf8");
    return true;
}

function walkFiles(rootDir) {
    const files = [];
    const entries = readdirSync(rootDir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            files.push(...walkFiles(entryPath));
        } else if (entry.isFile()) {
            files.push(entryPath);
        }
    }

    return files;
}

if (!existsSync(distKeycloakDir)) {
    throw new Error(`Keycloakify output directory not found: ${distKeycloakDir}`);
}

const jarFileNames = readdirSync(distKeycloakDir).filter(fileName => fileName.endsWith(".jar"));

if (jarFileNames.length === 0) {
    throw new Error(`No Keycloakify JAR files found in ${distKeycloakDir}`);
}

let patchedCount = 0;
let patchedJsCount = 0;

for (const jarFileName of jarFileNames) {
    const jarPath = path.join(distKeycloakDir, jarFileName);
    const tempDir = mkdtempSync(path.join(tmpdir(), "alex-tap-keycloak-theme-"));

    try {
        execFileSync("jar", ["xf", jarPath], { cwd: tempDir, stdio: "inherit" });

        const themeDir = path.join(tempDir, "theme");
        const ftlFiles = existsSync(themeDir)
            ? walkFiles(themeDir).filter(filePath => filePath.endsWith(".ftl"))
            : [];
        const jsFiles = existsSync(themeDir)
            ? walkFiles(themeDir).filter(filePath => filePath.endsWith(".js"))
            : [];

        let jarPatched = false;

        for (const ftlFile of ftlFiles) {
            if (patchFtlFile(ftlFile)) {
                patchedCount += 1;
                jarPatched = true;
            }
        }

        for (const jsFile of jsFiles) {
            if (patchJsFile(jsFile)) {
                patchedJsCount += 1;
                jarPatched = true;
            }
        }

        if (jarPatched) {
            execFileSync("jar", ["uf", jarPath, "theme"], { cwd: tempDir, stdio: "inherit" });
        }
    } finally {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

console.log(`Patched ${patchedCount} Keycloakify FTL template(s) and ${patchedJsCount} Vite entry file(s) in ${jarFileNames.length} JAR file(s)`);
