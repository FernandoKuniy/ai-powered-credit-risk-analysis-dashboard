"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Jargon on tap. DTI, revolving utilisation and SHAP all get a plain-English definition
 * behind a small "i", so the default reading of a screen stays free of terms nobody has to
 * know in order to use it.
 *
 * The tooltip goes in a portal because its triggers sit inside table cells and cards with
 * their own overflow, which would otherwise clip it. Position is worked out after the panel
 * has rendered and been measured: the previous version subtracted a hardcoded 100px for the
 * panel's height, which put long definitions off the top of the window.
 */
export default function InfoIcon({
  explanation,
  className = "",
}: {
  explanation: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Measure, then place. Runs before paint so the panel never appears in the wrong spot and
  // then jumps.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current.getBoundingClientRect();
    const margin = 8;

    let left = trigger.left + trigger.width / 2 - panel.width / 2;
    left = Math.min(left, window.innerWidth - panel.width - margin);
    left = Math.max(left, margin);

    // Above by default, because these triggers usually sit on a line of text with content
    // below it. Flip under the trigger only when there genuinely isn't room above.
    let top = trigger.top - panel.height - margin;
    if (top < margin) top = trigger.bottom + margin;

    setCoords({ top, left });
  }, [open, explanation]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Any scroll invalidates the measured position, and re-measuring on every frame is more
    // machinery than a definition popover is worth.
    const onScroll = () => setOpen(false);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setCoords(null);
  }, [open]);

  const panel = open ? (
    <div
      ref={panelRef}
      id={tooltipId}
      role="tooltip"
      style={{
        position: "fixed",
        top: coords?.top ?? 0,
        left: coords?.left ?? 0,
        // Hidden until measured, so the first frame doesn't flash in the top-left corner.
        visibility: coords ? "visible" : "hidden",
      }}
      className="tooltip-enter z-50 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
    >
      {explanation}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="What this means"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-medium leading-none text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-100 ${className}`}
      >
        i
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
