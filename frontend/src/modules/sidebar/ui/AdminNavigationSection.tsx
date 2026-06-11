import type { NavItem } from "@/modules/sidebar/data/navigation";
import { cn } from "@/shared/lib/cn";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface AdminNavigationSectionProps {
  items: NavItem[];
  title: string;
  renderItem: (item: NavItem) => ReactNode;
}

/** Collapsible "Administration" group */
export const AdminNavigationSection = ({
  items,
  title,
  renderItem,
}: AdminNavigationSectionProps) => {
  const pathname = usePathname();
  const isActive = items.some((item) => item.href === pathname);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (items.length === 0) return null;

  return (
    <div className="col-span-3 md:contents">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-2 rounded-lg px-3 text-muted-foreground transition-colors duration-200 hover:text-foreground",
          "mt-2 h-9 md:mt-3"
        )}
      >
        <span className="flex-1 text-left text-[11px] font-semibold tracking-wide uppercase">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="admin-items"
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid grid-cols-3 gap-2 pt-2 md:flex md:flex-col md:gap-0 md:space-y-1 md:pt-1">
              {items.map(renderItem)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
