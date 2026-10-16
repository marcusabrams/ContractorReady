import { href } from "../lib/router";

export function NotFoundPage({ message = "That page doesn't exist." }: { message?: string }) {
  return (
    <>
      <h1 tabIndex={-1}>Not found</h1>
      <p>{message}</p>
      <p>
        <a href={href.requirements()}>Go to the requirements list</a>
      </p>
    </>
  );
}
