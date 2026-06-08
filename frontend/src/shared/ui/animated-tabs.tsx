"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export interface AnimatedTabItem {
  value: string;
  label?: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  content: React.ReactNode;
}

interface AnimatedTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: AnimatedTabItem[];
  className?: string;
  listClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function AnimatedTabs({
                               value,
                               onValueChange,
                               items,
                               className,
                               listClassName,
                               triggerClassName,
                               contentClassName,
                             }: AnimatedTabsProps) {
  return (
    <Tabs value={ value } onValueChange={ onValueChange } className={ cn("gap-4", className) }>
      <TabsList className={ cn("h-auto gap-2 rounded-xl p-1", listClassName) }>
        { items.map(({ icon: Icon, label, value: itemValue }) => {
          const isActive = value === itemValue;

          return (
            <motion.div
              key={ itemValue }
              layout
              className={ cn(
                "flex h-8 items-center justify-center overflow-hidden rounded-md",
                isActive ? "flex-1" : "flex-none",
              ) }
              onClick={ () => onValueChange(itemValue) }
              initial={ false }
              animate={ {
                width: isActive ? 120 : 32,
              } }
              transition={ {
                type: "tween",
                stiffness: 400,
                damping: 25,
              } }
            >
              <TabsTrigger value={ itemValue } className={ cn("px-0", triggerClassName) }>
                <motion.div
                  className="flex h-8 w-full items-center justify-center gap-1.5"
                  animate={ { filter: "blur(0px)" } }
                  exit={ { filter: "blur(2px)" } }
                  transition={ { duration: 0.25, ease: "easeOut" } }
                >
                  { Icon && <Icon className="aspect-square size-4 shrink-0"/> }
                  <AnimatePresence initial={ false }>
                    { isActive && label && (
                      <motion.span
                        className="font-medium"
                        initial={ { opacity: 0, scaleX: 0.8 } }
                        animate={ { opacity: 1, scaleX: 1 } }
                        exit={ { opacity: 0, scaleX: 0.9 } }
                        transition={ { duration: 0.25, ease: "easeOut" } }
                        style={ { originX: 0 } }
                      >
                        { label }
                      </motion.span>
                    ) }
                  </AnimatePresence>
                </motion.div>
              </TabsTrigger>
            </motion.div>
          );
        }) }
      </TabsList>

      { items.map((item) => (
        <TabsContent
          key={ item.value }
          value={ item.value }
          className={ cn("mt-0", contentClassName) }
        >
          { item.content }
        </TabsContent>
      )) }
    </Tabs>
  );
}
