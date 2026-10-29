// Monaco is bundled locally since the panel runs offline, only the languages server files use are kept
import { loader } from "@monaco-editor/react";
import "monaco-editor/features/register.all.js";
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/languages/features/json/register.js";
import "monaco-editor/languages/definitions/css/register.js";
import "monaco-editor/languages/definitions/dockerfile/register.js";
import "monaco-editor/languages/definitions/html/register.js";
import "monaco-editor/languages/definitions/ini/register.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/languages/definitions/less/register.js";
import "monaco-editor/languages/definitions/lua/register.js";
import "monaco-editor/languages/definitions/markdown/register.js";
import "monaco-editor/languages/definitions/php/register.js";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/languages/definitions/ruby/register.js";
import "monaco-editor/languages/definitions/scss/register.js";
import "monaco-editor/languages/definitions/shell/register.js";
import "monaco-editor/languages/definitions/sql/register.js";
import "monaco-editor/languages/definitions/typescript/register.js";
import "monaco-editor/languages/definitions/xml/register.js";
import "monaco-editor/languages/definitions/yaml/register.js";

self.MonacoEnvironment = {
  getWorker: (_, label) =>
    label === "json"
      ? new Worker(new URL("monaco-editor/languages/features/json/json.worker.js", import.meta.url), { type: "module" })
      : new Worker(new URL("monaco-editor/editor/editor.worker.js", import.meta.url), { type: "module" }),
};

loader.config({ monaco });

export { default } from "@monaco-editor/react";
