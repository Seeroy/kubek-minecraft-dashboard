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
    content: `<p>This End User License Agreement ("Agreement") is a legal agreement between you and the Kubek development team for the use of Kubek software ("Software").</p>

<h4>1. License Grant</h4>
<p>Kubek grants you a non-exclusive, non-transferable, royalty-free license to use the Software for personal and commercial purposes, subject to the terms and conditions of this Agreement.</p>

<h4>2. Extensions and Modifications</h4>
<p>You may install extensions and adapt the Software to your own needs. You may not pass off the Software or any of its parts as your own work, nor remove authorship notices.</p>

<h4>3. Relation to Mojang</h4>
<p>The Software is an independent product and is in no way associated with Mojang AB, Microsoft, or Minecraft. All trademarks mentioned belong to their respective owners.</p>

<h4>4. Disclaimer of Warranties</h4>
<p>The Software is provided "as is" without warranty of any kind. The Kubek team disclaims all warranties, express or implied, including the implied warranties of merchantability and fitness for a particular purpose.</p>

<h4>5. Limitation of Liability</h4>
<p>In no event shall the Kubek team be liable for any damages arising out of the use or inability to use the Software.</p>

<h4>6. User Responsibility</h4>
<p>You are solely responsible for the safety of your servers, files, and confidential data, as well as for all actions performed using the Software.</p>

<h4>7. Data Collection</h4>
<p>On startup and periodically thereafter, the Software automatically sends anonymized technical data to the rights holder's server: a device identifier, CPU details (model, speed, core count), amount of RAM, operating system (name, version, build, architecture), paths to installed Java versions, the Kubek version, the number of servers and added users, the status of integrations (Telegram bot, FTP server), and uptime. This data is used solely to improve and optimize the Software. Telemetry can be disabled in the application settings or via the KUBEK_TELEMETRY=off environment variable.</p>

<h4>8. Changes to the Agreement</h4>
<p>The Kubek team may change the terms of this Agreement at any time. Continued use of the Software after changes take effect constitutes acceptance of those changes.</p>

<h4>9. Termination</h4>
<p>This Agreement is effective until terminated. You may terminate it at any time by destroying all copies of the Software. The Kubek team may terminate this Agreement if you fail to comply with its terms.</p>

<p>By checking the box below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.</p>`,
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