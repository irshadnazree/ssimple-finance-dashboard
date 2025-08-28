import type * as React from "react";

import { cn } from "@/lib/utils";

function Select({ className, ...props }: React.ComponentProps<"select">) {
	return (
		<select
			className={cn(
				"flex h-10 w-full bg-card/60 backdrop-blur-sm px-3 py-2 text-sm font-mono transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 relative overflow-hidden",
				"before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:pointer-events-none",
				"after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent",
				"border border-primary/20 hover:border-primary/40 focus-visible:border-primary",
				className,
			)}
			{...props}
		/>
	);
}

export { Select };
