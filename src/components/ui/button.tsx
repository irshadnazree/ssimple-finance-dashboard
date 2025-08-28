import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-mono font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 relative overflow-hidden uppercase tracking-wider",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(117,255,255,0.3)] active:scale-95",
				destructive:
					"bg-destructive text-white hover:bg-destructive/90 hover:shadow-[0_0_20px_rgba(255,75,75,0.3)] active:scale-95",
				outline:
					"border border-primary/30 bg-transparent text-primary hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_15px_rgba(117,255,255,0.2)] active:scale-95",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_0_15px_rgba(117,255,255,0.1)] active:scale-95",
				ghost:
					"hover:bg-primary/10 hover:text-primary text-muted-foreground active:scale-95",
				link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
			},
			size: {
				default: "h-10 px-6 py-2 has-[>svg]:px-4",
				sm: "h-8 gap-1.5 px-4 has-[>svg]:px-3 text-xs",
				lg: "h-12 px-8 has-[>svg]:px-6 text-base",
				icon: "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
