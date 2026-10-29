const STORAGE_KEY = "kubek:page-width";
const CONTAINED_CLASS = "page-contained";

/** Keep pages at the readable width or stretch them to the whole content area */
export function togglePageWidth() {
  const contained = document.documentElement.classList.toggle(CONTAINED_CLASS);
  try {
    localStorage.setItem(STORAGE_KEY, contained ? "contained" : "full");
  } catch {
    // Storage can be blocked, the width still applies for this session
  }
}

export const pageWidthBootScript = `try{if(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})==="contained")document.documentElement.classList.add(${JSON.stringify(CONTAINED_CLASS)})}catch(e){}`;
