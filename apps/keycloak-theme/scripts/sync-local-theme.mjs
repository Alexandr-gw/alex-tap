import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const themeLoginDir = path.join(projectRoot, "theme", "keycloak-theme", "login");
const resourcesDistDir = path.join(themeLoginDir, "resources", "dist");
const templateFiles = ["login.ftl", "login-reset-password.ftl", "info.ftl"];
const previousTemplateContents = templateFiles.map(fileName =>
    readFileSync(path.join(themeLoginDir, fileName), "utf8")
);

const indexHtml = readFileSync(path.join(distDir, "index.html"), "utf8");
const scriptSrcMatch = indexHtml.match(/<script[^>]+src="([^"]+)"/i);
const faviconHrefMatch = indexHtml.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/i);

if (!scriptSrcMatch) {
    throw new Error("Could not find the Vite entry script in dist/index.html");
}

if (!faviconHrefMatch) {
    throw new Error("Could not find the favicon link in dist/index.html");
}

const normalizeDistAssetPath = value => value.replace(/^\.\//, "").replace(/^\//, "");
const scriptSrc = normalizeDistAssetPath(scriptSrcMatch[1]);
const faviconHref = normalizeDistAssetPath(faviconHrefMatch[1]);
const entryScriptPath = path.join(distDir, scriptSrc);
const previousEntryAliases = Array.from(
    new Set(
        previousTemplateContents
            .map(contents => contents.match(/src="\$\{xKeycloakify\.resourcesPath\}\/dist\/([^"]+)"/))
            .map(match => match?.[1] ?? null)
            .filter(aliasPath => aliasPath !== null && aliasPath !== scriptSrc)
    )
);

const entryScriptContents = readFileSync(entryScriptPath, "utf8").replace(
    /return"\/"\+e/g,
    "return e"
);

writeFileSync(entryScriptPath, entryScriptContents, "utf8");

rmSync(resourcesDistDir, { recursive: true, force: true });
mkdirSync(themeLoginDir, { recursive: true });
cpSync(distDir, resourcesDistDir, { recursive: true, force: true });

for (const fileName of templateFiles) {
    const filePath = path.join(themeLoginDir, fileName);
    const fileContents = readFileSync(filePath, "utf8")
        .replace(
            /href="\$\{xKeycloakify\.resourcesPath\}\/dist\/[^"]+"/,
            `href="\${xKeycloakify.resourcesPath}/dist/${faviconHref}"`
        )
        .replace(
            /<script type="module" crossorigin="" src="\$\{xKeycloakify\.resourcesPath\}\/dist\/[^"]+"><\/script>/,
            `<script type="module" crossorigin="" src="\${xKeycloakify.resourcesPath}/dist/${scriptSrc}"></script>`
        );

    writeFileSync(filePath, fileContents, "utf8");
}

for (const aliasPath of previousEntryAliases) {
    const aliasTargetPath = path.join(resourcesDistDir, aliasPath);
    mkdirSync(path.dirname(aliasTargetPath), { recursive: true });
    writeFileSync(aliasTargetPath, entryScriptContents, "utf8");
}

console.log(`Synced local Keycloak filesystem theme from ${distDir} to ${resourcesDistDir}`);
