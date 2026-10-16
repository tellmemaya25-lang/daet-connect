export type GuideActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
  signedUrl?: string;
};

export type GuideQrPreviewResult = {
  status: "success" | "error";
  message: string;
  guideId?: string;
  qrDataUrl?: string;
};

export const INITIAL_GUIDE_SUBMISSION_STATE: GuideActionState = {
  status: "idle",
  message: "",
};

export const INITIAL_GUIDE_REVIEW_STATE: GuideActionState = {
  status: "idle",
  message: "",
};

export const INITIAL_GUIDE_DOCUMENT_LINK_STATE: GuideActionState = {
  status: "idle",
  message: "",
};
