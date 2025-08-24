import type * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.ComponentProps<"input">, "type"> {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
}

function Switch({
	className,
	checked,
	onCheckedChange,
	...props
}: SwitchProps) {
	return (
		<label className="relative inline-flex items-center cursor-pointer">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onCheckedChange?.(e.target.checked)}
				className="sr-only peer"
				{...props}
			/>
			<div
				className={cn(
					"relative w-11 h-6 bg-card/60 backdrop-blur-sm border border-primary/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-primary/60 peer-checked:border-primary overflow-hidden",
					"before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:pointer-events-none",
					className,
				)}
			/>
		</label>
	);
}

export { Switch };