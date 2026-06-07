import { ArrowUp } from "lucide-react";

/** Round primary badge with an up arrow, shown on Panel Settings when an update exists */
export const UpdateIndicator = ({ label }: { label: string }) => (
  <span
    title={label}
    aria-label={label}
    className="absolute top-1.5 right-1.5 flex size-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm md:static md:ml-auto"
  >
    <ArrowUp className="size-3" strokeWidth={2.75} />
  </span>
);
