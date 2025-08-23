import type * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center px-3 py-1 text-xs font-mono font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden relative uppercase tracking-wider before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/10 before:to-transparent before:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/40 after:to-transparent",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 text-primary backdrop-blur-sm [a&]:hover:bg-primary/30 [a&]:hover:shadow-[0_0_10px_rgba(117,255,255,0.3)]",
        secondary:
          "bg-secondary/20 text-secondary-foreground backdrop-blur-sm [a&]:hover:bg-secondary/30",
        destructive:
          "bg-destructive/20 text-destructive backdrop-blur-sm [a&]:hover:bg-destructive/30 [a&]:hover:shadow-[0_0_10px_rgba(255,75,75,0.3)] before:from-destructive/10 after:via-destructive/40",
        outline:
          "border border-primary/30 bg-transparent text-primary backdrop-blur-sm [a&]:hover:bg-primary/10 [a&]:hover:border-primary [a&]:hover:shadow-[0_0_8px_rgba(117,255,255,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
