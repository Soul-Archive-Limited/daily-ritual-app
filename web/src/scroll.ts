import { useEffect, useRef } from 'react';

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Writes how far an element has travelled through the viewport into its `--p` CSS variable (0 → 1),
 * once per frame while scrolling, without re-rendering. `sticky` measures progress through a tall
 * section with a sticky child instead. Reduced motion pins it at 1.
 */
export function useScrollP<T extends HTMLElement>(mode: 'pass' | 'sticky' | 'enter' = 'pass') {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', '1');
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      const p =
        mode === 'sticky'
          ? clamp(-r.top / Math.max(1, r.height - vh))
          : mode === 'enter'
            ? clamp((vh - r.top) / (vh * 0.75))
            : clamp((vh - r.top) / (vh + r.height));
      el.style.setProperty('--p', p.toFixed(4));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => {
      removeEventListener('scroll', on);
      removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, [mode]);
  return ref;
}

/** Adds the `in` class once the element scrolls into view (for one-off reveal animations). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('in');
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** A gentle 3D tilt that follows the pointer (mouse and pen only). */
export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
    };
    const leave = () => {
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [max]);
  return ref;
}
