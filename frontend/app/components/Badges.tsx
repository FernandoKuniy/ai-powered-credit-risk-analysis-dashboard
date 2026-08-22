/**
 * The two labels that show up on every screen: the grade the model derived, and what it did
 * about it.
 *
 * The grade used to be a seven-colour rainbow, one hue per letter, which made A look as
 * loud as G and meant the colour carried no information the letter didn't already. It is
 * three bands now: A and B are unremarkable and stay neutral, C and D are worth a look, and
 * E through G are the ones a person should actually stop on.
 *
 * Approve is green. Review is amber, not red: an application above the cut-off has not been
 * rejected, it has been handed to a human, and red would say something the model never said.
 */

const GRADE_STYLES: Record<string, string> = {
  A: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  B: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  D: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  E: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  F: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  G: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function RiskGradeBadge({ grade }: { grade: string }) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES.A;
  return (
    <span
      className={`inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {grade}
    </span>
  );
}

export function DecisionBadge({ decision }: { decision: string }) {
  const approve = decision === "approve";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        approve
          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {decision}
    </span>
  );
}
