import { useId, useRef, useState } from "react";
import { useProgress } from "../lib/progress";
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

export function DataPage() {
  const { data, setOrgName, replaceAll, resetAll, storageAvailable } = useProgress();
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; data: AppData } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function onExport() {
    const slug = data.org.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    downloadJson(`n171tracker-${slug ? slug + "-" : ""}${todayStamp()}.json`, serializeForExport(data));
    setMessage("Backup downloaded. Keep it somewhere safe.");
  }

  async function onFileChosen(file: File | undefined) {
    setImportError(null);
    setMessage(null);
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
      setPendingImport({ name: file.name, data: result.data });
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    replaceAll(pendingImport.data);
    setMessage(`Imported ${pendingImport.name}.`);
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
        <p>Downloads a JSON file with your organization name and the progress for {countTracked(data)} requirement(s).</p>
        <button type="button" className="btn" onClick={onExport}>
          Export backup
        </button>
      </section>

      <section className="card">
        <h2>Import backup</h2>
        <p>Restores progress from a backup file. You'll be asked to confirm before anything is replaced.</p>
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
          <div className="confirm-box" role="group" aria-labelledby={`${ids}-import-confirm`}>
            <p id={`${ids}-import-confirm`}>
              Replace your current data ({countTracked(data)} tracked requirement(s)) with <strong>{pendingImport.name}</strong>{" "}
              ({countTracked(pendingImport.data)} tracked requirement(s)
              {pendingImport.data.org.name ? `, organization "${pendingImport.data.org.name}"` : ""})?
            </p>
            <div className="button-row">
              <button type="button" className="btn" onClick={confirmImport}>
                Replace my data
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPendingImport(null)} autoFocus>
                Cancel
              </button>
            </div>
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
