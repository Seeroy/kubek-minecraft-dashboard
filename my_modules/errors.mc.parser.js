const JAVA_INCOMP_ERRORS = [
  /A problem occurred running the Server launcher\.ERROR: java\.lang\.reflect\.InvocationTargetException/gim,
  /Exception in thread \"main\" java\.lang\.UnsupportedClassVersionError/gim,
  /Main has been compiled by a more recent version of the Java Runtime/gim,
  /Unsupported Java detected/gim,
];
const JAVA_PATH_ERRORS = [/The system cannot find the path specified/gim];
const FILE_NOT_FOUND_ERRORS = [/Error: Unable to access jarfile/gim];

const JAVA_INCOMP_PLACEHOLDER = "{{java-incomp-error}}";
const JAVA_PATH_PLACEHOLDER = "{{java-path-error}}";
const FILE_NOT_FOUND_PLACEHOLDER = "{{jarfile-access-error}}";

exports.checkStringForErrors = (str) => {
  errors = false;
  skipmatch = false;
  JAVA_INCOMP_ERRORS.forEach(function (err) {
    if (!skipmatch) {
      if (str.match(err) != null) {
        errors = JAVA_INCOMP_PLACEHOLDER;
        skipmatch = true;
      }
    }
  });

  JAVA_PATH_ERRORS.forEach(function (err) {
    if (!skipmatch) {
      if (str.match(err) != null) {
        errors = JAVA_PATH_PLACEHOLDER;
        skipmatch = true;
      }
    }
  });

  FILE_NOT_FOUND_ERRORS.forEach(function (err) {
    if (!skipmatch) {
      if (str.match(err) != null) {
        errors = FILE_NOT_FOUND_PLACEHOLDER;
        skipmatch = true;
      }
    }
  });

  return errors;
};
