// Taken from: https://github.com/travis-ci/travis-web/blob/76af32013bc3ab1e5f540d69da3a97c3fec1e7e9/assets/scripts/vendor/ansiparse.js
var ANSIParse = function (str) {
    //
    // I'm terrible at writing parsers.
    //
    var matchingControl = null,
        matchingData = null,
        matchingText = '',
        ansiState = [],
        result = [],
        state = {},
        eraseChar;

    //
    // General workflow for this thing is:
    // \033\[33mText
    // |     |  |
    // |     |  matchingText
    // |     matchingData
    // matchingControl
    //
    // In further steps we hope it's all going to be fine. It usually is.
    //

    //
    // Erases a char from the output
    //
    eraseChar = function () {
        var index, text;
        if (matchingText.length) {
            matchingText = matchingText.substr(0, matchingText.length - 1);
        } else if (result.length) {
            index = result.length - 1;
            text = result[index].text;
            if (text.length === 1) {
                //
                // A result bit was fully deleted, pop it out to simplify the final output
                //
                result.pop();
            } else {
                result[index].text = text.substr(0, text.length - 1);
            }
        }
    };

    for (var i = 0; i < str.length; i++) {
        if (matchingControl != null) {
            if (matchingControl == '\033' && str[i] == '\[') {
                //
                // We've matched full control code. Lets start matching formating data.
                //

                //
                // "emit" matched text with correct state
                //
                if (matchingText) {
                    state.text = matchingText;
                    result.push(state);
                    state = {};
                    matchingText = "";
                }

                matchingControl = null;
                matchingData = '';
            } else {
                //
                // We failed to match anything - most likely a bad control code. We
                // go back to matching regular strings.
                //
                matchingText += matchingControl + str[i];
                matchingControl = null;
            }
            continue;
        } else if (matchingData != null) {
            if (str[i] == ';') {
                //
                // `;` separates many formatting codes, for example: `\033[33;43m`
                // means that both `33` and `43` should be applied.
                //
                // TODO: this can be simplified by modifying state here.
                //
                ansiState.push(matchingData);
                matchingData = '';
            } else if (str[i] == 'm') {
                //
                // `m` finished whole formatting code. We can proceed to matching
                // formatted text.
                //
                ansiState.push(matchingData);
                matchingData = null;
                matchingText = '';

                //
                // Convert matched formatting data into user-friendly state object.
                //
                // TODO: DRY.
                //
                ansiState.forEach(function (ansiCode) {
                    if (ANSIParse.foregroundColors[ansiCode]) {
                        state.foreground = ANSIParse.foregroundColors[ansiCode];
                    } else if (ANSIParse.backgroundColors[ansiCode]) {
                        state.background = ANSIParse.backgroundColors[ansiCode];
                    } else if (ansiCode == 39) {
                        delete state.foreground;
                    } else if (ansiCode == 49) {
                        delete state.background;
                    } else if (ANSIParse.styles[ansiCode]) {
                        state[ANSIParse.styles[ansiCode]] = true;
                    } else if (ansiCode == 22) {
                        state.bold = false;
                    } else if (ansiCode == 23) {
                        state.italic = false;
                    } else if (ansiCode == 24) {
                        state.underline = false;
                    }
                });
                ansiState = [];
            } else {
                matchingData += str[i];
            }
            continue;
        }

        if (str[i] == '\033') {
            matchingControl = str[i];
        } else if (str[i] == '\u0008') {
            eraseChar();
        } else {
            matchingText += str[i];
        }
    }

    if (matchingText) {
        state.text = matchingText + (matchingControl ? matchingControl : '');
        result.push(state);
    }
    return result;
};

ANSIParse.foregroundColors = {
    '30': '#000000',
    '31': '#FF5555',
    '32': '#55FF55',
    '33': '#FFFF55',
    '34': '#5555FF',
    '35': '#FF55FF',
    '36': '#55FFFF',
    '37': '#FFFFFF',
    '90': '#AAAAAA'
};

ANSIParse.backgroundColors = {
    '40': '#000000',
    '41': '#FF5555',
    '42': '#55FF55',
    '43': '#FFFF55',
    '44': '#5555FF',
    '45': '#FF55FF',
    '46': '#55FFFF',
    '47': '#AAAAAA'
};

ANSIParse.styles = {
    '1': 'bold',
    '3': 'italic',
    '4': 'underline'
};