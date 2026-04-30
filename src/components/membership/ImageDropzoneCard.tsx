"use client";

import { useCallback, useEffect, useState } from "react";

import { ImagePlus } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/src/components/ui/button";

type ImageDropzoneCardProps = {
	title: string;
	buttonLabel: string;
};

export default function ImageDropzoneCard({ title, buttonLabel }: ImageDropzoneCardProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const selectedFile = acceptedFiles[0];
		if (!selectedFile) {
			return;
		}

		const nextUrl = URL.createObjectURL(selectedFile);
		setPreviewUrl((currentUrl) => {
			if (currentUrl) {
				URL.revokeObjectURL(currentUrl);
			}
			return nextUrl;
		});
	}, []);

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop,
		accept: {
			"image/*": [],
		},
		maxFiles: 1,
		multiple: false,
		noClick: true,
		noKeyboard: true,
	});

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	return (
		<div className="rounded-md border border-neutral-200 p-4">
			<p className="mb-3 text-center text-sm font-semibold text-[#b2410f]">{title}</p>

			<div
				{...getRootProps()}
				className={`mx-auto flex h-24 w-40 items-center justify-center overflow-hidden rounded-md border border-dashed text-xs transition-colors ${
					isDragActive
						? "border-[#b2410f] bg-[#fff3ec]"
						: "border-neutral-300 bg-neutral-100 text-neutral-400"
				}`}
			>
				<input {...getInputProps()} />
				{previewUrl ? (
					<img src={previewUrl} alt={title} className="h-full w-full object-cover" />
				) : (
					<span className="px-2 text-center">Drag image here</span>
				)}
			</div>

			<Button
				type="button"
				variant="outline"
				onClick={open}
				className="mx-auto mt-3 flex h-8 border-neutral-300 bg-white text-xs text-neutral-700"
			>
				<ImagePlus className="h-4 w-4" />
				{buttonLabel}
			</Button>
		</div>
	);
}
