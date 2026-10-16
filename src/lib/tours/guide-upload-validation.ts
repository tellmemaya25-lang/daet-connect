import {
  inspectOperatorUpload,
  MAX_OPERATOR_FILE_BYTES,
  type DetectedUpload,
} from "@/lib/tours/operator-upload-validation";

export const MAX_GUIDE_ID_DOCUMENT_BYTES = MAX_OPERATOR_FILE_BYTES;
export type GuideIdDocument = DetectedUpload;

/** Guide ID files use the same signature, format, and per-file limits as operator documents. */
export function inspectGuideIdDocument(file: File) {
  return inspectOperatorUpload(file, "dtiDocument");
}
