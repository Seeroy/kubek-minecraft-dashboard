"use client";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown hands its AST node to custom components, it must not reach the DOM
function dom<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node, ...rest } = props;
  void node;
  return rest;
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
  pre: (props) => (
    <pre {...dom(props)} className="my-2 scrollbar-thin overflow-x-auto rounded-lg bg-code p-3 font-mono text-xs leading-relaxed text-code-foreground" />
  ),
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
    <div className="text-[13px] leading-relaxed break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
});
