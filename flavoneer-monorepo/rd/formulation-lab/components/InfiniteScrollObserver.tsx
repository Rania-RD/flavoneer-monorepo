import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";

interface Props {
  canLoadMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

const InfiniteScrollObserver: React.FC<Props> = ({
  canLoadMore,
  isLoading,
  onLoadMore,
}) => {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && canLoadMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "200px", // Trigger 200px before reaching the bottom
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [canLoadMore, isLoading, onLoadMore]);

  if (!(canLoadMore || isLoading)) {
    return <div className="h-4 w-full" />;
  }

  return (
    <div
      className="flex h-16 w-full items-center justify-center p-4 text-gray-400 dark:text-slate-500"
      ref={observerRef}
    >
      {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
    </div>
  );
};

export default InfiniteScrollObserver;
