import type { TranslationDictionary } from "../../../locales/types";

export const filesTranslations: TranslationDictionary = {
  header: {
    title: "File Manager",
    description: "Browse, edit, and manage server files",
  },
  modals: {
    confirmDialog: {
      defaultTitle: "Are you sure?",
      confirmText: "Confirm",
      cancelText: "Cancel",
    },
    newDirectory: {
      title: "Create New Directory",
      description: "Enter a name for your new directory in",
      form: {
        directoryName: {
          label: "Directory Name",
          placeholder: "New Folder",
        },
        submit: {
          default: "Create Directory",
          loading: "Creating...",
        },
      },
      cancel: "Cancel",
    },
    newFile: {
      title: "Create New File",
      description: "Enter a name for your new file in",
      form: {
        fileName: {
          label: "File Name",
          placeholder: "newfile.txt",
        },
        submit: {
          default: "Create File",
          loading: "Creating...",
        },
      },
      cancel: "Cancel",
    },
    editor: {
      title: "Edit file",
      cancel: "Cancel",
      viewInLogViewer: "View in Log Viewer",
      save: {
        default: "Save",
        loading: "Saving...",
      },
    },
    createArchive: {
      title: "Create archive",
      description: ({ count }: { count: number }) => `Build a ZIP from ${ count } selected items`,
      form: {
        name: {
          label: "Archive name",
          placeholder: "archive",
        },
      },
      preview: {
        label: "Will be included:",
        more: ({ count }: { count: number }) => `… and ${ count } more`,
      },
      submit: "Create",
      cancel: "Cancel",
    },
  },
  ui: {
    files: {
      noServerSelected: "Please select a server to view files",
      buttons: {
        createFile: "Create file",
        createFolder: "Create folder",
        upload: "Upload",
      },
      delete: {
        title: "Delete",
        description: "Are you sure you want to delete",
        confirmText: "Delete",
        cancelText: "Cancel",
        undoWarning: "This action cannot be undone",
        confirmManyTitle: ({ count }: { count: number }) => `Delete ${ count } items?`,
        confirmManyDesc: "This action cannot be undone",
      },
      selection: {
        count: ({ count }: { count: number }) => `Selected: ${ count }`,
        actions: {
          delete: "Delete",
          archive: "Create archive",
        },
      },
      dropzone: {
        hint: "Drop files to upload",
      },
      tips: {
        button: "Tips",
        title: "Tips & shortcuts",
        click: "click",
        multiSelect: "Select multiple files",
        rangeSelect: "Select a range",
        archive: "Pack selected files into a ZIP archive",
        dragUpload: "Drag files into the window to upload",
      },
    },
    filesList: {
      loading: "Loading files...",
      searchPlaceholder: "Search files...",
      noMatches: "No matches",
      search: {
        placeholderAll: "Search all files...",
        scope: {
          folder: "Folder",
          all: "Everywhere",
        },
        found: ({ count }: { count: number }) => `Found: ${ count }`,
        empty: ({ query }: { query: string }) => `No results for "${ query }"`,
      },
      empty: {
        title: "No Files Found",
        subtitle: "This directory is empty",
        description: "No files or folders found in this directory",
        hint: "Create a new file or folder to get started",
      },
      table: {
        headers: {
          name: "Name",
          size: "Size",
          modified: "Modified",
        },
      },
    },
    fileItem: {
      actions: {
        edit: "Edit",
        download: "Download",
        copyPath: "Copy Path",
        delete: "Delete",
        extract: "Extract",
        openInLogViewer: "Open in Log Viewer",
      },
    },
  },
  notifications: {
    success: {
      directoryCreated: "Directory created successfully",
      fileCreated: "File created successfully",
      fileSaved: "File saved successfully",
      fileUploaded: "File uploaded successfully",
      fileDownloaded: "File downloaded successfully",
      pathCopied: "Path copied to clipboard",
      deleted: "deleted successfully",
      batchDeleted: "Items deleted",
      archiveCreated: "Archive created",
      archiveExtracted: "Archive extracted",
      uploadedMany: ({ count }: { count: number }) => `Uploaded ${ count } file${ count === 1 ? "" : "s" }`,
    },
    error: {
      operationFailed: "Operation failed",
      loadFiles: "Failed to load files",
      readFile: "Failed to read file",
      saveFile: "Failed to save file",
      createDirectory: "Failed to create directory",
      createFile: "Failed to create file",
      uploadFile: "Failed to upload file",
      downloadFile: "Failed to download file",
      delete: "Failed to delete",
      batchDelete: "Failed to delete selection",
      archiveCreate: "Failed to create archive",
      archiveExtract: "Failed to extract archive",
      uploadSome: ({ ok, fail }: { ok: number; fail: number }) => `Uploaded ${ ok }, failed ${ fail }`,
      cannotEditFile: "This file type cannot be opened in the text editor",
    },
    progress: {
      deleting: "Deleting files…",
      archiving: "Building archive…",
      extracting: "Extracting archive…",
      uploading: "Uploading files…",
    },
  },
};