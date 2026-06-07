"use client";
import { UploadCloud } from "lucide-react";
import React from "react";

interface FilesDropzoneOverlayProps {
  hint: string;
}

const FilesDropzoneOverlay: React.FC<FilesDropzoneOverlayProps> = ({
  hint,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/70 bg-primary/5 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-primary">
        <UploadCloud className="h-10 w-10" />
        <p className="text-sm font-medium">{hint}</p>
      </div>
    </div>
  );
};

export default FilesDropzoneOverlay;
