import { useId, useMemo } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { groupByFamily, requirements } from "../lib/content";
import { entryFor, listOwners, useProgress } from "../lib/progress";
import { href } from "../lib/router";
import { STATUSES, STATUS_LABELS, type AppData, type Requirement } from "../lib/types";

const UNASSIGNED = "__unassigned__";

/** Remembers the last filter query so "Back to requirements" returns to the same view. */
export let lastRequirementsQuery = new URLSearchParams();

export function matchesSearch(r: Requirement, notes: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  if (r.id.startsWith(t)) return true;
  return [r.id, r.family, r.text, r.plainEnglish, notes].some((s) => s.toLowerCase().includes(t));
}

export function filterRequirements(
  list: Requirement[],
  data: AppData,
  { q, status, owner }: { q: string; status: string; owner: string },
): Requirement[] {
  return list.filter((r) => {
    const e = entryFor(data, r.id);
    if (status && e.status !== status) return false;
    if (owner === UNASSIGNED ? e.owner.trim() !== "" : owner && e.owner.trim() !== owner) return false;
    return matchesSearch(r, e.notes, q);
  });
}

export function RequirementsPage({ query }: { query: URLSearchParams }) {
  const { data } = useProgress();
  const ids = useId();
  lastRequirementsQuery = query;

  const q = query.get("q") ?? "";
  const status = query.get("status") ?? "";
  const owner = query.get("owner") ?? "";

  const owners = useMemo(() => listOwners(data), [data]);

  const filtered = filterRequirements(requirements, data, { q, status, owner });
  const groups = groupByFamily(filtered);
  const filtersActive = Boolean(q || status || owner);

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(query);
    if (value) next.set(name, value);
    else next.delete(name);
    // replace() so typing in the search box doesn't add one history entry per keystroke.
    window.location.replace(href.requirements(next));
  }

  return (
    <>
      <h1 tabIndex={-1}>Requirements</h1>
      <p className="lede">
        NIST SP 800-171 Rev 2 requirements, grouped by family. Open one to read what it means and record your progress.
      </p>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor={`${ids}-q`}>Search by ID or keyword</label>
          <input
            id={`${ids}-q`}
            type="search"
            value={q}
            placeholder="e.g. 3.5.3 or password"
            onChange={(e) => setParam("q", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${ids}-status`}>Status</label>
          <select id={`${ids}-status`} value={status} onChange={(e) => setParam("status", e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-owner`}>Owner</label>
          <select id={`${ids}-owner`} value={owner} onChange={(e) => setParam("owner", e.target.value)}>
            <option value="">All owners</option>
            <option value={UNASSIGNED}>Unassigned</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        {filtersActive && (
          <button type="button" className="btn btn-secondary" onClick={() => window.location.replace(href.requirements())}>
            Clear filters
          </button>
        )}
      </form>

      <p className="result-count" role="status" aria-live="polite">
        Showing {filtered.length} of {requirements.length} requirements
      </p>

      {groups.length === 0 && <p>No requirements match these filters.</p>}

      {groups.map(({ family, items }) => (
        <section key={family} className="family-group" aria-labelledby={`${ids}-${family}`}>
          <h2 id={`${ids}-${family}`}>
            {family} <span className="muted">({items.length})</span>
          </h2>
          <ul className="req-list">
            {items.map((r) => {
              const e = entryFor(data, r.id);
              return (
                <li key={r.id}>
                  <a className="req-row" href={href.requirement(r.id)}>
                    <span className="req-id">{r.id}</span>
                    <span className="req-text">{r.text}</span>
                    <span className="req-meta">
                      <StatusBadge status={e.status} />
                      {e.owner && <span className="owner">{e.owner}</span>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
