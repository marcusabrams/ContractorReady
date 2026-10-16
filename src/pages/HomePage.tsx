import { requirements } from "../lib/content";
import { entryFor, useProgress } from "../lib/progress";
import { href } from "../lib/router";
import { STATUSES, STATUS_LABELS } from "../lib/types";

// Placeholder home page. The full dashboard (percent complete, per-family
// progress, "still to address") replaces the summary below in build step 4.
export function HomePage() {
  const { data } = useProgress();
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of requirements) counts[entryFor(data, r.id).status]++;

  return (
    <>
      <h1 tabIndex={-1}>{data.org.name ? `${data.org.name}: NIST 800-171 progress` : "NIST 800-171 Tracker"}</h1>
      <p className="lede">
        A free, private way for small government contractors to understand the NIST SP 800-171 Rev 2 requirements,
        track what's done, and see what's left. No sign-up, and nothing leaves your browser.
      </p>

      <div className="notice notice-info">
        <p>
          <strong>Please note:</strong> this is a self-tracking aid. It is not an assessment, it doesn't guarantee
          compliance, and it isn't legal advice.
        </p>
      </div>

      <h2>Get started</h2>
      <ol>
        <li>
          Open the <a href={href.requirements()}>requirements list</a> and pick a requirement.
        </li>
        <li>Read the plain-English explanation, then set a status, owner, and due date.</li>
        <li>
          Your progress saves automatically in this browser. Use <a href={href.data()}>Backup &amp; data</a> to export a
          copy or move it to another computer.
        </li>
      </ol>

      <h2>Status so far</h2>
      <ul className="stat-list">
        {STATUSES.map((s) => (
          <li key={s}>
            <span className="stat-num">{counts[s]}</span> {STATUS_LABELS[s]}
          </li>
        ))}
      </ul>
      <p>
        <a className="btn" href={href.requirements()}>
          Browse requirements
        </a>
      </p>
    </>
  );
}
