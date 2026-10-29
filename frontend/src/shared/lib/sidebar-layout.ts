export const SIDEBAR = { min: 200, max: 360, mini: 68, initial: 288, collapseBelow: 140 } as const;

export interface SidebarLayout {
  width: number;
  mini: boolean;
}

const STORAGE_KEY = "kubek:sidebar";
const MINI_CLASS = "sb-mini";

export const clampSidebarWidth = (width: number) =>
  Math.round(Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, width)));

export function readSidebarLayout(): SidebarLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && typeof saved.width === "number") {
      return { width: clampSidebarWidth(saved.width), mini: saved.mini === true };
    }
  } catch {
    // Missing or broken value falls back to defaults
  }
  return { width: SIDEBAR.initial, mini: false };
}

/** Write the grid column width only, used on every pointer move while dragging */
export function setSidebarWidthVar(width: number) {
  document.documentElement.style.setProperty("--sbw", `${width}px`);
}

export function applySidebarLayout({ width, mini }: SidebarLayout) {
  setSidebarWidthVar(mini ? SIDEBAR.mini : width);
  document.documentElement.classList.toggle(MINI_CLASS, mini);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ width, mini }));
  } catch {
    // Storage can be blocked, the layout still applies for this session
  }
}

export const sidebarBootScript = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"null");if(s&&typeof s.width==="number"){var w=Math.min(${SIDEBAR.max},Math.max(${SIDEBAR.min},s.width)),r=document.documentElement;r.style.setProperty("--sbw",(s.mini?${SIDEBAR.mini}:w)+"px");if(s.mini)r.classList.add(${JSON.stringify(MINI_CLASS)})}}catch(e){}`;
