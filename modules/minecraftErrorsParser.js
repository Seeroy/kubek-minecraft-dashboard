const JAVA_INCOMP_ERRORS = [
    /A problem occurred running the Server launcher\.ERROR: java\.lang\.reflect\.InvocationTargetException/gim,
    /Exception in thread \"main\" java\.lang\.UnsupportedClassVersionError/gim,
    /Main has been compiled by a more recent version of the Java Runtime/gim,
    /Unsupported Java detected/gim,
    /requires running the server with Java/gim
];
const JAVA_PATH_ERRORS = [/The system cannot find the path specified/gim];
const FILE_NOT_FOUND_ERRORS = [/Error: Unable to access jarfile/gim];

const JAVA_INCOMP_PLACEHOLDER = "{{serverErrors.incompatibleJava}}";
const JAVA_PATH_PLACEHOLDER = "{{serverErrors.cantFindPath}}";
const FILE_NOT_FOUND_PLACEHOLDER = "{{serverErrors.jarfileAccess}}";

// Проверить строку на ошибки
exports.checkStringForErrors = (str) => {
    let returnResult = false;
    JAVA_INCOMP_ERRORS.forEach(function (err) {
        if (str.match(err) != null) {
            returnResult = JAVA_INCOMP_PLACEHOLDER;
        }
    });

    JAVA_PATH_ERRORS.forEach(function (err) {
        if (str.match(err) != null) {
            returnResult = JAVA_PATH_PLACEHOLDER;
        }
    });

    FILE_NOT_FOUND_ERRORS.forEach(function (err) {
        if (str.match(err) != null) {
            returnResult = FILE_NOT_FOUND_PLACEHOLDER;
        }
    });

    return returnResult;
};