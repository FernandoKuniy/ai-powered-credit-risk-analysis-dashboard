import InfoIcon from "./InfoIcon";

/**
 * One labelled form control, with its definition on tap and its error underneath.
 *
 * Every field routes through here so that the label is always really associated with its
 * input, and so an error message is always wired to the control via aria-describedby rather
 * than just sitting near it in the layout.
 */
export default function Field({
  id,
  label,
  help,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="label flex items-center gap-1.5">
        {label}
        {help && <InfoIcon explanation={help} />}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** The props every control in a Field needs so the label and error actually attach to it. */
export function fieldProps(id: string, error?: string) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}
