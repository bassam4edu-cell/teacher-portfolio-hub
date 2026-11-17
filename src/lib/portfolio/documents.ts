/** Explicitly published standalone originals, separate from activity-report publications. */
export type PublicDocument = {
  id: string;
  title: string;
  criterion: number;
  period_id: string;
  asset_id: string;
  name: string;
  mime: "application/pdf";
  sha256: string;
  size: number;
  pages: number | null;
};
