"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import React from "react";

interface FilesBreadcrumbProps {
  serverName: string;
  breadcrumbParts: string[];
  onNavigate: (path: string) => void;
}

const FilesBreadcrumb: React.FC<FilesBreadcrumbProps> = ({
  serverName,
  breadcrumbParts,
  onNavigate,
}) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("");
            }}
            className="cursor-pointer"
          >
            {serverName}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbParts.map((p, idx) => (
          <React.Fragment key={idx}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {idx === breadcrumbParts.length - 1 ? (
                <BreadcrumbPage>{p}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(breadcrumbParts.slice(0, idx + 1).join("/"));
                  }}
                  className="cursor-pointer"
                >
                  {p}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default FilesBreadcrumb;
