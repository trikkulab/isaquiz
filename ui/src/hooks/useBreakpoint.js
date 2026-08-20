// Hook minimo: dice a chi lo chiama se siamo sopra o sotto una soglia di
// larghezza, così la scelta "quale contenitore montare" (es. AccordionArgomenti
// vs PannelloArgomenti, ModaleCorrezione vs inline) sta in un punto solo,
// non sparsa in più componenti con la propria media query.
//
// Soglia indicativa 960px — non definitiva, da verificare in sviluppo su
// tablet e finestre ridimensionate a metà schermo, non solo sui due estremi
// telefono/desktop.

import { useEffect, useState } from "react";

const SOGLIA_DESKTOP = 960;

export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= SOGLIA_DESKTOP : true
  );

  useEffect(() => {
    function onResize() {
      setIsDesktop(window.innerWidth >= SOGLIA_DESKTOP);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return { isDesktop };
}
