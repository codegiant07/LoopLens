// Link to another LoopLens page. Renders plain text while that page doesn't exist yet, so articles can mention
// future topics without broken links; the link appears automatically once the page is added to the manifest.
import type { ReactNode } from "react";
import { exampleCode } from "../examples";
import { pageAt } from "../routes";

export default function Link({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return pageAt(to) ? <a href={to}>{children}</a> : <>{children}</>;
}

/** A code example shown as text (so search engines and screen readers can read it). */
export const Code = ({ children }: { children: string }) => (
  <pre className="code">
    <code>{children}</code>
  </pre>
);

/** Code of a visualizer example by name, so page text always matches what the visualizer runs (tested against real JS). */
export const sampleCode = (name: string): string => exampleCode(name);
