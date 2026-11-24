import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLocation } from "react-router-dom";
import styles from "./ScrollToTop.module.scss";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    function update() {
      const viewport = window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;
      setVisible(
        pageHeight > viewport * 1.5 &&
          window.scrollY > Math.min(400, viewport / 2),
      );
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return visible ? (
    <button
      type="button"
      className={styles.button}
      aria-label="Наверх"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        })
      }
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  ) : null;
}
