import React, { useEffect, useRef, useState, ReactNode } from "react";

interface BookmarkCardBaseProps {
  url: string;
  coverExists?: boolean;
  renderCard: (props: {
    isInView: boolean;
    cardRef: React.RefObject<HTMLDivElement | null>;
    hostname: string;
    image?: string;
  }) => ReactNode;
}

export const BookmarkCardBase: React.FC<BookmarkCardBaseProps> = ({
  url,
  coverExists,
  renderCard,
}) => {
  const [isInView, setIsInView] = useState(false);
  const [image, setImage] = useState<string | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch (_) {}

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.01 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isInView && coverExists) {
      browser.storage.local.get(url).then((res) => {
        if (!isMounted) return;
        const raw = res[url];
        if (raw) {
          let blobUrl = "";
          if (Array.isArray(raw)) {
            blobUrl = URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" }));
          } else if (typeof raw === "string" && raw.startsWith("data:")) {
            blobUrl = raw;
          }
          setImage(blobUrl);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isInView, coverExists, url]);

  useEffect(() => {
    return () => {
      if (image && image.startsWith("blob:")) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  return <>{renderCard({ isInView, cardRef, hostname, image })}</>;
};
