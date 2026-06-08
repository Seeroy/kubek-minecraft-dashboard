"use client";

import { cn } from "@/shared/lib/cn";
import Anser from "anser";
import { escapeCarriageReturn } from "escape-carriage";
import React from "react";

// Minecraft color/deco to Tailwind classes map
const MC_MAP: Record<string, string> = {
  "0": "text-black",
  "1": "text-sky-900",
  "2": "text-emerald-800",
  "3": "text-cyan-700",
  "4": "text-rose-800",
  "5": "text-violet-700",
  "6": "text-yellow-600",
  "7": "text-neutral-300",
  "8": "text-neutral-500",
  "9": "text-sky-500",
  a: "text-green-400",
  b: "text-cyan-400",
  c: "text-rose-500",
  d: "text-pink-400",
  e: "text-yellow-400",
  f: "text-white",
  l: "font-bold",
  m: "line-through",
  n: "underline",
  o: "italic",
  r: "__mc-reset", // reset all classes marker
};

type AnserJsonEntry = {
  content: string;
  fg?: string;
  bg?: string;
  decoration?: string;
};

function fixBackspace(txt: string): string {
  let tmp = txt;
  do {
    txt = tmp;
    tmp = tmp.replace(/[^\n]\x08/gm, "");
  } while (tmp.length < txt.length);
  return txt;
}

function ansiToJSON(input: string, useClasses = false): AnserJsonEntry[] {
  input = escapeCarriageReturn(fixBackspace(input));
  return Anser.ansiToJson(input, {
    json: true,
    remove_empty: true,
    use_classes: useClasses,
  }) as AnserJsonEntry[];
}

function createClass(bundle: AnserJsonEntry): string | null {
  let classNames = "";
  if (bundle.bg) {
    const bgSafe = `rgb-${bundle.bg.replace(/\s+/g, "").replace(/,/g, "-")}`;
    classNames += `${bgSafe}-bg `;
  }
  if (bundle.fg) {
    const fgSafe = `rgb-${bundle.fg.replace(/\s+/g, "").replace(/,/g, "-")}`;
    classNames += `${fgSafe}-fg `;
  }
  if (bundle.decoration) {
    classNames += `ansi-${bundle.decoration} `;
  }
  if (classNames === "") return null;
  classNames = classNames.substring(0, classNames.length - 1);
  return classNames;
}

function createStyle(bundle: AnserJsonEntry): React.CSSProperties | undefined {
  const style: React.CSSProperties = {};
  if (bundle.bg) {
    style.backgroundColor = `rgb(${bundle.bg})`;
  }
  if (bundle.fg) {
    style.color = `rgb(${bundle.fg})`;
  }
  return Object.keys(style).length ? style : undefined;
}

function convertBundleIntoReact(
  linkify: boolean,
  useClasses: boolean,
  bundle: AnserJsonEntry,
  key: number,
  mcClasses?: string | null
): React.ReactNode {
  const style = useClasses ? undefined : createStyle(bundle);
  const className = useClasses ? createClass(bundle) : undefined;

  // merge the anser class and the mc class
  const combinedClassName = cn(
    typeof className === "string" ? className : undefined,
    mcClasses || undefined
  );

  if (!linkify) {
    return (
      <span style={style} key={key} className={combinedClassName || undefined}>
        {bundle.content}
      </span>
    );
  }

  const content: Array<React.ReactNode> = [];
  const linkRegex =
    /(\s|^)(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/g;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(bundle.content)) !== null) {
    const [, pre, url] = match;
    const startIndex = match.index + pre.length;
    if (startIndex > index) {
      content.push(bundle.content.substring(index, startIndex));
    }
    const href = url.startsWith("www.") ? `http://${url}` : url;
    content.push(
      <a key={index} href={href} target="_blank" rel="noreferrer">
        {url}
      </a>
    );
    index = linkRegex.lastIndex;
  }
  if (index < bundle.content.length) {
    content.push(bundle.content.substring(index));
  }

  return (
    <span style={style} key={key} className={combinedClassName || undefined}>
      {content}
    </span>
  );
}

type MC_Segment = { text: string; mcClasses: string | null };

function parseMinecraftToSegments(input: string): MC_Segment[] {
  if (!input.includes("§")) return [{ text: input, mcClasses: null }];

  const parts = input.split(/(§[0-9a-frlomn])/gi); // keep the separators
  let currentClasses: string[] = [];
  const out: MC_Segment[] = [];

  for (const part of parts) {
    if (!part) continue;
    const m = part.match(/^§([0-9a-frlomn])$/i);
    if (m) {
      const code = m[1].toLowerCase();
      if (code === "r") {
        currentClasses = [];
      } else {
        const cls = MC_MAP[code];
        if (cls) {
          if (cls === "__mc-reset") {
            currentClasses = [];
          } else {
            currentClasses.push(cls);
          }
        }
      }
    } else {
      out.push({
        text: part,
        mcClasses: currentClasses.length ? currentClasses.join(" ") : null,
      });
    }
  }

  return out;
}

// Main React component
export interface AnsiTextProps {
  children?: string;
  className?: string;
  useClasses?: boolean; // like the original: true -> add classes instead of inline styles
  linkify?: boolean;
  parseMinecraft?: boolean;
}

export const AnsiText: React.FC<AnsiTextProps> = ({
  children = "",
  className,
  useClasses = false,
  linkify = false,
  parseMinecraft = true,
}) => {
  const text = String(children);

  const mcSegments = parseMinecraft
    ? parseMinecraftToSegments(text)
    : [{ text, mcClasses: null }];

  // Run ansiToJSON per segment and collect the resulting React nodes
  const nodes: React.ReactNode[] = [];
  let globalKey = 0;

  for (const seg of mcSegments) {
    // anser expects a string and returns an array of bundles
    const bundles = ansiToJSON(seg.text, useClasses);

    // turn each bundle into React, adding mc classes when needed
    for (let i = 0; i < bundles.length; i++) {
      const b = bundles[i];
      nodes.push(
        convertBundleIntoReact(
          linkify,
          useClasses,
          b,
          globalKey++,
          seg.mcClasses
        )
      );
    }
  }

  return (
    <code
      className={cn(
        "not-prose font-mono text-sm break-words whitespace-pre-wrap",
        className
      )}
    >
      {nodes}
    </code>
  );
};

export default AnsiText;
