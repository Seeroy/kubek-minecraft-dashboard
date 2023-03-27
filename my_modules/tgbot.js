const TelegramBot = require('node-telegram-bot-api');
var config = require('./config');
var translator = require('./translator');
var serverController = require("./servers");
var additional = require("./additional");
var kubekConfig = config.readConfig();
var fs = require('fs');
exports.bot = null;
exports.chatIdSave = null;
exports.botStarted = false;

exports.startBot = (token) => {
  this.bot = new TelegramBot(token, {
    polling: true
  });
  this.bot.on("polling_error", console.log);
  this.createBotHandlers();
  if (typeof kubekConfig['tgbot-chatid'] !== "undefined" && kubekConfig['tgbot-chatid'] != null) {
    this.chatIdSave = kubekConfig['tgbot-chatid'];
  } else {
    kubekConfig['tgbot-chatid'] = [];
  }
  return true;
};

exports.stopBot = () => {
  if (typeof bot !== "undefined" && bot != null) {
    this.bot.stopPolling();
    this.bot.clearTextListeners();
    this.bot.close();
    this.bot = null;
    this.botStarted = false;
    return true;
  } else {
    return false;
  }
};

exports.createBotHandlers = () => {
  this.bot.on('message', (msg) => {
    chatId = msg.chat.id;
    username = msg.from.username;
    userId = msg.from.id;
    msgText = msg.text;

    additional.showTGBotMessage(msgText, username, chatId);

    if (this.bot != null) {
      if (msgText.split(" ")[0] == "/start") {
        const chatId = msg.chat.id;
        kubekConfig = config.readConfig();
        if (!kubekConfig['tgbot-chatid'].includes(chatId)) {
          kubekConfig['tgbot-chatid'].push(chatId);
          config.writeConfig(kubekConfig);
        }
        this.chatIdSave = kubekConfig['tgbot-chatid'];
        this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-savedchatid}}", kubekConfig['lang']), {
          reply_markup: JSON.stringify({
            resize_keyboard: true,
            one_time_keyboard: false,
            keyboard: [
              [{
                text: translator.translateHTML("{{tgbot-serverstatuses}}", kubekConfig['lang'])
              }, {
                text: translator.translateHTML("{{tgbot-commands}}", kubekConfig['lang'])
              }],
            ],
          })
        });
      } else if (msgText == translator.translateHTML("{{tgbot-serverstatuses}}", kubekConfig['lang']) || msgText.split(" ")[0] == "/statuses") {
        msg = "";
        statuses = serverController.getStatuses();
        for (const [key, value] of Object.entries(statuses)) {
          icon = "";
          if (value['status'] == "stopped") {
            icon = "🔴";
          } else if (value['status'] == "stopping" || value['status'] == "starting") {
            icon = "🟡";
          } else if (value['status'] == "started") {
            icon = "🟢";
          }
          msg = msg + "<b>" + key + "</b>\nStatus: " + icon + " " + translator.translateHTML("{{status-" + value['status'] + "}}", kubekConfig['lang']) + "\n\n";
        }
        this.bot.sendMessage(chatId, msg, {
          parse_mode: "html"
        });
      } else if (msgText == translator.translateHTML("{{tgbot-commands}}", kubekConfig['lang']) || msgText.split(" ")[0] == "/help") {
        this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-helpmsg}}", kubekConfig['lang']) + kubek_version + "</code>", {
          parse_mode: "html"
        });
      } else if (msgText.split(" ")[0] == "/startServer") {
        sname = msgText.split(" ")[1];
        statuses = serverController.getStatuses();
        if (typeof statuses[sname] !== "undefined") {
          if (statuses[sname].status == "stopped") {
            serverController.startServer(sname);
            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-starting}}" + "<b>" + sname + "</b>", kubekConfig['lang']), {
              parse_mode: "html"
            });
          } else {
            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", kubekConfig['lang']), {
              parse_mode: "html"
            });
          }
        } else {
          this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", kubekConfig['lang']), {
            parse_mode: "html"
          });
        }
      } else if (msgText.split(" ")[0] == "/stopServer") {
        sname = msgText.split(" ")[1];
        statuses = serverController.getStatuses();
        if (typeof statuses[sname] !== "undefined") {
          if (statuses[sname].status != "stopped") {

            command = Buffer.from("stop", 'utf-8').toString();
            servers_logs[sname] = servers_logs[sname] + command + "\n";
            servers_instances[sname].stdin.write(command + '\n');

            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-stopping}}" + "<b>" + sname + "</b>", kubekConfig['lang']), {
              parse_mode: "html"
            });
          } else {
            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", kubekConfig['lang']), {
              parse_mode: "html"
            });
          }
        } else {
          this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", kubekConfig['lang']), {
            parse_mode: "html"
          });
        }
      } else if (msgText.split(" ")[0] == "/restartServer") {
        sname = msgText.split(" ")[1];
        statuses = serverController.getStatuses();
        if (typeof statuses[sname] !== "undefined") {
          if (statuses[sname].status == "started") {

            restart_after_stop[sname] = true;
            command = Buffer.from("stop", 'utf-8').toString();
            servers_logs[sname] = servers_logs[sname] + command + "\n";
            servers_instances[sname].stdin.write(command + '\n');

            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-restarting}}" + "<b>" + sname + "</b>", kubekConfig['lang']), {
              parse_mode: "html"
            });
          } else {
            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", kubekConfig['lang']), {
              parse_mode: "html"
            });
          }
        } else {
          this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", kubekConfig['lang']), {
            parse_mode: "html"
          });
        }
      } else if (msgText.split(" ")[0] == "/serverLog") {
        sname = msgText.split(" ")[1];
        statuses = serverController.getStatuses();
        if (typeof statuses[sname] !== "undefined") {
          if (statuses[sname].status != "stopped") {
            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-sendinglog}}", kubekConfig['lang']), {
              parse_mode: "html"
            });
            log = servers_logs[sname];
            if (fs.existsSync("./servers/" + sname + "/logs/latest.log")) {
              this.bot.sendDocument(chatId, "./servers/" + sname + "/logs/latest.log", {
                parse_mode: "html"
              });
            } else {
              this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-nologs}}", kubekConfig['lang']), {
                parse_mode: "html"
              });
            }
          } else {
            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", kubekConfig['lang']), {
              parse_mode: "html"
            });
          }
        } else {
          this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", kubekConfig['lang']), {
            parse_mode: "html"
          });
        }
      }
    }
  });
  this.botStarted = true;
  return true;
};

exports.changedServerStatus = (server, status) => {
  icon = "";
  if (status == "stopped") {
    icon = "🔴";
  } else if (status == "stopping" || status == "starting") {
    icon = "🟡";
  } else if (status == "started") {
    icon = "🟢";
  }
  statusText = translator.translateHTML("{{status-" + status + "}}", kubekConfig['lang']);
  this.chatIdSave.forEach(chatId => {
    this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-changedstatus-1}}<b>" + server + "</b>{{tgbot-changedstatus-2}}" + icon + " " + statusText, kubekConfig['lang']), {
      parse_mode: "html"
    });
  });
};

exports.sendNewAuth = (isSuccess, login, ip) => {
  if (isSuccess == true) {
    this.chatIdSave.forEach(chatId => {
      this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-newlogin-success}}<b>" + login + "</b> (IP: " + ip + ")", kubekConfig['lang']), {
        parse_mode: "html"
      });
    });
  } else {
    this.chatIdSave.forEach(chatId => {
      this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-newlogin-failed-1}}<b>" + login + "</b> (IP: " + ip + ")" + "\n{{tgbot-newlogin-failed-2}}", kubekConfig['lang']), {
        parse_mode: "html"
      });
    });
  }
};