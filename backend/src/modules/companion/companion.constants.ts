/** The plugin stays idle unless the panel passes this at launch */
export const COMPANION_TOKEN_ENV = "KUBEK_COMPANION_TOKEN";

/** `name` from the plugin's plugin.yml */
export const COMPANION_PLUGIN_NAME = "KubekCompanion";

export const COMPANION_REPO = "KubekPanel/kubek-companion";
export const COMPANION_REPO_URL = `https://github.com/${COMPANION_REPO}`;
// Release asset, e.g. KubekCompanion-1.0.0.jar
export const COMPANION_ASSET = /^KubekCompanion-[\w.+-]+\.jar$/;

/** Stats interval the panel asks for */
export const COMPANION_INTERVAL_SEC = 15;
