import type { ScorePayload } from "./api";

/**
 * Client-side rules that mirror backend/schemas.py exactly.
 *
 * They exist to catch a typo before a round trip, not to be the real gate: the server
 * validates the same bounds and is the one that counts. Where the server has no upper bound
 * (DTI, income) there is none here either, so this can never reject a request the model would
 * have happily scored.
 */
export const FICO_MIN = 300;
export const FICO_MAX = 900;
export const EMP_LENGTH_MAX = 40;
export const REVOL_UTIL_MAX = 150;

export type FieldErrors = Partial<Record<keyof ScorePayload, string>>;

function requireNumber(value: number, label: string): string | null {
  if (Number.isNaN(value)) return `${label} needs to be a number.`;
  return null;
}

export function validateScoreForm(values: ScorePayload): FieldErrors {
  const errors: FieldErrors = {};

  const loanAmnt = requireNumber(values.loan_amnt, "Loan amount");
  if (loanAmnt) errors.loan_amnt = loanAmnt;
  else if (values.loan_amnt <= 0) errors.loan_amnt = "Loan amount has to be more than $0.";
  else if (!Number.isInteger(values.loan_amnt))
    errors.loan_amnt = "Loan amount has to be a whole number of dollars.";

  const annualInc = requireNumber(values.annual_inc, "Annual income");
  if (annualInc) errors.annual_inc = annualInc;
  else if (values.annual_inc <= 0) errors.annual_inc = "Annual income has to be more than $0.";

  const dti = requireNumber(values.dti, "DTI");
  if (dti) errors.dti = dti;
  else if (values.dti < 0) errors.dti = "DTI can't be negative.";

  const empLength = requireNumber(values.emp_length, "Employment length");
  if (empLength) errors.emp_length = empLength;
  else if (!Number.isInteger(values.emp_length))
    errors.emp_length = "Employment length has to be a whole number of years.";
  else if (values.emp_length < 0 || values.emp_length > EMP_LENGTH_MAX)
    errors.emp_length = `Employment length has to be between 0 and ${EMP_LENGTH_MAX} years.`;

  const revolUtil = requireNumber(values.revol_util, "Revolving utilization");
  if (revolUtil) errors.revol_util = revolUtil;
  else if (values.revol_util < 0 || values.revol_util > REVOL_UTIL_MAX)
    errors.revol_util = `Revolving utilization has to be between 0 and ${REVOL_UTIL_MAX}%.`;

  const fico = requireNumber(values.fico, "FICO");
  if (fico) errors.fico = fico;
  else if (!Number.isInteger(values.fico)) errors.fico = "FICO has to be a whole number.";
  else if (values.fico < FICO_MIN || values.fico > FICO_MAX)
    errors.fico = `FICO has to be between ${FICO_MIN} and ${FICO_MAX}.`;

  // The server upper-cases and checks this, so accepting lower case here and normalising on
  // submit keeps "ma" from being a rejection the person has to go back and fix.
  if (!/^[A-Za-z]{2}$/.test(values.state.trim()))
    errors.state = "State has to be a two-letter code, like MA or CA.";

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
