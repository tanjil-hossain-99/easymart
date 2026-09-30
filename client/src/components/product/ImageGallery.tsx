import { useState } from "react"
import type { ProductImage } from "@/types/api"

type Props = {
  images: ProductImage[]
  alt: string
}

// Amazon-style: thumbnails in a column on the left, big image on the right.
// Hovering a thumbnail swaps the big image (click works too, for touch screens).
export function ImageGallery({ images, alt }: Props) {
  // The server sorts the primary image first, so index 0 is the right default
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = images[selectedIndex]

  if (!selected) {
    return <div className="flex aspect-square w-full items-center justify-center rounded-md bg-muted text-muted-foreground">No image</div>
  }

  return (
    <div className="flex gap-3">
      {images.length > 1 && (
        <ul className="flex flex-col gap-2" aria-label="Product images">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => setSelectedIndex(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === selectedIndex}
                className={`block size-12 overflow-hidden rounded border-2 ${
                  index === selectedIndex ? "border-brand" : "border-border hover:border-brand/60"
                }`}
              >
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex aspect-square flex-1 items-center justify-center overflow-hidden rounded-md bg-muted">
        <img src={selected.url} alt={alt} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  )
}
