"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { forgetShapes, instant, sequence, type RevealSpec } from "skullet";
import { Skeleton as Skullet, SkulletProvider } from "skullet/react";

// Fast loads skip the skeleton entirely, same threshold as skullet's smart mode
const HOLD_MS = 150;
const ENTER_SCALE = "0.96";

const REVEAL: RevealSpec = {
  ...sequence,
  enter: { scale: ENTER_SCALE },
  hold: HOLD_MS,
  choose: (ctx) => (ctx.input || ctx.waited < HOLD_MS ? instant : {}),
};

export function DataRevealProvider({ children }: { children: ReactNode }) {
  // Saved shapes keep non-latin text and titles as is, so they never outlive the tab
  useEffect(() => {
    forgetShapes();
    const forget = () => forgetShapes();
    window.addEventListener("pagehide", forget);
    return () => window.removeEventListener("pagehide", forget);
  }, []);

  return <SkulletProvider reveal={REVEAL}>{children}</SkulletProvider>;
}

interface DataRevealProps<T> {
  data: T | null | undefined;
  /** Fake data of the same shape, rendered unseen and measured into the skeleton */
  sample: T;
  /** Forces the skeleton, e.g. isLoading from a query that falls back to [] */
  loading?: boolean;
  /** Remembers the shape across visits, keep it unique per screen */
  id?: string;
  label?: string;
  /** Shown instead of the skeleton, e.g. a LoadError when the query failed */
  error?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: (data: T) => ReactNode;
}

// The only place that knows about skullet, swap the inside if it goes away
export function DataReveal<T>({
  data,
  sample,
  loading,
  id,
  label,
  error,
  className,
  style,
  children,
}: DataRevealProps<T>) {
  return (
    <Skullet
      data={loading ? undefined : data}
      sample={sample}
      id={id}
      label={label}
      error={error || undefined}
      className={className}
      style={style}
    >
      {children}
    </Skullet>
  );
}

interface LoadRevealProps {
  loading: boolean;
  /** Hand-made skeleton for places skullet can't or shouldn't measure */
  skeleton: ReactNode;
  /** Which elements come in one by one, direct children by default */
  items?: string;
  className?: string;
  /** A function when the content reads data that only exists once loaded */
  children: ReactNode | (() => ReactNode);
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const FULL = { duration: 450, scale: ENTER_SCALE, maxDelay: 320 };
// Tab switches happen often, so the same motion plays shorter and flatter
const QUICK = { duration: 200, scale: "0.98", maxDelay: 80 };

// Top to bottom, rows lower on the page come in a beat later
function revealItems(els: HTMLElement[], { duration, scale, maxDelay } = FULL) {
  if (!els.length) return;
  const tops = els.map((el) => el.getBoundingClientRect().top);
  const first = Math.min(...tops);
  els.forEach((el, i) => {
    el.animate([{ opacity: 0, scale }, { opacity: 1, scale: "1" }], {
      duration,
      delay: Math.min((tops[i] - first) * 0.4, maxDelay),
      easing: EASE,
      fill: "backwards",
    });
  });
}

// Skip single-child wrappers, stagger what is below them
function revealTargets(root: HTMLElement) {
  let el = root;
  for (let depth = 0; depth < 4 && el.children.length === 1; depth++) el = el.children[0] as HTMLElement;
  return [...el.children] as HTMLElement[];
}

const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Same feel as DataReveal without skullet watching the DOM, for live charts and grids
export function LoadReveal({ loading, skeleton, items = ":scope > *", className, children }: LoadRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const wasLoading = useRef(loading);
  const [held, setHeld] = useState(false);

  if (!loading && held) setHeld(false);

  // The skeleton waits out fast loads, like the skullet hold
  useEffect(() => {
    if (!loading) return;
    startedAt.current = performance.now();
    const timer = setTimeout(() => setHeld(true), HOLD_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  useLayoutEffect(() => {
    const finished = wasLoading.current && !loading;
    wasLoading.current = loading;
    const root = ref.current;
    if (!finished || !root || prefersReducedMotion()) return;
    if (performance.now() - startedAt.current < HOLD_MS) return;

    revealItems([...root.querySelectorAll<HTMLElement>(items)]);
  }, [loading, items]);

  return (
    <div ref={ref} className={className} aria-busy={loading || undefined}>
      {loading ? held && skeleton : typeof children === "function" ? children() : children}
    </div>
  );
}

/** Quick reveal of the opened tab panel inside root, skips the first render */
export function useTabReveal(root: RefObject<HTMLElement | null>, active: string) {
  const last = useRef(active);

  useLayoutEffect(() => {
    if (last.current === active) return;
    last.current = active;
    if (prefersReducedMotion()) return;
    const panel = root.current?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])');
    if (panel) revealItems(revealTargets(panel), QUICK);
  }, [root, active]);
}

/** Short fade when the content behind the same view changes, e.g. another folder */
export function useSwapFade(target: RefObject<HTMLElement | null>, key: string | undefined) {
  const last = useRef(key);

  useLayoutEffect(() => {
    // Undefined while the next content is still loading
    if (key === undefined || key === last.current) return;
    const first = last.current === undefined;
    last.current = key;
    if (first || prefersReducedMotion()) return;
    target.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "ease-out" });
  }, [target, key]);
}
