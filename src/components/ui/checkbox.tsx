/**
 * Checkbox Component - Professional Trading Platform
 * Following rule_ui.md: NO generic checkboxes
 * Unique design with custom check icon and animations
 */
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {
  label?: string;
  description?: string;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, description, ...props }, ref) => {
  return (
    <div className="flex items-start gap-3">
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          "peer h-5 w-5 shrink-0 rounded-[var(--radius-sm)]",
          "border-2 border-border-default bg-bg-secondary",
          "transition-all duration-[var(--transition-fast)]",
          "hover:border-border-strong hover:bg-bg-tertiary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-accent-primary data-[state=checked]:border-accent-primary",
          "data-[state=checked]:hover:bg-accent-primary/90",
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
          {/* Custom check icon - NOT generic checkmark */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="animate-in zoom-in-50 duration-200"
          >
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {(label || description) && (
        <div className="grid gap-1 leading-none">
          {label && (
            <label
              htmlFor={props.id}
              className="text-sm font-medium text-text-primary cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-text-tertiary">{description}</p>
          )}
        </div>
      )}
    </div>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
