import { useId, useRef, useState } from "react";
import { changesSince, formatTimestamp, latestUpdate, mergeData, type MergeSummary } from "../lib/backup";
import { compareIds, getRequirement } from "../lib/content";
import { useProgress } from "../lib/progress";
import { href } from "../lib/router";
import { MAX_IMPORT_BYTES, parseDataText, serializeForExport } from "../lib/storage";
import type { AppData } from "../lib/types";

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function downloadJson(filename: string, text: string) {
  // A blob: URL is created and read locally; nothing is uploaded anywhere.
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const countTracked = (d: AppData) => Object.keys(d.progress).length;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface PendingImport {
  name: string;
  data: AppData;
  exportedAt?: string;
  /** What a merge would do, computed against the data at the time the file was chosen. */
  preview: MergeSummary;
}

type ImportResult =
  | { mode: "merge"; name: string; updated: string[]; kept: number }
  | { mode: "replace"; name: string };

/** Requirement IDs as links where the requirement exists, plain text otherwise. */
function IdLinks({ ids }: { ids: string[] }) {
  return (
    <ul className="inline-list id-list">
      {ids.map((id) => (
        <li key={id}>{getRequirement(id) ? <a href={href.requirement(id)}>{id}</a> : id}</li>
      ))}
    </ul>
  );
}

function PreviewGroup({ title, ids }: { title: string; ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="preview-group">
      <h4>
        {title} <span className="muted">({ids.length})</span>
      </h4>
      <p className="id-text">{ids.join(", ")}</p>
    </div>
  );
}

export function DataPage() {
  const { data, setOrgName, replaceAll, resetAll, storageAvailable, lastExport, recordExport } = useProgress();
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const asOf = latestUpdate(data);
  const unexported = changesSince(data, lastExport);

  function onExport() {
    const slug = data.org.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const now = new Date().toISOString();
    downloadJson(`n171tracker-${slug ? slug + "-" : ""}${todayStamp()}.json`, serializeForExport(data, now));
    recordExport(now);
    setMessage("Backup downloaded. Keep it somewhere safe.");
  }

  async function onFileChosen(file: File | undefined) {
    setImportError(null);
    setMessage(null);
    setImportResult(null);
    setPendingImport(null);
    // Clear the input so choosing the same file again still fires onChange.
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError("Import failed: that file is too large to be a tracker backup. Your current data was not changed.");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError("Import failed: that file couldn't be read. Your current data was not changed.");
      return;
    }
    const result = parseDataText(text);
    if (!result.ok) {
      setImportError(`Import failed: ${result.error} Your current data was not changed.`);
    } else {
      setPendingImport({
        name: file.name,
        data: result.data,
        exportedAt: result.exportedAt,
        preview: mergeData(data, result.data).summary,
      });
    }
  }

  function confirmMerge() {
    if (!pendingImport) return;
    // Merge against the data as it is now, in case it changed while the preview was open.
    const { data: merged, summary } = mergeData(data, pendingImport.data);
    replaceAll(merged);
    setImportResult({
      mode: "merge",
      name: pendingImport.name,
      updated: [...summary.fileNewer, ...summary.onlyInFile].sort(compareIds),
      kept: summary.yoursNewer.length + summary.tied.length + summary.onlyHere.length,
    });
    setPendingImport(null);
  }

  function confirmReplace() {
    if (!pendingImport) return;
    replaceAll(pendingImport.data);
    setImportResult({ mode: "replace", name: pendingImport.name });
    setPendingImport(null);
  }

  function doReset() {
    resetAll();
    setConfirmReset(false);
    setMessage("All data was deleted from this browser.");
  }

  return (
    <>
      <h1 tabIndex={-1}>Backup &amp; data</h1>
      <p className="lede">
        Your progress is saved only in this browser{storageAvailable ? "" : " (right now, not at all, because storage is blocked)"}.
        Nothing is sent to a server. Export a backup regularly, and use it to move your progress to another browser or
        computer.
      </p>

      {message && (
        <p className="notice notice-success" role="status">
          {message}
        </p>
      )}

      <section className="card">
        <h2>Organization</h2>
        <div className="field">
          <label htmlFor={`${ids}-org`}>Organization name</label>
          <input
            id={`${ids}-org`}
            type="text"
            value={data.org.name}
            autoComplete="organization"
            onChange={(e) => setOrgName(e.target.value)}
          />
          <p className="muted small">Shown on your printed summary.</p>
        </div>
      </section>

      <section className="card">
        <h2>Export backup</h2>
        <dl className="backup-status">
          <div>
            <dt>Progress as of</dt>
            <dd>{asOf ? formatTimestamp(asOf) : "No progress recorded yet"}</dd>
          </div>
          <div>
            <dt>Last backup</dt>
            <dd>
              {lastExport ? formatTimestamp(lastExport) : "Never"} · {plural(unexported, "change", "changes")} since
            </dd>
          </div>
        </dl>
        <p>Downloads a JSON file with your organization name and the progress for {countTracked(data)} requirement(s).</p>
        <button type="button" className="btn" onClick={onExport}>
          Export backup
        </button>
      </section>

      <section className="card">
        <h2>Import backup</h2>
        <p>
          Restores progress from a backup file. You'll see what would change and choose to merge or replace before
          anything happens.
        </p>
        <div className="field">
          <label htmlFor={`${ids}-import`}>Backup file (.json)</label>
          <input
            id={`${ids}-import`}
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onFileChosen(e.target.files?.[0])}
          />
        </div>
        {importError && (
          <p className="notice notice-error" role="alert">
            {importError}
          </p>
        )}
        {pendingImport && (
          <div className="confirm-box import-preview" role="group" aria-labelledby={`${ids}-import-confirm`}>
            <h3 id={`${ids}-import-confirm`}>Import {pendingImport.name}?</h3>
            <p className="muted">
              {pendingImport.exportedAt
                ? `Exported ${formatTimestamp(pendingImport.exportedAt)}`
                : "Export date not recorded (made before export dates were added)"}{" "}
              · {plural(countTracked(pendingImport.data), "tracked requirement", "tracked requirements")}
              {pendingImport.data.org.name.trim() ? ` · Organization "${pendingImport.data.org.name}"` : ""}
            </p>
            <PreviewGroup title="File is newer (merge uses the file's)" ids={pendingImport.preview.fileNewer} />
            <PreviewGroup title="Yours is newer (merge keeps yours)" ids={pendingImport.preview.yoursNewer} />
            <PreviewGroup title="Only in file (merge adds them)" ids={pendingImport.preview.onlyInFile} />
            <PreviewGroup title="Only here (merge keeps them)" ids={pendingImport.preview.onlyHere} />
            {pendingImport.preview.fileNewer.length + pendingImport.preview.onlyInFile.length === 0 && (
              <p>Nothing in this file is newer than your data, so merging won't change any requirement.</p>
            )}
            {pendingImport.preview.tied.length > 0 && (
              <p className="muted small">
                {plural(pendingImport.preview.tied.length, "requirement has", "requirements have")} the same change time in
                both; merge keeps yours.
              </p>
            )}
            {pendingImport.preview.orgName === "fromFile" && (
              <p className="small">Merge sets the organization name to "{pendingImport.data.org.name}" from the file.</p>
            )}
            <p className="small">
              <strong>Replace everything</strong> discards your current data ({plural(countTracked(data), "tracked requirement", "tracked requirements")})
              and uses the file's exactly.
            </p>
            <div className="button-row">
              <button type="button" className="btn" onClick={confirmMerge} autoFocus>
                Merge (newest change wins)
              </button>
              <button type="button" className="btn btn-secondary" onClick={confirmReplace}>
                Replace everything
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPendingImport(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {importResult && (
          <div className="notice notice-success" role="status">
            {importResult.mode === "replace" ? (
              <p>Replaced your data with {importResult.name}.</p>
            ) : (
              <>
                <p>
                  Merged {importResult.name}: {plural(importResult.updated.length, "entry", "entries")} updated,{" "}
                  {plural(importResult.kept, "entry", "entries")} kept.
                </p>
                {importResult.updated.length > 0 && (
                  <>
                    <p className="small">Updated requirements:</p>
                    <IdLinks ids={importResult.updated} />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="card card-danger">
        <h2>Reset all data</h2>
        <p>Permanently deletes your organization name and all progress from this browser. Export a backup first if you might need it.</p>
        {!confirmReset ? (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            Reset all data…
          </button>
        ) : (
          <div className="confirm-box" role="group" aria-labelledby={`${ids}-reset-confirm`}>
            <p id={`${ids}-reset-confirm`}>
              <strong>Delete everything?</strong> This can't be undone.
            </p>
            <div className="button-row">
              <button type="button" className="btn btn-danger" onClick={doReset}>
                Yes, delete all data
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(false)} autoFocus>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
