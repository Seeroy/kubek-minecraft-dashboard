import type { TranslationDictionary } from "../../../locales/types";

export const oobeTranslations: TranslationDictionary = {
  steps: {
    eula: {
      title: "End User License Agreement",
      description: "Review and accept the EULA",
    },
    preferences: {
      title: "Preferences",
      description: "Customize your experience",
    },
    "server-creation": {
      title: "Create Your First Server",
      description: "Set up your Minecraft server",
    },
    completion: {
      title: "Welcome to Kubek!",
      description: "You're all set up",
    },
  },
  navigation: {
    back: "Back",
    next: "Next",
    skip: "Skip",
    stepOf: (current: number, total: number) => `Step ${ current } of ${ total }`,
  },
  eulaStep: {
    title: "Kubek End User License Agreement",
    content: `This End User License Agreement ("Agreement") is a legal agreement between you and the Kubek development team for the use of Kubek software ("Software").

1. License Grant
Kubek grants you a non-exclusive, non-transferable license to use the Software for personal and commercial purposes, subject to the terms and conditions of this Agreement.

2. Restrictions
You may not reverse engineer, decompile, or disassemble the Software. You may not modify, adapt, or create derivative works based on the Software without explicit written permission from Kubek.

3. Disclaimer of Warranties
The Software is provided "as is" without warranty of any kind. Kubek disclaims all warranties, express or implied, including but not limited to the implied warranties of merchantability and fitness for a particular purpose.

4. Limitation of Liability
In no event shall Kubek be liable for any damages arising out of the use or inability to use the Software.

5. Termination
This Agreement is effective until terminated. You may terminate it at any time by destroying all copies of the Software. Kubek may terminate this Agreement if you fail to comply with its terms.

By checking the box below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.`,
    acceptLabel: "I have read and agree to the End User License Agreement",
  },
  preferencesStep: {
    colorTheme: {
      title: "Color Theme",
      description: "Choose a color scheme for the application",
    },
    language: {
      title: "Language",
      description: "Select your preferred language",
      placeholder: "Choose language",
    },
    appearance: {
      title: "Appearance",
      description: "Choose your preferred theme mode",
    },
  },
  serverCreationStep: {
    title: "Create Your First Server",
    description: "Let's set up your first Minecraft server. Click the button below to open the server creation wizard",
    button: "I want to create one now",
    optional: {
      title: "This step is optional",
      description: "You can skip it and create a server later at any time — the wizard will guide you through all the options you need.",
    },
  },
  completionStep: {
    title: "You're all set!",
    subtitle: "Setup is complete. Welcome to Kubek — enjoy!",
    cta: "Go to dashboard",
    features: {
      licenseAccepted: "License Accepted",
      themeConfigured: "Theme Configured",
      serverCreated: "Server Created",
      readyToManage: "Ready to Manage",
    },
  },
};