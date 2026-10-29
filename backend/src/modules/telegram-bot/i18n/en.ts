export const en = {
  common: {
    linkFirst: "🔗 Please link your account first using /start",
    error: "❌ An error occurred. Please try again.",
    unknownCommand: "❓ Unknown command. Use /help to see available commands.",
  },
  start: {
    welcomeBack:
      "👋 Welcome back! Your Telegram is linked to your Kubek account.",
    welcomeNew:
      "🚀 <b>Welcome to the Kubek bot!</b> 🎮\n\n" +
      "🔗 To link your Telegram with your Kubek account, open the panel settings, copy the OTP code and send it here.",
  },
  help: {
    text:
      "🤖 <b>Commands</b>\n\n" +
      "🚀 /start - link or check your account\n" +
      "❓ /help - show this message\n" +
      "🖥️ /servers - list your servers\n" +
      "📊 /status &lt;id&gt; - server status &amp; controls\n" +
      "🌐 /language - change language\n" +
      "🔗 /unlink - unlink your Telegram account",
  },
  menu: {
    text: "🎮 <b>Kubek Bot</b>\n\nChoose an action below 👇",
  },
  commands: {
    start: "Link or check your account",
    help: "Show available commands",
    servers: "List your servers",
    language: "Change language",
    unlink: "Unlink your account",
    status: "Server status by id",
  },
  servers: {
    none: "📭 You have no accessible servers.",
    title: (p: { page: number; total: number }) =>
      `🎮 <b>Servers</b> · page ${p.page}/${p.total}`,
    fetchError: "❌ Failed to fetch servers. Please try again later.",
    invalidPage: "❌ Invalid page number.",
    columns: { name: "Server", status: "Status", version: "Version" },
  },
  status: {
    usage: "📝 Usage: /status &lt;server_id&gt;",
    notFound: "🔍 Server not found.",
    noPermissionView: "🚫 You do not have permission to view this server.",
    fetchError: "❌ Failed to fetch server status. Please try again later.",
    labels: {
      status: "Status",
      type: "Type",
      core: "Core",
      version: "Version",
    },
  },
  actions: {
    noPermissionManage: "🚫 You do not have permission to manage this server.",
    success: (p: { name: string; action: string }) =>
      `✅ "${p.name}": ${p.action} command sent! 🚀`,
    failed: (p: { action: string }) =>
      `❌ Failed to ${p.action} the server. Please try again later.`,
  },
  unlink: {
    notLinked: "🔗 Your account is not linked.",
    done: "🔌 Your Telegram account has been unlinked from Kubek.",
  },
  otp: {
    invalid: "❌ Invalid or expired OTP code.",
    tooMany: (p: { minutes: number }) =>
      `⛔ Too many wrong codes. Try again in ${p.minutes} min.`,
    accountLinkedElsewhere:
      "❌ This Kubek account is already linked to another Telegram account.",
    telegramLinkedElsewhere:
      "❌ This Telegram account is already linked to another Kubek account.",
    success: "✅ Your Telegram account has been linked to Kubek! 🎉",
    failed: "❌ Failed to link account. Please try again.",
  },
  language: {
    choose: "🌐 Choose your language:",
    changed: "✅ Language updated.",
  },
  buttons: {
    prev: "◀️ Prev",
    next: "Next ▶️",
    refresh: "🔄 Refresh",
    mainMenu: "🏠 Menu",
    serverList: "📋 Servers",
    start: "▶️ Start",
    stop: "⏹️ Stop",
    restart: "🔄 Restart",
    language: "🌐 Language",
    createServer: "➕ New server",
    cancel: "✖️ Cancel",
    confirm: "✅ Create",
    open: "Open",
    copyAddress: "📋 Address",
    copyId: "🆔 ID",
  },
  twofa: {
    request: (p: { username: string; ip: string; ua: string }) =>
      `🔐 <b>Login request</b>\n\n👤 ${p.username}\n🌐 IP: <code>${p.ip}</code>\n🖥️ UA: <code>${p.ua}</code>\n\nApprove or deny within 3 minutes.`,
    title: "🔐 Login request",
    hint: "Approve or deny within 3 minutes.",
    labels: { account: "Account", ip: "IP", browser: "Browser", time: "Time" },
    approve: "✅ Approve",
    deny: "❌ Deny",
    approved: "✅ Login approved",
    denied: "❌ Login denied",
    approvedShort: "✅ Approved",
    deniedShort: "❌ Denied",
    serviceUnavailable: "❌ Service unavailable",
    errors: {
      not_found: "❌ Request not found",
      expired: "⌛ Request expired",
      denied: "❌ Already denied",
      consumed: "✅ Already approved",
      approved: "✅ Already approved",
      forbidden: "🚫 No access",
      wrong_method: "❌ Wrong method",
      no_user: "❌ Account not found",
      generic: "❌ Error",
    },
  },
  wizard: {
    noPermission: "🚫 You do not have permission to create servers.",
    enterName: "🆕 <b>New server</b>\n\nSend a name for the new server:",
    nameEmpty: "❌ The name cannot be empty. Send another one:",
    nameTaken: "❌ A server with this name already exists. Send another one:",
    chooseBlueprint: "⚙️ Choose the server type:",
    loadingVersions: "⏳ Loading versions…",
    noVersions: "❌ No versions are available for this server type right now.",
    chooseVersion: "🏷️ Choose the version:",
    confirm: (p: { name: string; blueprint: string; version: string }) =>
      `🧾 <b>Confirm creation</b>\n\n📛 Name: <b>${p.name}</b>\n⚙️ Type: ${p.blueprint}\n🏷️ Version: ${p.version}`,
    creating: "🚀 Creation started!",
    cancelled: "✖️ Server creation cancelled.",
    created: (p: { name: string }) => `✅ Server "${p.name}" is ready! 🎉`,
    failed: (p: { error: string }) => `❌ Creation failed: ${p.error}`,
    progress: (p: { name: string; bar: string; progress: number }) =>
      `🚀 Creating "${p.name}"…\n<code>${p.bar} ${p.progress}%</code>`,
  },
  notify: {
    serverStatus: (p: { name: string; status: string }) =>
      `🖥️ <b>${p.name}</b>: ${p.status}`,
    serverError: (p: { name: string; error: string }) =>
      `🚨 <b>${p.name}</b>: error <code>${p.error}</code>`,
    login: (p: { username: string; ip: string }) =>
      `🔐 Signed in to <b>${p.username}</b> from <code>${p.ip}</code>`,
    backupOps: { create: "creation", upload: "upload", restore: "restore" },
    backupFailed: (p: {
      name: string;
      backup: string;
      op: string;
      error: string;
    }) =>
      `💾 <b>${p.name}</b>: backup ${p.op} failed for <b>${p.backup}</b>\n<code>${p.error}</code>`,
    storageUnreachable: (p: { name: string; error: string }) =>
      `☁️ Storage <b>${p.name}</b> is unreachable\n<code>${p.error}</code>`,
    locked: (p: { ip: string; minutes: number }) =>
      `⛔ Too many failed sign-in attempts from <code>${p.ip}</code>. Attempts are blocked for ${p.minutes} min`,
  },
  statusValues: {
    running: "🟢 Running",
    stopped: "🔴 Stopped",
    starting: "🟡 Starting",
    stopping: "🟠 Stopping",
    crashed: "💥 Crashed",
    error: "❌ Error",
    unknown: "⚪ Unknown",
  },
  taskNotify: {
    done: "completed",
    failed: "failed",
    cancelled: "cancelled",
    title: (p: { emoji: string; type: string; status: string }) =>
      `${p.emoji} Task "${p.type}" ${p.status}`,
    labels: {
      server: "🖥️ Server",
      plugin: "🧩 Plugin",
      duration: "⏱️ Duration",
      finishedAt: "🕒 Finished",
    },
    units: { ms: "ms", sec: "s", min: "m", hour: "h" },
  },
};
