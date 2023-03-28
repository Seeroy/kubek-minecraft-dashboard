const TelegramBot = require('node-telegram-bot-api');
var config = require('./config');
var translator = require('./translator');
var serverController = require("./servers");
var additional = require("./additional");
var fs = require('fs');
exports.bot = null;
exports.chatIdSave = [];
exports.rateLimits = {};
exports.botStarted = false;

exports.startBot = (token) => {
  this.bot = new TelegramBot(token, {
    polling: true
  });
  this.bot.on("polling_error", console.log);
  this.createBotHandlers();
  if (typeof cfg['tgbot-chatid'] !== "undefined" && cfg['tgbot-chatid'] != null) {
    this.chatIdSave = cfg['tgbot-chatid'];
  } else {
    cfg['tgbot-chatid'] = [];
  }
  return true;
};

exports.stopBot = () => {
  if (this.botStarted == true) {
    this.botStarted = false;
    this.bot.stopPolling();
    this.bot.clearTextListeners();
    this.bot.close();
    this.bot = null;
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
    chatType = msg.chat.type;

    additional.showTGBotMessage(msgText, username, userId, chatType, chatId);

    if (this.bot != null && this.botStarted == true) {
      if (typeof (exports.rateLimits[chatId]) == "undefined" || (Date.now() - exports.rateLimits[chatId]) >= 2000) {
        if (cfg['tgbot-chatid'].includes(userId) || msgText.split(" ")[0] == "/start") {
          if (msgText.split(" ")[0] == "/start") {
            if (msgText.split(" ")[1] == otp_tg) {
              if (!cfg['tgbot-chatid'].includes(userId)) {
                cfg['tgbot-chatid'].push(userId);
                config.writeConfig(cfg);
              }
              this.chatIdSave = cfg['tgbot-chatid'];
              this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-savedchatid}}", cfg['lang']), {
                reply_markup: JSON.stringify({
                  resize_keyboard: true,
                  one_time_keyboard: false,
                  keyboard: [
                    [{
                      text: translator.translateHTML("{{tgbot-serverstatuses}}", cfg['lang'])
                    }, {
                      text: translator.translateHTML("{{tgbot-commands}}", cfg['lang'])
                    }],
                  ],
                })
              });
            } else {
              this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-wrongotp}}", cfg['lang']), {
                parse_mode: "html"
              });
            }
          } else if (msgText == translator.translateHTML("{{tgbot-serverstatuses}}", cfg['lang']) || msgText.split(" ")[0] == "/statuses") {
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
              addtext = "";
              if (typeof last_servers_query[key] == "object") {
                addtext = translator.translateHTML("\n{{players}}: " + last_servers_query[key].players.online + "/" + last_servers_query[key].players.max + "\n{{version}}: " + last_servers_query[key].version.name, cfg['lang'])
              }
              msg = msg + translator.translateHTML("<b>" + key + "</b>\n{{status}}: " + icon + " " + "{{status-" + value['status'] + "}}" + addtext + "\n\n", cfg['lang']);
            }
            this.bot.sendMessage(chatId, msg, {
              parse_mode: "html"
            });
          } else if (msgText == translator.translateHTML("{{tgbot-commands}}", cfg['lang']) || msgText.split(" ")[0] == "/help") {
            this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-helpmsg}}", cfg['lang']) + kubek_version + "</code>", {
              parse_mode: "html"
            });
          } else if (msgText.split(" ")[0] == "/startServer") {
            sname = msgText.split(" ")[1];
            statuses = serverController.getStatuses();
            if (typeof statuses[sname] !== "undefined") {
              if (statuses[sname].status == "stopped") {
                serverController.startServer(sname);
                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-starting}}" + "<b>" + sname + "</b>", cfg['lang']), {
                  parse_mode: "html"
                });
              } else {
                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", cfg['lang']), {
                  parse_mode: "html"
                });
              }
            } else {
              this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", cfg['lang']), {
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

                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-stopping}}" + "<b>" + sname + "</b>", cfg['lang']), {
                  parse_mode: "html"
                });
              } else {
                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", cfg['lang']), {
                  parse_mode: "html"
                });
              }
            } else {
              this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", cfg['lang']), {
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

                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-restarting}}" + "<b>" + sname + "</b>", cfg['lang']), {
                  parse_mode: "html"
                });
              } else {
                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", cfg['lang']), {
                  parse_mode: "html"
                });
              }
            } else {
              this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", cfg['lang']), {
                parse_mode: "html"
              });
            }
          } else if (msgText.split(" ")[0] == "/serverLog") {
            sname = msgText.split(" ")[1];
            statuses = serverController.getStatuses();
            if (typeof statuses[sname] !== "undefined") {
              if (statuses[sname].status != "stopped") {
                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-sendinglog}}", cfg['lang']), {
                  parse_mode: "html"
                });
                log = servers_logs[sname];
                if (fs.existsSync("./servers/" + sname + "/logs/latest.log")) {
                  this.bot.sendDocument(chatId, "./servers/" + sname + "/logs/latest.log", {
                    parse_mode: "html"
                  });
                } else {
                  this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-nologs}}", cfg['lang']), {
                    parse_mode: "html"
                  });
                }
              } else {
                this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-cantdo}}", cfg['lang']), {
                  parse_mode: "html"
                });
              }
            } else {
              this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-usage}}", cfg['lang']), {
                parse_mode: "html"
              });
            }
          }
        } else {
          this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-plsstart}}", cfg['lang']), {
            parse_mode: "html"
          });
        }
        exports.rateLimits[chatId] = Date.now();
      } else {
        this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-wait2sec}}", cfg['lang']), {
          parse_mode: "html"
        });
      }
    }
  });
  this.botStarted = true;
  return true;
};

exports.changedServerStatus = (server, status) => {
  if (this.bot != null && this.chatIdSave != null && this.chatIdSave.length > 0 && this.botStarted == true) {
    icon = "";
    if (status == "stopped") {
      icon = "🔴";
    } else if (status == "stopping" || status == "starting") {
      icon = "🟡";
    } else if (status == "started") {
      icon = "🟢";
    }
    statusText = translator.translateHTML("{{status-" + status + "}}", cfg['lang']);
    this.chatIdSave.forEach(chatId => {
      this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-changedstatus-1}}<b>" + server + "</b>{{tgbot-changedstatus-2}}" + icon + " " + statusText, cfg['lang']), {
        parse_mode: "html"
      });
    });
  }
};

exports.runningSchedNotification = (server, isSuccess) => {
  if (this.bot != null && this.chatIdSave != null && this.chatIdSave.length > 0 && this.botStarted == true) {
    if (isSuccess == true) {
      this.chatIdSave.forEach(chatId => {
        this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-running-sched-succ}}<b>" + server + "</b>", cfg['lang']), {
          parse_mode: "html"
        });
      });
    } else {
      this.chatIdSave.forEach(chatId => {
        this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-running-sched-failed}}<b>" + server + "</b>", cfg['lang']), {
          parse_mode: "html"
        });
      });
    }
  }
};

exports.sendNewAuth = (isSuccess, login, ip) => {
  if (this.bot != null && this.chatIdSave != null && this.chatIdSave.length > 0 && this.botStarted == true) {
    if (isSuccess == true) {
      this.chatIdSave.forEach(chatId => {
        this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-newlogin-success}}<b>" + login + "</b> (IP: " + ip + ")", cfg['lang']), {
          parse_mode: "html"
        });
      });
    } else {
      this.chatIdSave.forEach(chatId => {
        this.bot.sendMessage(chatId, translator.translateHTML("{{tgbot-newlogin-failed-1}}<b>" + login + "</b> (IP: " + ip + ")" + "\n{{tgbot-newlogin-failed-2}}", cfg['lang']), {
          parse_mode: "html"
        });
      });
    }
  }
};

exports.regenerateOTP = () => {
  if (this.bot != null && this.botStarted == true) {
    otp_tg = Math.floor(Math.random() * (999999 - 100000) + 100000);
    fsock = io.sockets.sockets;
    for (const socket of fsock) {
      socket[1].emit("handleUpdate", {
        type: "newOTP",
        data: otp_tg
      });
    }
  }
};