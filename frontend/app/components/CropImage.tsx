"use client";

import { useState } from "react";
import { getCropImageUrl } from "../lib/cropImages";

interface Props {
  cropName: string;
  className?: string;
}

export default function CropImage({ cropName, className }: Props) {
  const [failed, setFailed] = useState(false);
  const url = getCropImageUrl(cropName);

  if (failed) {
    return (
      <div className={`crop-image crop-image-fallback ${className ?? ""}`}>
        <span>🌾</span>
      </div>
    );
  }

  return (
    <div className={`crop-image ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={cropName} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}
