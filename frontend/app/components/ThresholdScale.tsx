import { formatPd, formatThreshold } from "../../lib/format";

/**
 * Where this application's probability of default sits against the approval cut-off.
 *
 * This is the one picture on the scoring screen, and it is here because the screen's actual
 * question is not "what is the PD" but "which side of the line is it on". Two numbers and a
 * sentence can say that; a position on a line says it before you have finished reading.
 *
 * The scale is not fixed at 0 to 100%. Real PDs from this model cluster in the low single
 * digits, so a full-width 0-100% axis would pin every marker to the left edge and show
 * nothing. It ends at whichever is larger: the 25% top of the simulator's range, or a little
 * past this application's own PD, so a genuinely high-risk application still lands on-scale.
 */
export default function ThresholdScale({ pd, threshold }: { pd: number; threshold: number }) {
  const scaleMax = Math.max(0.25, Math.ceil(pd * 120) / 100);
  const position = (value: number) => `${Math.min((value / scaleMax) * 100, 100)}%`;
  const approved = pd < threshold;

  return (
    <div>
      {/* The track carries no information the legend below doesn't repeat in words, so it is
          hidden from screen readers rather than announced as a pile of empty divs. */}
      <div aria-hidden className="relative h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-green-100 dark:bg-green-950"
          style={{ width: position(threshold) }}
        />
        <div
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-100"
          style={{ left: position(threshold) }}
        />
        <div
          className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--background)] ${
            approved ? "bg-green-600" : "bg-amber-600"
          }`}
          style={{ left: position(pd) }}
        />
      </div>

      <div aria-hidden className="mt-1.5 flex justify-between text-xs tabular-nums text-zinc-400">
        <span>0%</span>
        <span>{formatThreshold(scaleMax)}</span>
      </div>

      {/* A legend rather than labels floating over the track: at a 4% PD and a 5% cut-off the
          two markers sit almost on top of each other, and two overlapping labels there would
          be unreadable exactly when the comparison matters most. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-full ${approved ? "bg-green-600" : "bg-amber-600"}`}
          />
          This application, <span className="tabular-nums">{formatPd(pd)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-0.5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100"
          />
          Cut-off, <span className="tabular-nums">{formatThreshold(threshold)}</span>
        </span>
      </div>
    </div>
  );
}
