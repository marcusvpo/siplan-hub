import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollingTextProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second
  pauseOnHover?: boolean;
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({
  text,
  className,
  speed = 40,
  pauseOnHover = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;
        const overflowing = textWidth > containerWidth;
        setIsOverflowing(overflowing);
        
        if (overflowing) {
          // Calculate duration based on speed
          const dist = textWidth - containerWidth;
          const dur = Math.max(3, dist / speed);
          setDuration(dur);
        }
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, speed]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden whitespace-nowrap", className)}
    >
      <span
        ref={textRef}
        className={cn(
          "inline-block",
          isOverflowing && "animate-marquee"
        )}
        style={
          isOverflowing
            ? {
                animationDuration: `${duration}s`,
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-in-out",
                "--scroll-dist": `-${(textRef.current?.offsetWidth || 0) - (containerRef.current?.offsetWidth || 0)}px`,
              } as React.CSSProperties
            : {}
        }
      >
        {text}
      </span>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0%, 20% { transform: translateX(0); }
          80%, 100% { transform: translateX(var(--scroll-dist, 0)); }
        }
        .animate-marquee {
          animation-name: marquee;
          animation-direction: alternate;
        }
        ${pauseOnHover ? '.animate-marquee:hover { animation-play-state: paused; }' : ''}
      `}} />
    </div>
  );
};
