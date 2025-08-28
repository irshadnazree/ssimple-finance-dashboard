import { format } from "date-fns";
import { Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";
import { reportsService } from "../../lib/reports/reportsService";
import type { DateRange } from "../../types/finance";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface DateRangeSelectorProps {
	selectedRange: DateRange;
	onRangeChange: (range: DateRange) => void;
	className?: string;
}

export function DateRangeSelector({
	selectedRange,
	onRangeChange,
	className,
}: DateRangeSelectorProps) {
	const [isCustomMode, setIsCustomMode] = useState(false);
	const [customStartDate, setCustomStartDate] = useState(
		format(selectedRange.startDate, "yyyy-MM-dd"),
	);
	const [customEndDate, setCustomEndDate] = useState(
		format(selectedRange.endDate, "yyyy-MM-dd"),
	);
	const [showDropdown, setShowDropdown] = useState(false);

	const predefinedRanges = reportsService.getPredefinedDateRanges();

	const handlePresetSelect = (preset: {
		label: string;
		value: string;
		range: DateRange;
	}) => {
		onRangeChange(preset.range);
		setIsCustomMode(false);
		setShowDropdown(false);
	};

	const handleCustomRangeApply = () => {
		const startDate = new Date(customStartDate);
		const endDate = new Date(customEndDate);

		if (startDate <= endDate) {
			onRangeChange({
				startDate,
				endDate,
				label: `${format(startDate, "MMM dd")} - ${format(
					endDate,
					"MMM dd, yyyy",
				)}`,
			});
			setShowDropdown(false);
		}
	};

	const toggleCustomMode = () => {
		setIsCustomMode(!isCustomMode);
		if (!isCustomMode) {
			setCustomStartDate(format(selectedRange.startDate, "yyyy-MM-dd"));
			setCustomEndDate(format(selectedRange.endDate, "yyyy-MM-dd"));
		}
	};

	return (
		<div className={`relative ${className}`}>
			<Button
				variant="outline"
				onClick={() => setShowDropdown(!showDropdown)}
				className="w-full justify-between font-mono text-sm"
			>
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4" />
					<span>
						{selectedRange.label ||
							`${format(selectedRange.startDate, "MMM dd")} - ${format(
								selectedRange.endDate,
								"MMM dd, yyyy",
							)}`}
					</span>
				</div>
				<ChevronDown
					className={`h-4 w-4 transition-transform ${
						showDropdown ? "rotate-180" : ""
					}`}
				/>
			</Button>

			{showDropdown && (
				<Card className="absolute top-full left-0 right-0 z-50 mt-2 bg-card/95 backdrop-blur-sm border-border/50">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-mono uppercase tracking-wider">
							Select Date Range
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Preset Options */}
						{!isCustomMode && (
							<div className="space-y-2">
								<Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
									Quick Select
								</Label>
								<div className="grid grid-cols-2 gap-2">
									{predefinedRanges.map((preset) => (
										<Button
											key={preset.value}
											variant="ghost"
											size="sm"
											onClick={() => handlePresetSelect(preset)}
											className="justify-start font-mono text-xs h-8"
										>
											{preset.label}
										</Button>
									))}
								</div>
							</div>
						)}

						{/* Custom Range */}
						{isCustomMode && (
							<div className="space-y-4">
								<Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
									Custom Range
								</Label>
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-2">
										<Label className="text-xs font-mono">Start Date</Label>
										<Input
											type="date"
											value={customStartDate}
											onChange={(e) => setCustomStartDate(e.target.value)}
											className="font-mono text-xs"
										/>
									</div>
									<div className="space-y-2">
										<Label className="text-xs font-mono">End Date</Label>
										<Input
											type="date"
											value={customEndDate}
											onChange={(e) => setCustomEndDate(e.target.value)}
											className="font-mono text-xs"
										/>
									</div>
								</div>
								<div className="flex gap-2">
									<Button
										size="sm"
										onClick={handleCustomRangeApply}
										className="flex-1 font-mono text-xs"
										disabled={
											!customStartDate ||
											!customEndDate ||
											new Date(customStartDate) > new Date(customEndDate)
										}
									>
										Apply Range
									</Button>
								</div>
							</div>
						)}

						{/* Toggle Custom Mode */}
						<div className="border-t border-border/50 pt-3">
							<Button
								variant="ghost"
								size="sm"
								onClick={toggleCustomMode}
								className="w-full font-mono text-xs"
							>
								{isCustomMode ? "← Back to Presets" : "Custom Range →"}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Quick date range buttons component
export function QuickDateRanges({
	onRangeSelect,
	selectedRange,
	className,
}: {
	onRangeSelect: (range: DateRange) => void;
	selectedRange: DateRange;
	className?: string;
}) {
	const predefinedRanges = reportsService.getPredefinedDateRanges();

	return (
		<div className={`flex flex-wrap gap-2 ${className}`}>
			{predefinedRanges.map((preset) => {
				const isSelected = selectedRange.label === preset.range.label;
				return (
					<Button
						key={preset.value}
						variant={isSelected ? "default" : "outline"}
						size="sm"
						onClick={() => onRangeSelect(preset.range)}
						className="font-mono text-xs"
					>
						{preset.label}
					</Button>
				);
			})}
		</div>
	);
}

// Date range display component
export function DateRangeDisplay({
	range,
	className,
}: {
	range: DateRange;
	className?: string;
}) {
	return (
		<div
			className={`flex items-center gap-2 text-sm text-muted-foreground font-mono ${className}`}
		>
			<Calendar className="h-4 w-4" />
			<span>
				{range.label ||
					`${format(range.startDate, "MMM dd, yyyy")} - ${format(
						range.endDate,
						"MMM dd, yyyy",
					)}`}
			</span>
		</div>
	);
}
