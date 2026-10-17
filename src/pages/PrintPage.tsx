import { PrintSummary } from "../components/PrintSummary";
import { requirements } from "../lib/content";
import { localToday } from "../lib/dashboard";
import { useProgress } from "../lib/progress";
import { href } from "../lib/router";

export function PrintPage() {
  const { data } = useProgress();

  return (
    <>
      <div className="no-print">
        <h1 tabIndex={-1}>Print summary</h1>
        <p className="lede">
          A one-document snapshot of your progress. Use your browser's print dialog and choose "Save as PDF" to keep a
          copy. Only the summary below is printed.
        </p>
        {!data.org.name.trim() && (
          <p className="notice notice-info">
            Tip: add your organization name on the <a href={href.data()}>Backup &amp; data</a> page so it appears at the top.
          </p>
        )}
        <p>
          <button type="button" className="btn" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </p>
      </div>
      <PrintSummary data={data} requirements={requirements} generatedOn={localToday()} />
    </>
  );
}
