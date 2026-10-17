import { href } from "../lib/router";

export function AboutPage() {
  return (
    <article className="prose">
      <h1 tabIndex={-1}>About this tracker</h1>
      <p className="lede">
        A free tool that helps small government contractors understand the NIST SP 800-171 Revision 2 security
        requirements, keep track of what they've done, and see what's left.
      </p>

      <div className="notice notice-info">
        <p>
          <strong>This is a self-tracking aid. It is not an assessment, a compliance guarantee, or legal advice.</strong>
        </p>
      </div>

      <h2>What it is</h2>
      <ul>
        <li>
          A list of the 110 security requirements in NIST SP 800-171 Revision 2, grouped into 14 families. This is the
          revision that CMMC Level 2 is based on.
        </li>
        <li>For each requirement: the official text, a plain-English explanation, examples, and evidence an assessor commonly asks for.</li>
        <li>A place to record a status, an owner, a due date, and notes for each requirement.</li>
        <li>A dashboard of what's done and what's left, and a summary you can print or save as a PDF.</li>
      </ul>

      <h2>What it isn't</h2>
      <ul>
        <li>
          <strong>Not an assessment.</strong> Marking a requirement "Implemented" here doesn't verify it. Only a formal
          assessment can do that, for example by a CMMC Third-Party Assessment Organization (C3PAO) where your contract
          requires one.
        </li>
        <li>
          <strong>Not a compliance guarantee.</strong> Following the examples or collecting the evidence listed here
          doesn't guarantee that you meet a requirement or will pass an assessment.
        </li>
        <li>
          <strong>Not legal advice.</strong> Your contract determines what you must do. If you're unsure, ask your
          contracting officer or a qualified advisor.
        </li>
        <li>
          <strong>Not official guidance.</strong> The official requirement text comes from NIST SP 800-171 Rev 2. The
          plain-English explanations, examples, and evidence lists were written for this tool and are informal.
        </li>
        <li>
          It doesn't calculate an SPRS score, and it doesn't cover NIST SP 800-171 Revision 3. Check your contract for
          the revision that applies to you.
        </li>
      </ul>

      <h2>Privacy</h2>
      <p>
        <strong>Nothing you enter leaves your browser.</strong> There are no accounts, no analytics, no cookies, and no
        servers that receive your data. The app makes no network requests after the page loads, and the published site
        also tells the browser to block any attempt to send data out.
      </p>
      <ul>
        <li>
          Your progress is saved in this browser's local storage, on this device only. Anyone who can use this browser
          on this device can see it; other browsers and devices can't.
        </li>
        <li>
          <strong>Clearing your browser's site data deletes your progress.</strong> So does using a private window,
          which forgets everything when closed. Use <a href={href.data()}>Backup &amp; data</a> to export a backup file
          regularly. You can import it later, on this or another computer.
        </li>
        <li>Backup files and printed summaries are yours to store and share as you see fit. Treat them like any other internal business record.</li>
      </ul>

      <h2>Don't enter CUI</h2>
      <p>
        Don't enter CUI (Controlled Unclassified Information) or other sensitive details in this tracker, such as
        passwords, system names and addresses, or personal information. Keep notes general, like "MFA enabled for all
        email accounts", and keep the details in your own secured systems.
      </p>

      <h2>Sources</h2>
      <ul>
        <li>NIST SP 800-171 Revision 2, Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations.</li>
        <li>NIST SP 800-171A, Assessing Security Requirements for Controlled Unclassified Information (assessment objectives).</li>
      </ul>
    </article>
  );
}
