"use client";

import { useState } from "react";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export default function StarRating({ value, onChange, readonly }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className={`star-rating ${readonly ? "readonly" : ""}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= shown ? "filled" : ""}
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(null)}
          onClick={() => !readonly && onChange?.(n)}
          aria-label={`${n} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
