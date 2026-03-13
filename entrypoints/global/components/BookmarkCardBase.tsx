import React, { useEffect, useRef, useState, ReactNode } from "react";

interface BookmarkCardBaseProps {
  url: string;
  image?: string;
  renderCard: (props: {
    isInView: boolean;
    cardRef: React.RefObject<HTMLDivElement | null>;
    hostname: string;
  }) => ReactNode;
}

export const BookmarkCardBase: React.FC<BookmarkCardBaseProps> = ({
  url,
  image,
  renderCard,
}) => {
  const [isInView, setIsInView] = useState(false);
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

  return <>{renderCard({ isInView, cardRef, hostname })}</>;
};
