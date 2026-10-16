import { useId, useMemo } from "react";
import { getRequirement, requirements } from "../lib/content";
import { useProgress } from "../lib/progress";
import { href } from "../lib/router";
import { STATUSES, STATUS_LABELS, type Status } from "../lib/types";
import { NotFoundPage } from "./NotFoundPage";
import { lastRequirementsQuery } from "./RequirementsPage";

export function RequirementDetailPage({ id }: { id: string }) {
  const req = getRequirement(id);
  const { data, getEntry, updateEntry } = useProgress();
  const ids = useId();

  const owners = useMemo(
    () => [...new Set(Object.values(data.progress).map((e) => e.owner.trim()).filter(Boolean))].sort(),
    [data.progress],
  );

  if (!req) return <NotFoundPage message={`There is no requirement with ID "${id}".`} />;

  const entry = getEntry(req.id);
  const index = requirements.indexOf(req);
  const prev = requirements[index - 1];
  const next = requirements[index + 1];

  return (
    <article className="detail">
      <p>
        <a href={href.requirements(lastRequirementsQuery)}>← Back to requirements</a>
      </p>
      <p className="eyebrow">{req.family}</p>
      <h1 tabIndex={-1}>Requirement {req.id}</h1>

      <section aria-labelledby={`${ids}-official`}>
        <h2 id={`${ids}-official`} className="h-small">
          Official text
        </h2>
        <blockquote className="official-text">{req.text}</blockquote>
      </section>

      <div className="detail-grid">
        <div className="detail-content">
          <section>
            <h2>In plain English</h2>
            <p>{req.plainEnglish}</p>
          </section>
          <section>
            <h2>Why it matters</h2>
            <p>{req.whyItMatters}</p>
          </section>
          <section>
            <h2>Examples</h2>
            <ul>
              {req.examples.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Typical evidence</h2>
            <p className="muted">Documents or records an assessor commonly asks to see.</p>
            <ul>
              {req.evidence.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Assessment objectives</h2>
            <p className="muted">From NIST SP 800-171A.</p>
            <p>{req.objectives.join(", ")}</p>
          </section>
          {req.relatedIds.length > 0 && (
            <section>
              <h2>Related requirements</h2>
              <ul className="inline-list">
                {req.relatedIds.map((rid) => (
                  <li key={rid}>
                    <a href={href.requirement(rid)}>{rid}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="tracking-panel" aria-labelledby={`${ids}-tracking`}>
          <h2 id={`${ids}-tracking`}>Your progress</h2>
          <p className="muted small">Changes save automatically in this browser.</p>

          <fieldset className="status-group">
            <legend>Status</legend>
            {STATUSES.map((s) => (
              <label key={s} className="radio">
                <input
                  type="radio"
                  name={`${ids}-status`}
                  value={s}
                  checked={entry.status === s}
                  onChange={() => updateEntry(req.id, { status: s as Status })}
                />
                {STATUS_LABELS[s]}
              </label>
            ))}
          </fieldset>

          <div className="field">
            <label htmlFor={`${ids}-owner`}>Owner</label>
            <input
              id={`${ids}-owner`}
              type="text"
              list={`${ids}-owners`}
              value={entry.owner}
              placeholder="Name or role, e.g. Office manager"
              autoComplete="off"
              onChange={(e) => updateEntry(req.id, { owner: e.target.value })}
            />
            <datalist id={`${ids}-owners`}>
              {owners.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label htmlFor={`${ids}-due`}>Due date</label>
            <input
              id={`${ids}-due`}
              type="date"
              value={entry.dueDate ?? ""}
              onChange={(e) => updateEntry(req.id, { dueDate: e.target.value || null })}
            />
          </div>

          <div className="field">
            <label htmlFor={`${ids}-notes`}>Notes</label>
            <p id={`${ids}-notes-warning`} className="field-warning">
              Don't enter CUI or sensitive details here.
            </p>
            <textarea
              id={`${ids}-notes`}
              rows={6}
              value={entry.notes}
              aria-describedby={`${ids}-notes-warning`}
              onChange={(e) => updateEntry(req.id, { notes: e.target.value })}
            />
          </div>

          {entry.updatedAt && (
            <p className="muted small">Last updated {new Date(entry.updatedAt).toLocaleString()}</p>
          )}
        </aside>
      </div>

      <nav className="pager" aria-label="Requirement navigation">
        {prev ? <a href={href.requirement(prev.id)}>← {prev.id}</a> : <span />}
        {next ? <a href={href.requirement(next.id)}>{next.id} →</a> : <span />}
      </nav>
    </article>
  );
}
