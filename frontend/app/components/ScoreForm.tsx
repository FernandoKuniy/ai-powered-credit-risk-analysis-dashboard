"use client";
import { useState } from "react";
import type { ScorePayload } from "../../lib/api";
import { formatEnumLabel } from "../../lib/format";
import {
  EMP_LENGTH_MAX,
  FICO_MAX,
  FICO_MIN,
  REVOL_UTIL_MAX,
  type FieldErrors,
  hasErrors,
  validateScoreForm,
} from "../../lib/validation";
import Field, { fieldProps } from "./Field";

const PURPOSES = [
  "car",
  "credit_card",
  "debt_consolidation",
  "home_improvement",
  "house",
  "major_purchase",
  "medical",
  "moving",
  "other",
  "renewable_energy",
  "small_business",
  "vacation",
] as const;

/**
 * The eleven inputs the model was trained on.
 *
 * Uncontrolled, read out of FormData on submit, because eleven pieces of useState that only
 * matter once would be eleven things to keep in sync for no gain. Validation runs on submit
 * and a field's message clears as soon as that field is edited, which is handled by one
 * change listener on the form rather than one per input.
 */
export default function ScoreForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (payload: ScorePayload) => void;
  submitting: boolean;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: ScorePayload = {
      loan_amnt: Number(form.get("loan_amnt")),
      annual_inc: Number(form.get("annual_inc")),
      dti: Number(form.get("dti")),
      emp_length: Number(form.get("emp_length")),
      grade: String(form.get("grade")),
      term: String(form.get("term")),
      purpose: String(form.get("purpose")),
      home_ownership: String(form.get("home_ownership")),
      state: String(form.get("state")).trim().toUpperCase(),
      revol_util: Number(form.get("revol_util")),
      fico: Number(form.get("fico")),
    };

    const found = validateScoreForm(payload);
    setErrors(found);
    if (hasErrors(found)) return;

    onSubmit(payload);
  }

  // Typed against the form rather than the control: React hands this a ChangeEvent whose
  // `target` is the form, so the field being edited has to be read off the event target
  // itself. One listener here beats an onChange on each of eleven inputs.
  function clearFieldError(event: React.FormEvent<HTMLFormElement>) {
    const edited = event.target as HTMLInputElement | HTMLSelectElement;
    const name = edited.name as keyof FieldErrors;
    if (!name || !errors[name]) return;
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  return (
    <form onSubmit={handleSubmit} onChange={clearFieldError} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="loan_amnt"
          label="Loan amount"
          help="How much the borrower is asking for, in dollars."
          error={errors.loan_amnt}
        >
          <input
            {...fieldProps("loan_amnt", errors.loan_amnt)}
            type="number"
            inputMode="numeric"
            className="input tabular-nums"
            defaultValue={10000}
            min={1}
            step={1}
          />
        </Field>

        <Field
          id="annual_inc"
          label="Annual income"
          help="Everything the borrower earns in a year, before tax."
          error={errors.annual_inc}
        >
          <input
            {...fieldProps("annual_inc", errors.annual_inc)}
            type="number"
            inputMode="numeric"
            className="input tabular-nums"
            defaultValue={80000}
            min={1}
            step={1}
          />
        </Field>

        <Field
          id="dti"
          label="Debt-to-income"
          help="What share of the borrower's monthly income already goes to debt payments, as a percentage."
          error={errors.dti}
        >
          <input
            {...fieldProps("dti", errors.dti)}
            type="number"
            inputMode="decimal"
            className="input tabular-nums"
            defaultValue={12.5}
            min={0}
            step={0.01}
          />
        </Field>

        <Field
          id="emp_length"
          label="Years at current job"
          help={`How long the borrower has been with their current employer. The model tops out at ${EMP_LENGTH_MAX} years.`}
          error={errors.emp_length}
        >
          <input
            {...fieldProps("emp_length", errors.emp_length)}
            type="number"
            inputMode="numeric"
            className="input tabular-nums"
            defaultValue={4}
            min={0}
            max={EMP_LENGTH_MAX}
            step={1}
          />
        </Field>

        <Field
          id="revol_util"
          label="Credit card usage"
          help="How much of their available credit card limits the borrower is currently using, as a percentage. Known in credit files as revolving utilisation."
          error={errors.revol_util}
        >
          <input
            {...fieldProps("revol_util", errors.revol_util)}
            type="number"
            inputMode="decimal"
            className="input tabular-nums"
            defaultValue={35}
            min={0}
            max={REVOL_UTIL_MAX}
            step={0.1}
          />
        </Field>

        <Field
          id="fico"
          label="FICO score"
          help={`The borrower's credit score. Real FICO runs 300 to 850; this model accepts up to ${FICO_MAX}.`}
          error={errors.fico}
        >
          <input
            {...fieldProps("fico", errors.fico)}
            type="number"
            inputMode="numeric"
            className="input tabular-nums"
            defaultValue={720}
            min={FICO_MIN}
            max={FICO_MAX}
            step={1}
          />
        </Field>

        <Field
          id="grade"
          label="Lender-assigned grade"
          help="The grade a lender already put on this loan, A best through G worst. The model reads it as one input among eleven, then works out its own grade from the probability it predicts. The two often differ."
          error={errors.grade}
        >
          <select {...fieldProps("grade", errors.grade)} className="input" defaultValue="B">
            {"ABCDEFG".split("").map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </select>
        </Field>

        <Field id="term" label="Term" help="How long the borrower has to pay it back.">
          <select {...fieldProps("term")} className="input" defaultValue="36 months">
            <option>36 months</option>
            <option>60 months</option>
          </select>
        </Field>

        <Field
          id="purpose"
          label="Purpose"
          help="What the money is for. The model treats a small business loan very differently from a car loan."
          className="sm:col-span-2"
        >
          <select {...fieldProps("purpose")} className="input" defaultValue="debt_consolidation">
            {PURPOSES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {formatEnumLabel(purpose)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="home_ownership"
          label="Housing"
          help="Whether the borrower rents, owns outright, or has a mortgage."
        >
          <select {...fieldProps("home_ownership")} className="input" defaultValue="RENT">
            <option value="RENT">Rent</option>
            <option value="MORTGAGE">Mortgage</option>
            <option value="OWN">Own outright</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>

        <Field
          id="state"
          label="State"
          help="Two-letter code for where the borrower lives, like MA or CA."
          error={errors.state}
        >
          <input
            {...fieldProps("state", errors.state)}
            type="text"
            className="input uppercase"
            defaultValue="MA"
            maxLength={2}
            autoComplete="address-level1"
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Scoring…" : "Score this application"}
        </button>
        {hasErrors(errors) && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Check the highlighted fields above.
          </p>
        )}
      </div>
    </form>
  );
}
