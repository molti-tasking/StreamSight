import { useEffect, useState } from "react";

export const useContainerDimensions = (
  myRef: React.RefObject<HTMLDivElement>
) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleResize = () => {
    if (myRef?.current) {
      const width = myRef.current.offsetWidth;
      const height = myRef.current.offsetHeight;

      if (width !== dimensions.width && height !== dimensions.height) {
        setDimensions({ width, height });
      }
    }
  };

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [myRef]);

  return dimensions;
};
