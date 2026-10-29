import { Document, isMap, isScalar, parseDocument } from "yaml";

export type YamlScalar = string | boolean | number;

// Bukkit and Paper write single quoted strings
function literal(value: YamlScalar): string {
  if (typeof value !== "string") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Sets scalars by path. An existing value is swapped in the source text so the
 * rest of the file stays byte for byte, a missing one goes through the yaml
 * serializer
 */
export function setYamlValues(
  text: string | null,
  values: [path: string[], value: YamlScalar][],
): string {
  let source = text ?? "";
  for (const [path, value] of values) {
    source = setOne(source, path, value);
  }
  return source;
}

function setOne(source: string, path: string[], value: YamlScalar): string {
  const doc = parseDocument(source);
  if (doc.errors.length) throw new Error(doc.errors[0].message);

  const node = doc.getIn(path, true);
  if (isScalar(node) && node.range) {
    if (node.value === value) return source;
    const [start, end] = node.range;
    return source.slice(0, start) + literal(value) + source.slice(end);
  }

  if (doc.contents !== null && !isMap(doc.contents)) {
    throw new Error("Expected a YAML mapping");
  }
  const target = doc.contents === null ? new Document({}) : doc;
  target.setIn(path, value);
  return target.toString({ indentSeq: false, lineWidth: 0 });
}

/** Scalar at a path, undefined when it is missing or the text is broken */
export function readYamlValue(text: string | null, path: string[]): unknown {
  if (!text) return undefined;
  const doc = parseDocument(text);
  if (doc.errors.length) return undefined;
  const node = doc.getIn(path, true);
  return isScalar(node) ? node.value : undefined;
}
