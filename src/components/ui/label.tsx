import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

const labelVariants = cva(
	"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

export interface LabelProps
	extends React.LabelHTMLAttributes<HTMLLabelElement>,
		VariantProps<typeof labelVariants> {
	htmlFor?: string;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
	({ className, htmlFor, ...props }, ref) => (
		<label
			ref={ref}
			htmlFor={htmlFor}
			className={cn(labelVariants(), className)}
			{...props}
			aria-label={props["aria-label"]}
			id={props.id}
		/>
	),
);
Label.displayName = "Label";

export { Label };
