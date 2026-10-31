// Design preview shell (not part of the production build). ?d=a|b|c|d &sample=N &step=N &clean=1
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useLens } from "./shared";
import DirA from "./DirA";
import DirB from "./DirB";
import DirC from "./DirC";
import DirD from "./DirD";

const q = new URLSearchParams(location.search);
const DIRS = {
  a: ["A · Minimal IDE", DirA],
  b: ["B · Learning Studio", DirB],
  c: ["C · Premium Dark", DirC],
  d: ["D · Studio Dark ★", DirD],
} as const;
type D = keyof typeof DIRS;

function Preview() {
  const [d, setD] = useState<D>(
    (q.get("d") as D) in DIRS ? (q.get("d") as D) : "d",
  );
  const L = useLens(+(q.get("sample") ?? 1), +(q.get("step") ?? 4));
  const View = DIRS[d][1];
  return (
    <>
      {!q.has("clean") && (
        <div className="dp-switch">
          {(Object.keys(DIRS) as D[]).map((k) => (
            <button
              key={k}
              className={k === d ? "on" : ""}
              onClick={() => setD(k)}
            >
              {DIRS[k][0]}
            </button>
          ))}
        </div>
      )}
      <View L={L} />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
