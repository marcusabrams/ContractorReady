import { content, requirements, validateContent } from "../lib/content";
import { href } from "../lib/router";

/** Dev-only content review page. The route is not registered in production builds. */
export function DevPage() {
  const unreviewed = requirements.filter((r) => !r.reviewed);
  const errors = validateContent(content);

  return (
    <>
      <h1 tabIndex={-1}>Content review (dev only)</h1>
      <p>
        Content version <code>{content.version}</code>: {requirements.length} requirement(s), {unreviewed.length} unreviewed.
      </p>

      <h2>Schema problems</h2>
      {errors.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <h2>Unreviewed entries</h2>
      {unreviewed.length === 0 ? (
        <p>All entries are reviewed.</p>
      ) : (
        <ul>
          {unreviewed.map((r) => (
            <li key={r.id}>
              <a href={href.requirement(r.id)}>{r.id}</a> ({r.family})
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
