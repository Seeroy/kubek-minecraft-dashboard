import type { IFile } from "@shared/types/file.types";

/** Everything a file row can trigger, wired by the Files page */
export interface FileActions {
  navigate: (path: string) => void;
  /** Warms a folder listing before it is opened */
  prefetch?: (path: string) => void;
  /** Missing when the user may not do it */
  edit?: (file: IFile) => void;
  download: (file: IFile) => void;
  extract?: (file: IFile) => void;
  remove?: (file: IFile) => void;
  openLog: (file: IFile) => void;
}

export type SelectModifiers = { ctrl: boolean; shift: boolean };
