"use client";

import { useOOBE } from "@/shared/hooks/useOOBE";
import LoaderV2 from "@/shared/ui/loader-v2";
import { useEffect, useState } from "react";

const PagePreloader = () => {
  const { isLoading } = useOOBE();
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!isLoading) setShouldRender(false);
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex h-screen w-screen items-center justify-center overflow-hidden bg-background transition-opacity duration-200 ease-out ${isLoading ? "opacity-100" : "pointer-events-none opacity-0"} `}
    >
      <LoaderV2 size={48} margin={40} />
    </div>
  );
};

export default PagePreloader;
