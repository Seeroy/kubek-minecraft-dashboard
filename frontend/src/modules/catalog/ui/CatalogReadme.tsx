"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { memo, type ComponentProps } from "react";
import ReactMarkdown, { type Components, defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { type CatalogKind, useCatalogReadme } from "../api/readme.queries";

// react-markdown hands its AST node to custom components, it must not reach the DOM
function dom<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i;

/** Relative links open on GitHub, relative images load from raw.githubusercontent.com */
export function resolveReadmeUrl(url: string, key: string, base: string | null): string {
  if (ABSOLUTE.test(url)) return defaultUrlTransform(url);
  if (!base) return "";
  const absolute = new URL(url, base).href;
  return key === "src" ? absolute.replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//, "https://raw.githubusercontent.com/$1/") : absolute;
}

// Language switcher lines make no sense here, the panel already picked the language
export function dropLanguageLinks(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !(/\]\(README(?:\.[a-z]{2})?\.md\)/i.test(line) && !line.replace(/\[[^\]]*\]\([^)]*\)|\*\*[^*]*\*\*|·|\|/g, "").trim()))
    .join("\n");
}

const components: Components = {
  a: (props) => <a {...dom(props)} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline" />,
  p: (props) => <p {...dom(props)} className="my-2.5 first:mt-0 last:mb-0" />,
  ul: (props) => <ul {...dom(props)} className="my-2.5 list-disc pl-5" />,
  ol: (props) => <ol {...dom(props)} className="my-2.5 list-decimal pl-5" />,
  li: (props) => <li {...dom(props)} className="my-1" />,
  h1: (props) => <h3 {...dom(props)} className="mt-4 mb-2 text-base font-semibold first:mt-0" />,
  h2: (props) => <h3 {...dom(props)} className="mt-4 mb-2 text-[15px] font-semibold first:mt-0" />,
  h3: (props) => <h4 {...dom(props)} className="mt-3 mb-1.5 text-sm font-semibold" />,
  h4: (props) => <h5 {...dom(props)} className="mt-3 mb-1 text-[13px] font-semibold" />,
  blockquote: (props) => <blockquote {...dom(props)} className="my-2.5 border-l-2 border-border pl-3 text-muted-foreground" />,
  pre: (props) => (
    <pre {...dom(props)} className="my-2.5 scrollbar-thin overflow-x-auto rounded-lg border border-border bg-code p-3 font-mono text-xs leading-relaxed text-code-foreground" />
  ),
  code: ({ className, ...props }) => (
    <code
      {...dom(props)}
      className={className ?? "rounded bg-code px-1 py-px font-mono text-[0.92em] text-code-foreground in-[pre]:bg-transparent in-[pre]:p-0"}
    />
  ),
  img: (props: ComponentProps<"img"> & { node?: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...dom(props)} alt={props.alt ?? ""} loading="lazy" className="my-2 inline-block max-w-full rounded-md" />
  ),
  hr: (props) => <hr {...dom(props)} className="my-4 border-border" />,
  table: (props) => (
    <div className="my-2.5 scrollbar-thin overflow-x-auto">
      <table {...dom(props)} className="w-full border-collapse text-xs" />
    </div>
  ),
  th: (props) => <th {...dom(props)} className="border-b border-border px-2 py-1.5 text-left font-semibold" />,
  td: (props) => <td {...dom(props)} className="border-b border-border/60 px-2 py-1.5 align-top" />,
};

const ReadmeMarkdown = memo(function ReadmeMarkdown({ markdown, base }: { markdown: string; base: string | null }) {
  return (
    <div className="min-w-0 text-[13px] leading-relaxed [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url, key) => resolveReadmeUrl(url, key, base)}
        skipHtml
      >
        {dropLanguageLinks(markdown)}
      </ReactMarkdown>
    </div>
  );
});

export function CatalogReadme({ kind, id, active }: { kind: CatalogKind; id: string; active: boolean }) {
  const { t } = useTranslation("modules.catalog.readme");
  const readme = useCatalogReadme(kind, id, active);

  if (readme.isPending) {
    return (
      <div className="grid gap-2.5" aria-busy="true">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    );
  }
  if (readme.isError || !readme.data) {
    return (
      <div className="grid justify-items-start gap-2 text-[13px] text-muted-foreground">
        {t("failed")}
        <Button variant="outline" size="sm" onClick={() => void readme.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  return <ReadmeMarkdown markdown={readme.data.markdown} base={readme.data.base} />;
}
