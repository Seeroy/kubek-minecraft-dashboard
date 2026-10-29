export const REDACTED = "[redacted]";

const SECRET_KEY =
  "[\\w.-]*(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)[\\w.-]*";

// key=value and key: value lines of properties, yaml, toml and env files
const ASSIGNMENT = new RegExp(
  `^([ \\t]*["']?${SECRET_KEY}["']?[ \\t]*[=:][ \\t]*)(?=\\S)(.+)$`,
  "gim",
);
// "key": "value" pairs inside JSON
const JSON_PAIR = new RegExp(
  `("${SECRET_KEY}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)+"`,
  "gi",
);
// secret=value fragments in the middle of a line, like URLs and commands
const INLINE = /\b((?:secret|token|password|api[_-]?key)=)[^\s&"']+/gi;
const BEARER = /\b(Bearer\s+)[\w.~+/-]{8,}=*/gi;
const PEM =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;

// Files that hold nothing but a secret
const SECRET_FILES = [/(^|[\\/])forwarding\.secret$/i, /\.(pem|key)$/i];

export function isSecretFile(path: string): boolean {
  return SECRET_FILES.some((re) => re.test(path.trim()));
}

/** Strips secrets from tool output before it reaches the model */
export function redactSecrets(text: string): string {
  return text
    .replace(PEM, REDACTED)
    .replace(JSON_PAIR, `$1"${REDACTED}"`)
    .replace(ASSIGNMENT, (_, head: string, value: string) =>
      value.trim().startsWith('"') && value.trim().endsWith('",')
        ? `${head}"${REDACTED}",`
        : `${head}${REDACTED}`,
    )
    .replace(INLINE, `$1${REDACTED}`)
    .replace(BEARER, `$1${REDACTED}`);
}

/** Keeps the head of long output and says how much was cut */
export function truncateOutput(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.length - limit;
  return `${text.slice(0, limit)}\n[truncated ${cut} more characters]`;
}
