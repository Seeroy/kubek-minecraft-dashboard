import type { JavaVersion } from "../modals/CreateServerModal/types";

export const SAMPLE_VERSIONS = ["1.21.4", "1.21.3", "1.20.6"];

const java = (version: string): JavaVersion => ({ version, label: `Java ${version}`, managed: true, installed: true, description: "LTS" });

export const SAMPLE_JAVA_OPTIONS: JavaVersion[] = [java("21"), java("17"), java("8")];
