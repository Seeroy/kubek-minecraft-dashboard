"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { CopyButton } from "@/shared/ui/CopyButton";
import { memo, type ComponentProps } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown hands its AST node to custom components, it must not reach the DOM
function dom<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

interface AstNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: { className?: unknown };
  children?: AstNode[];
}

const textOf = (node: AstNode | undefined): string =>
  node?.type === "text" ? (node.value ?? "") : (node?.children ?? []).map(textOf).join("");

function CodeBlock({ node, ...props }: ComponentProps<"pre"> & ExtraProps) {
  const { t } = useTranslation("modules.assistant.chat");
  const code = (node as AstNode | undefined)?.children?.find((child) => child.tagName === "code");
  const classes = code?.properties?.className;
  const language = Array.isArray(classes) ? classes.map(String).find((name) => name.startsWith("language-"))?.slice(9) : undefined;
  const text = textOf(code).replace(/\n$/, "");

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-code">
      <div className="flex h-7 items-center justify-between border-b border-border/60 pr-1 pl-3 font-mono text-[11px] text-muted-foreground">
        <span className="truncate">{language}</span>
        <CopyButton value={text} title={t("copy")} className="size-6" />
      </div>
      <pre {...props} className="scrollbar-thin overflow-x-auto p-3 font-mono text-xs leading-relaxed text-code-foreground" />
    </div>
  );
}

const components: Components = {
  a: (props) => <a {...dom(props)} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline" />,
  p: (props) => <p {...dom(props)} className="my-2 first:mt-0 last:mb-0" />,
  ul: (props) => <ul {...dom(props)} className="my-2 list-disc pl-5" />,
  ol: (props) => <ol {...dom(props)} className="my-2 list-decimal pl-5" />,
  li: (props) => <li {...dom(props)} className="my-0.5" />,
  h1: (props) => <h3 {...dom(props)} className="mt-3 mb-1.5 text-sm font-semibold" />,
  h2: (props) => <h3 {...dom(props)} className="mt-3 mb-1.5 text-sm font-semibold" />,
  h3: (props) => <h4 {...dom(props)} className="mt-3 mb-1 text-[13px] font-semibold" />,
  blockquote: (props) => <blockquote {...dom(props)} className="my-2 border-l-2 border-border pl-3 text-muted-foreground" />,
  pre: CodeBlock,
  // Inline code only, fenced blocks get their look from pre
  code: ({ className, ...props }) => (
    <code
      {...dom(props)}
      className={className ?? "rounded bg-code px-1 py-px font-mono text-[0.92em] text-code-foreground in-[pre]:bg-transparent in-[pre]:p-0"}
    />
  ),
  table: (props) => (
    <div className="my-2 scrollbar-thin overflow-x-auto">
      <table {...dom(props)} className="w-full border-collapse text-xs" />
    </div>
  ),
  th: (props) => <th {...dom(props)} className="border-b border-border px-2 py-1 text-left font-semibold" />,
  td: (props) => <td {...dom(props)} className="border-b border-border/60 px-2 py-1 align-top" />,
};

/** Assistant answer, raw HTML in the text is dropped */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    // anywhere, unlike break-word, also shrinks min width, so a long URL wraps instead of widening the chat
    <div className="min-w-0 text-[13px] leading-relaxed [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
});
