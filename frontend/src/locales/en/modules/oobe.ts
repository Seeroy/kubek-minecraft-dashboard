import type { TranslationDictionary } from "../../../locales/types";

export const oobeTranslations: TranslationDictionary = {
  steps: {
    eula: {
      rail: "License agreement",
      title: "End user license agreement",
      description: "Review and accept the EULA",
    },
    preferences: {
      rail: "Preferences",
      title: "Preferences",
      description: "Make it yours",
    },
    serverCreation: {
      rail: "First server",
      title: "Create your first server",
      description: "Set up your Minecraft server",
    },
    completion: {
      rail: "Done",
      title: "Welcome to Kubek!",
      description: "You are all set",
    },
  },
  rail: {
    done: "Done",
    current: "Now",
    upcoming: "Next",
    optional: "Optional",
    version: (version: string) => `Kubek ${version} · first run`,
    hint: "Everything can be changed later in Panel settings.",
  },
  navigation: {
    back: "Back",
    next: "Next",
    skip: "Skip",
    finish: "Finish",
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    enterHint: "to continue",
    toggleTheme: "Toggle theme",
    acceptHint: "Accept the agreement to continue",
  },
  eula: {
    title: "Kubek end user license agreement",
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
<p>On startup and every 30 minutes thereafter, the Software automatically sends anonymized technical data to the rights holder's server: a device identifier, CPU details (model, speed, core count), amount of RAM, operating system (name, kernel release, OS version and build, architecture), version numbers of installed Java runtimes, the Kubek version, whether it runs inside a Docker container, the Bun and Node.js versions, the number of servers, added users and roles, the status of integrations (Telegram bot, FTP server), which features are in use (the name of the selected AI provider without its key or address, the number of scheduler tasks per action type including webhooks, the number of backup policies and the types of remote storages, the number of enabled extensions and networks), the number of users per interface language and theme, and uptime. The device identifier is a hash of the machine ID and contains no user name or IP address. Server names, player names, logins, passwords, tokens and file contents are never sent. The IP address the request comes from is visible to the rights holder's server at the network level. This data is used solely to improve and optimize the Software. Telemetry can be disabled in the application settings or via the KUBEK_TELEMETRY=off environment variable.</p>

<h4>8. Changes to the Agreement</h4>
<p>The Kubek team may change the terms of this Agreement at any time. Continued use of the Software after changes take effect constitutes acceptance of those changes.</p>

<h4>9. Termination</h4>
<p>This Agreement is effective until terminated. You may terminate it at any time by destroying all copies of the Software. The Kubek team may terminate this Agreement if you fail to comply with its terms.</p>

<p>By checking the box below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.</p>`,
    read: (percent: number) => `${percent}% read`,
    readFull: "Read to the end",
    accept: "I have read and agree to the End User License Agreement",
    scrollHint: "Scroll the text to the end to accept",
  },
  preferences: {
    theme: {
      title: "Color theme",
      description: "Pick a color scheme for the app",
    },
    language: {
      title: "Language",
      description: "Pick your preferred language",
    },
    appearance: {
      title: "Appearance",
      description: "Pick your preferred theme mode",
    },
    skin: {
      title: "Minecraft nickname",
      description: "This player's head becomes your avatar, optional",
    },
  },
  server: {
    optional: {
      title: "This step is optional",
      description: "You can skip it and create a server at any time later, the wizard walks you through every setting.",
    },
    intro: {
      title: "Create your first server",
      description: "Let's set up your first Minecraft server. Press the button below to open the server wizard",
      button: "Create one now",
    },
    creating: (name: string) => `Creating "${name}"…`,
    created: "Created",
    createdHint: "The server shows up in the list once you enter the panel. Start it with the Start button in the sidebar.",
    failed: "Could not create the server",
    retry: "Try again",
    open: "Show progress",
  },
  completion: {
    title: "All set!",
    subtitle: "Setup is complete. Welcome to Kubek, enjoy!",
    cta: "Open the panel",
    opening: "Opening the panel…",
    items: {
      license: "License accepted",
      theme: "Theme configured",
      server: "Server created",
      ready: "Ready to manage",
    },
    meta: {
      license: "Kubek EULA",
      ready: "Panel configured",
    },
  },
};
