"use client";

import { useCallback, useEffect, useState } from "react";

import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/src/components/ui/button";

type ImageDropzoneCardProps = {
	title: string;
	buttonLabel: string;
	existingUrl?: string | null;
	isUploading?: boolean;
	isDeleting?: boolean;
	onFileSelected?: (file: File) => void;
	onDelete?: () => void;
};

export default function ImageDropzoneCard({
	title,
	buttonLabel,
	existingUrl,
	isUploading,
	isDeleting,
	onFileSelected,
	onDelete,
}: ImageDropzoneCardProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (!file) {
			return;
		}

		setSelectedFile(file);
		const nextUrl = URL.createObjectURL(file);
		setPreviewUrl((currentUrl) => {
			if (currentUrl) {
				URL.revokeObjectURL(currentUrl);
			}
			return nextUrl;
		});

		if (onFileSelected) {
			onFileSelected(file);
		}
	}, [onFileSelected]);

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop,
		accept: {
			"image/*": [],
		},
		maxFiles: 1,
		multiple: false,
		noClick: true,
		noKeyboard: true,
		disabled: isUploading || isDeleting,
	});

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const displayUrl = previewUrl || existingUrl;
	const isActionDisabled = isUploading || isDeleting;

	return (
		<div className="relative rounded-md border border-neutral-200 p-4">
			<div className="mb-3 flex items-center justify-between">
				<p className="text-sm font-semibold text-[#953002] mx-auto">{title}</p>
				{(isUploading || isDeleting) && (
					<Loader2 className="absolute right-4 top-4 h-4 w-4 animate-spin text-neutral-400" />
				)}
			</div>

			<div
				{...getRootProps()}
				// `relative` contains react-dropzone's absolutely positioned hidden input.
				// overflow-hidden here does not clip it: with no positioned ancestor its
				// containing block is the document, which overflow on a static ancestor has
				// no say over. See the note in UniSholarships/Document.tsx.
				className={`relative mx-auto flex h-24 w-40 items-center justify-center overflow-hidden rounded-md border border-dashed text-xs transition-colors ${
					isDragActive
						? "border-[#953002] bg-[#fff3ec]"
						: displayUrl
						? "border-neutral-200 bg-neutral-50"
						: "border-neutral-300 bg-neutral-100 text-neutral-400"
				}`}
			>
				<input {...getInputProps()} />
				{displayUrl ? (
					<img src={displayUrl} alt={title} className="h-full w-full object-cover" />
				) : (
					<span className="px-2 text-center">Drag image here</span>
				)}
			</div>

			<div className="mt-3 flex gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={open}
					disabled={isActionDisabled}
					className="flex-1 border-neutral-300 bg-white text-xs text-neutral-700"
				>
					<ImagePlus className="h-4 w-4" />
					{displayUrl ? "Change" : buttonLabel}
				</Button>

				{displayUrl && onDelete && (
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setSelectedFile(null);
							setPreviewUrl(null);
							onDelete();
						}}
						disabled={isActionDisabled}
						className="border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 text-xs text-red-600 px-3"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
