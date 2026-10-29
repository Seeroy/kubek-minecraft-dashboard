import type { SupportedLanguage } from "@/locales";
import { cn } from "@/shared/lib/cn";
import Image from "next/image";

function LanguageFlag({ code, className }: { code: SupportedLanguage; className?: string }) {
  return (
    <Image
      src={`/images/flags/${code}.svg`}
      alt=""
      width={20}
      height={15}
      className={cn("h-[15px] w-5 shrink-0 rounded-[2px] object-cover", className)}
    />
  );
}

export { LanguageFlag };
