class KubekUtils {
    // Конвертировать размер файлов в человеко-читаемый формат
    static humanizeFileSize(size) {
        if (size < 1024) {
            size = size + " B";
        } else if (size < 1024 * 1024) {
            size = Math.round((size / 1024) * 10) / 10 + " Kb";
        } else if (size >= 1024 * 1024 && size < 1024 * 1024 * 1024) {
            size = Math.round((size / 1024 / 1024) * 10) / 10 + " Mb";
        } else if (size >= 1024 * 1024 * 1024) {
            size = Math.round((size / 1024 / 1024 / 1024) * 10) / 10 + " Gb";
        } else {
            size = size + " ?";
        }
        return size;
    }

    // Конвертировать секунды в человеко-читаемый формат
    static humanizeSeconds(seconds) {
        let hours = Math.floor(seconds / (60 * 60));
        let minutes = Math.floor((seconds % (60 * 60)) / 60);
        seconds = Math.floor(seconds % 60);

        return this.padZero(hours) + "{{commons.h}} " + this.padZero(minutes) + "{{commons.m}} " + this.padZero(seconds) + "{{commons.s}}";
    }

    // Дополнить число нулём (для дат)
    static padZero(number) {
        return (number < 10 ? "0" : "") + number;
    }

    static pickGradientFadeColor(fraction, color1, color2, color3){
        let fade = fraction;

        fade = fade * 2;
        if (fade >= 1) {
            fade -= 1;
            color1 = color2;
            color2 = color3;
        }

        let diffRed = color2.red - color1.red;
        let diffGreen = color2.green - color1.green;
        let diffBlue = color2.blue - color1.blue;

        let gradient = {
            red: parseInt(Math.floor(color1.red + (diffRed * fade)), 10),
            green: parseInt(Math.floor(color1.green + (diffGreen * fade)), 10),
            blue: parseInt(Math.floor(color1.blue + (diffBlue * fade)), 10),
        };
        return 'rgb(' + gradient.red + ',' + gradient.green + ',' + gradient.blue + ')';
    }

    static getProgressGradientColor(progress){
        let color1 = {
            red: 46, green: 204, blue: 113
        };
        let color2 = {
            red: 241, green: 196, blue: 15
        };
        let color3 = {
            red: 231, green: 76, blue: 60
        };
        return this.pickGradientFadeColor(progress / 100, color1, color2, color3);
    }

    // Генерация UUID v4
    static uuidv4() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    // Получить имя файла из пути
    static pathFilename(path){
        let rgx = /\\|\//gm;
        let spl = path.split(rgx);
        return spl[spl.length - 1];
    }

    // Получить расширение файла
    static pathExt(path){
        let spl = path.split(".");
        return spl[spl.length - 1];
    }

    // Сделать ссылки в тексте кликабельными
    static linkify(inputText) {
        let replacedText, replacePattern1, replacePattern2, replacePattern3;

        //URLs starting with http://, https://, or ftp://
        replacePattern1 =
            /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        replacedText = inputText.replace(
            replacePattern1,
            '<a href="$1" target="_blank">$1</a>'
        );

        //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
        replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        replacedText = replacedText.replace(
            replacePattern2,
            '$1<a href="http://$2" target="_blank">$2</a>'
        );

        //Change email addresses to mailto:: links.
        replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
        replacedText = replacedText.replace(
            replacePattern3,
            '<a href="mailto:$1">$1</a>'
        );

        return replacedText;
    }
}