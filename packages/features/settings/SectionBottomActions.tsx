import classNames from "@calcom/ui/classNames";
import type { ReactNode } from "react";

const SectionBottomActions = ({
  align = "start",
  children,
  className,
}: {
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={classNames(
        "flex rounded-b-lg border border-subtle bg-muted px-6 py-4",
        align === "end" && "justify-end",
        className
      )}>
      {children}
    </div>
  );
};

export default SectionBottomActions;
