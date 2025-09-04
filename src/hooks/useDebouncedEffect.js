import { useEffect, useRef } from "react";

const useDebouncedEffect = (callback, deps, delay) => {
  const timeoutRef = useRef(null);
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, deps);
};

export default useDebouncedEffect;
