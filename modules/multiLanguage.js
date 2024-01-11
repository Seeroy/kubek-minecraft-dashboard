// Формат перевода в тексте: {{категория.ключ}}

const fs = require('fs');
const path = require('path');
// Список кодов для доступных языков
global.avaliableLanguages = {};

// Загрузить список доступных языков
exports.loadAvailableLanguages = () => {
    if (fs.existsSync(path.join(__dirname, "./../languages"))) {
        fs.readdirSync(path.join(__dirname, "./../languages")).forEach(file => {
            if (path.extname(file) === ".json") {
                let langFile = JSON.parse(fs.readFileSync(path.join(__dirname, "./../languages", file)).toString());
                if (typeof langFile.info.code !== "undefined" && typeof langFile.info.id !== "undefined" && typeof langFile.info.displayNameEnglish !== "undefined") {
                    avaliableLanguages[langFile.info.code] = langFile.info;
                }
            }
        })
        return true;
    }
    return false;
};

// Получить информацию о языке по названию
exports.getLanguageInfo = (language) => {
    if (Object.keys(avaliableLanguages).includes(language)) {
        return avaliableLanguages[language];
    }
    return false;
};

// Перевести все вхождения меток переводов в текст
exports.translateText = (language, text, ...placers) => {
    text = text.toString();
    if (Object.keys(avaliableLanguages).includes(language)) {
        let translationFile = JSON.parse(fs.readFileSync(path.join(__dirname, "./../languages", language + ".json")).toString());
        // Ищем плейсхолдеры перевода по regex
        let searchMatches = text.toString().match(/\{{[0-9a-zA-Z\-_.]+\}}/gm);
        if (searchMatches != null) {
            searchMatches.forEach(match => {
                // Чистим match-и от скобок и делим на категорию и ключ
                let matchClear = match.replaceAll("{", "").replaceAll("}", "");
                if (matchClear.split(".").length >= 2) {
                    let category = matchClear.split(".")[0];
                    let key = matchClear.split(".")[1];
                    let modificator = matchClear.split(".")[2];
                    // Заменяем в тексте найденные в списке переводы
                    if (typeof translationFile.translations[category][key] !== "undefined") {
                        let matchedTranslation = translationFile.translations[category][key];
                        if(modificator === "upperCase"){
                            matchedTranslation = matchedTranslation.toUpperCase();
                        } else if(modificator === "lowerCase"){
                            matchedTranslation = matchedTranslation.toLowerCase();
                        }
                        text = text.replaceAll(match, matchedTranslation);
                    }
                }
            });
            // Заменяем плейсхолдеры текста (%0%, %1%...) на предоставленные объекты
            placers.forEach(function (replacement, i) {
                text = text.replaceAll("%" + i + "%", replacement);
            });
        }
        return text;
    }
    return false;
};

// Получить EULA для опр. языка
exports.getEULA = (language) => {
    if(this.getLanguageInfo(language) !== false){
        let translationFile = JSON.parse(fs.readFileSync("./languages/" + language + ".json").toString());
        return translationFile.eula;
    }
    return false;
};