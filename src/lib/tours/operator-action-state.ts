export type OperatorActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export const INITIAL_OPERATOR_SUBMISSION_STATE: OperatorActionState = {
  status: "idle",
  message: "",
};

export const INITIAL_OPERATOR_REVIEW_STATE: OperatorActionState = {
  status: "idle",
  message: "",
};
