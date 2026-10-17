import { formatTimestamp, latestUpdate } from "../lib/backup";
import { groupByFamily } from "../lib/content";
import { formatDueDate, summarize } from "../lib/dashboard";
import { entryFor } from "../lib/progress";
import { STATUSES, STATUS_LABELS, type AppData, type Requirement } from "../lib/types";

const EMPTY = "—";

interface Props {
  data: AppData;
  requirements: Requirement[];
  /** YYYY-MM-DD; passed in so the output is deterministic in tests. */
  generatedOn: string;
}

/** The printable summary: everything a reader needs on paper, with no interactive parts. */
export function PrintSummary({ data, requirements, generatedOn }: Props) {
  const summary = summarize(requirements, data);
  const orgName = data.org.name.trim();
  const asOf = latestUpdate(data);

  return (
    <div className="print-summary">
      <header className="print-head">
        <p className="eyebrow">NIST SP 800-171 Rev 2 · Self-tracking summary</p>
        <h2 className="print-org">{orgName || "Organization not set"}</h2>
        <p className="muted">
          Generated {formatDueDate(generatedOn)} · {asOf ? `Progress as of ${formatTimestamp(asOf)}` : "No progress recorded yet"}
        </p>
      </header>

      <p className="print-disclaimer">
        <strong>This is a self-tracking aid, not an assessment, a compliance guarantee, or legal advice.</strong> Statuses
        are self-reported by the organization and have not been verified.
      </p>

      <section className="print-overview" aria-label="Overview">
        <p className="print-percent">
          <strong>{summary.percent}% complete</strong>: {summary.addressed} of {summary.total} requirements are
          implemented or not applicable.
        </p>
        <table className="print-counts">
          <tbody>
            {STATUSES.map((s) => (
              <tr key={s}>
                <th scope="row">{STATUS_LABELS[s]}</th>
                <td className="num">{summary.counts[s]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {groupByFamily(requirements).map(({ family, items }) => (
        <section key={family} className="print-family">
          <h3>{family}</h3>
          <table className="print-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Requirement</th>
                <th scope="col">Status</th>
                <th scope="col">Owner</th>
                <th scope="col">Due</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const e = entryFor(data, r.id);
                return (
                  <tr key={r.id} data-req-id={r.id}>
                    <th scope="row" className="num">
                      {r.id}
                    </th>
                    <td>{r.text}</td>
                    <td>{STATUS_LABELS[e.status]}</td>
                    <td>{e.owner.trim() || EMPTY}</td>
                    <td>{e.dueDate ? formatDueDate(e.dueDate) : EMPTY}</td>
                    <td className="print-notes">{e.notes.trim() || EMPTY}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
