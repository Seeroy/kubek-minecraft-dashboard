import { authHttp } from "@/shared/lib/http";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface BlobImageProps {
  src: string;
  alt?: string;
  className?: string;
  onError?: () => void;
}

const BlobImage: React.FC<BlobImageProps> = ({
  src,
  alt,
  className,
  onError,
}) => {
  const [result, setResult] = useState<Blob | null>(null);
  const [hasError, setHasError] = useState(false);

  // Keep latest onError without retriggering the load effect
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    setHasError(false);
    setResult(null);
    authHttp.raw
      .get(src)
      .blob()
      .then((blob) => {
        if (!cancelled) setResult(blob);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load image:", error);
        setHasError(true);
        onErrorRef.current?.();
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const objectUrl = useMemo(
    () => (result ? URL.createObjectURL(result) : null),
    [result]
  );

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  if (hasError || !objectUrl) {
    return null;
  }

  return (
    <img
      alt={alt}
      className={className}
      src={objectUrl}
      onError={() => {
        setHasError(true);
        onErrorRef.current?.();
      }}
    />
  );
};

export default BlobImage;
