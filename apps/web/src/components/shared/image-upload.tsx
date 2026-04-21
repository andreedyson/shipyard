"use client";

import { Label } from "@/components/ui/label";
import Image from "next/image";

type ImageUploadProps = {
  imagePreview: string | null;
  onImageChangeAction: (file: File | null) => void;
  error?: string;
};

export function ImageUpload({
  imagePreview,
  onImageChangeAction,
  error,
}: ImageUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onImageChangeAction(file);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="thumbnail">Thumbnail (jpg/jpeg, max 2MB)</Label>
      <div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border-2 border-dashed">
        {imagePreview ? (
          <Image
            src={imagePreview}
            alt="Preview Thumbnail"
            className="h-full w-full object-cover"
            width={800}
            height={450}
          />
        ) : (
          <span className="text-muted-foreground text-sm">
            Belum ada gambar
          </span>
        )}
        <input
          id="thumbnail"
          type="file"
          accept="image/jpeg,image/jpg"
          onChange={handleChange}
          className="hidden"
        />
        <label
          htmlFor="thumbnail"
          className="bg-primary hover:bg-primary/90 absolute right-2 bottom-2 cursor-pointer rounded px-3 py-1 text-sm text-white transition"
        >
          Upload Gambar
        </label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
