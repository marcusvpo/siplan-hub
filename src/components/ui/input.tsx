import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === "date") {
        const key = e.key.toLowerCase();
        if (["o", "h", "a", "d"].includes(key)) {
          e.preventDefault();
          const target = e.currentTarget;
          let dateStr = "";

          const getLocalDateString = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };

          if (key === "h") {
            dateStr = getLocalDateString(new Date());
          } else if (key === "o") {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dateStr = getLocalDateString(yesterday);
          } else if (key === "a") {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateStr = getLocalDateString(tomorrow);
          } else if (key === "d") {
            if (typeof target.showPicker === "function") {
              try {
                target.showPicker();
              } catch (err) {
                console.error("Failed to show picker: ", err);
              }
            }
            return;
          }

          if (dateStr) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(target, dateStr);
              target.dispatchEvent(new Event("input", { bubbles: true }));
              target.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
              target.value = dateStr;
            }
          }
        }
      }

      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-subtle ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
