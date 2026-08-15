import { useEffect, useState } from "react";

// Tracks document.visibilityState so inactive/backgrounded tabs can stop
// their Three.js render loop entirely (Canvas frameloop="never") instead of
// continuing to render, animate particles, and run bloom passes for a tab
// the user isn't even looking at.
export function useDocumentVisible() {
  const [visible, setVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState !== "hidden"
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
