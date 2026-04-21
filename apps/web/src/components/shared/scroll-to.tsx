"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

const ScrollTo = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 80) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <>
      {isVisible && (
        <div className="fixed right-4 bottom-4 z-999 flex gap-2">
          {/* Scroll to Top */}
          <button
            onClick={scrollToTop}
            className="rounded-lg bg-purple-500/80 p-3 text-white shadow-md transition duration-300 hover:bg-purple-300/80"
            aria-label="Scroll to top"
          >
            <ArrowUp size={20} />
          </button>

          {/* Scroll to Bottom */}
          <button
            onClick={scrollToBottom}
            className="rounded-lg bg-purple-500/80 p-3 text-white shadow-md transition duration-300 hover:bg-purple-300/80"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={20} />
          </button>
        </div>
      )}
    </>
  );
};

export default ScrollTo;
