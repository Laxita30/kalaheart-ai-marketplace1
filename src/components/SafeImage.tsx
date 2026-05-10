import * as React from "react";
import { cn } from "@/lib/utils";

type Kind = "product" | "avatar" | "generic";

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  /** Stable identifier used to derive the deterministic fallback (e.g. product.id, user_id). Falls back to alt. */
  fallbackSeed?: string;
  kind?: Kind;
  /** Pixel size hint for the deterministic fallback (square). */
  size?: number;
}

const isUsableUrl = (s?: string | null): s is string =>
  typeof s === "string" && s.trim().length > 0 && s.trim() !== "null" && s.trim() !== "undefined";

export const buildFallbackUrl = (kind: Kind, seed: string, size = 600) => {
  const safe = encodeURIComponent(seed || kind);
  // picsum.photos is deterministic per seed, always returns a valid image
  return `https://picsum.photos/seed/${kind}-${safe}/${size}/${size}`;
};

/**
 * Robust <img> wrapper:
 *  - Uses the provided src if present.
 *  - Falls back to a deterministic picsum image (seed-based) when missing or on load error.
 *  - Guards against infinite onError loops.
 */
const SafeImage = React.forwardRef<HTMLImageElement, SafeImageProps>(
  ({ src, alt, fallbackSeed, kind = "generic", size = 600, className, onError, ...rest }, ref) => {
    const seed = fallbackSeed || alt || "image";
    const fallback = React.useMemo(() => buildFallbackUrl(kind, seed, size), [kind, seed, size]);
    const initial = isUsableUrl(src) ? (src as string) : fallback;
    const [current, setCurrent] = React.useState(initial);
    const triedFallback = React.useRef(initial === fallback);

    React.useEffect(() => {
      const next = isUsableUrl(src) ? (src as string) : fallback;
      setCurrent(next);
      triedFallback.current = next === fallback;
    }, [src, fallback]);

    return (
      <img
        ref={ref}
        src={current}
        alt={alt}
        loading={rest.loading ?? "lazy"}
        decoding={rest.decoding ?? "async"}
        referrerPolicy={rest.referrerPolicy ?? "no-referrer"}
        className={cn(className)}
        onError={(e) => {
          if (!triedFallback.current) {
            triedFallback.current = true;
            setCurrent(fallback);
          }
          onError?.(e);
        }}
        {...rest}
      />
    );
  },
);
SafeImage.displayName = "SafeImage";

export default SafeImage;