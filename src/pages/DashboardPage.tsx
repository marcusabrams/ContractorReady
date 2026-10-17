import { useId } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { requirements } from "../lib/content";
import { familyProgress, formatDueDate, localToday, stillToAddress, summarize } from "../lib/dashboard";
import { useProgress } from "../lib/progress";
import { href } from "../lib/router";
import { STATUSES } from "../lib/types";

function Meter({ value }: { value: number }) {
  // Decorative: the percentage is always printed next to the bar.
  return (
    <span className="meter" aria-hidden="true">
      <span className="meter-fill" style={{ width: `${value}%` }} />
    </span>
  );
}

export function DashboardPage() {
  const { data } = useProgress();
  const ids = useId();
  const summary = summarize(requirements, data);
  const families = familyProgress(requirements, data);
  const today = localToday();
  const open = stillToAddress(requirements, data, today);
  const overdueCount = open.filter((i) => i.overdue).length;
  const started = Object.keys(data.progress).length > 0;

  return (
    <>
      <h1 tabIndex={-1}>{data.org.name ? `${data.org.name}: NIST 800-171 progress` : "NIST 800-171 progress"}</h1>

      <div className="notice notice-info">
        <p>
          <strong>Please note:</strong> this is a self-tracking aid. It is not an assessment, it doesn't guarantee
          compliance, and it isn't legal advice.
        </p>
      </div>

      {!started && (
        <section className="card" aria-labelledby={`${ids}-start`}>
          <h2 id={`${ids}-start`}>Get started</h2>
          <ol>
            <li>
              Open the <a href={href.requirements()}>requirements list</a> and pick a requirement.
            </li>
            <li>Read the plain-English explanation, then set a status, owner, and due date.</li>
            <li>
              Progress saves automatically in this browser. Use <a href={href.data()}>Backup &amp; data</a> to export a
              copy or move it to another computer.
            </li>
          </ol>
          <p>No sign-up, and nothing leaves your browser.</p>
        </section>
      )}

      <section className="overall" aria-labelledby={`${ids}-overall`}>
        <h2 id={`${ids}-overall`} className="visually-hidden">
          Overall progress
        </h2>
        <p className="hero">
          <span className="hero-value">{summary.percent}%</span>
          <span className="hero-label">complete</span>
        </p>
        <Meter value={summary.percent} />
        <p className="muted">
          {summary.addressed} of {summary.total} requirements are implemented or not applicable.
        </p>
        <ul className="stat-list" aria-label="Requirements by status">
          {STATUSES.map((s) => (
            <li key={s}>
              <a className="stat" href={href.requirements(new URLSearchParams({ status: s }))}>
                <span className="stat-num">{summary.counts[s]}</span>
                <StatusBadge status={s} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${ids}-families`}>
        <h2 id={`${ids}-families`}>Progress by family</h2>
        <table className="family-table">
          <thead>
            <tr>
              <th scope="col">Family</th>
              <th scope="col">Addressed</th>
              <th scope="col">Progress</th>
            </tr>
          </thead>
          <tbody>
            {families.map((f) => (
              <tr key={f.family}>
                <th scope="row">
                  <a href={href.requirements(new URLSearchParams({ family: f.family }))}>{f.family}</a>
                </th>
                <td className="num">
                  {f.addressed} of {f.total}
                  {f.inProgress > 0 && <span className="muted small"> · {f.inProgress} in progress</span>}
                </td>
                <td>
                  <span className="meter-cell">
                    <Meter value={f.percent} />
                    <span className="num">{f.percent}%</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby={`${ids}-open`}>
        <h2 id={`${ids}-open`}>
          Still to address <span className="muted">({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <p className="notice notice-success">Every requirement is marked implemented or not applicable.</p>
        ) : (
          <>
            <p className="muted">
              Sorted by due date, soonest first.
              {overdueCount > 0 && ` ${overdueCount} overdue.`}
            </p>
            <ul className="req-list">
              {open.map(({ requirement: r, entry: e, overdue }) => (
                <li key={r.id}>
                  <a className="req-row" href={href.requirement(r.id)}>
                    <span className="req-id">{r.id}</span>
                    <span className="req-text">{r.text}</span>
                    <span className="req-meta">
                      <StatusBadge status={e.status} />
                      {e.owner && <span className="owner">{e.owner}</span>}
                      {e.dueDate && (
                        <span className={overdue ? "due due-overdue" : "due"}>
                          {overdue ? (
                            <>
                              <span aria-hidden="true">⚠ </span>Overdue: {formatDueDate(e.dueDate)}
                            </>
                          ) : (
                            <>Due {formatDueDate(e.dueDate)}</>
                          )}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
