"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormField, FormSchema } from "@/lib/api";

interface FormPreviewProps {
	schema: FormSchema;
}

function FormFieldPreview({ field }: { field: FormField }) {
	const isRequired = field.validation?.required?.value;
	const labelId = `preview-${field.name}`;

	const renderField = () => {
		switch (field.type) {
			case "text":
			case "email":
			case "tel":
			case "number":
				return (
					<Input
						id={labelId}
						type={field.type}
						placeholder={field.placeholder}
						defaultValue={field.defaultValue}
						className="border-[#D1D1D1]"
					/>
				);

			case "textarea":
				return (
					<Textarea
						id={labelId}
						placeholder={field.placeholder}
						defaultValue={field.defaultValue}
						rows={3}
						className="border-[#D1D1D1]"
					/>
				);

			case "select":
				return (
					<Select defaultValue={field.defaultValue}>
						<SelectTrigger id={labelId} className="border-[#D1D1D1]">
							<SelectValue placeholder={field.placeholder || "Select an option"} />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);

			case "multiselect":
				return (
					<Select defaultValue={field.defaultValue}>
						<SelectTrigger id={labelId} className="border-[#D1D1D1]">
							<SelectValue placeholder={field.placeholder || "Select options"} />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);

			case "date":
				return (
					<Input
						id={labelId}
						type="date"
						defaultValue={field.defaultValue}
						className="w-full border-[#D1D1D1]"
					/>
				);

			case "datetime":
				return (
					<Input
						id={labelId}
						type="datetime-local"
						defaultValue={field.defaultValue}
						className="w-full border-[#D1D1D1]"
					/>
				);

			case "file":
			case "image":
				return (
					<Input
						id={labelId}
						type="file"
						accept={field.type === "image" ? "image/*" : undefined}
						disabled
						className="cursor-not-allowed border-[#D1D1D1]"
					/>
				);

			default:
				return (
					<Input
						id={labelId}
						type="text"
						placeholder={field.placeholder}
						defaultValue={field.defaultValue}
						className="border-[#D1D1D1]"
					/>
				);
		}
	};

	return (
		<div className="space-y-2">
			<Label htmlFor={labelId} className="text-xs font-mono uppercase tracking-widest">
				{field.label}
				{isRequired && <span className="ml-1 text-red-600">*</span>}
			</Label>
			{renderField()}
		</div>
	);
}

export function FormPreview({ schema }: FormPreviewProps) {
	return (
		<form onSubmit={(e) => e.preventDefault()} className="space-y-6">
			{schema.fields.map((field) => (
				<FormFieldPreview key={field.name} field={field} />
			))}
			<Button
				type="button"
				disabled
				className="w-full mt-6 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest opacity-50 cursor-not-allowed"
			>
				{schema.submitLabel || "Submit"}
			</Button>
		</form>
	);
}
