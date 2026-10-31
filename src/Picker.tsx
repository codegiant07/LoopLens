// Example picker. A native <select> lets macOS draw a tall menu over the browser's address bar,
// so this opens below the button, inside the page, and scrolls when space runs out.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { GROUPS, SAMPLES } from "./engine/samples";

export default function Picker({
  value,
  onPick,
}: {
  value: number;
  onPick: (k: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [maxH, setMaxH] = useState(420);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const byKey = useRef(false); // only keyboard moves scroll the list; opening always starts at the top

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("pointerdown", close);
    return () => removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open && byKey.current)
      list.current
        ?.querySelector(`[data-k="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
    byKey.current = false;
  }, [open, active]);

  const show = () => {
    const below =
      innerHeight - box.current!.getBoundingClientRect().bottom - 16;
    setMaxH(Math.min(420, Math.max(180, below)));
    setActive(Math.max(0, value));
    setOpen(true);
  };
  const choose = (k: number) => {
    setOpen(false);
    if (k !== value) onPick(k);
  };
  const key = (e: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      return;
    }
    byKey.current = true;
    if (e.key === "ArrowDown")
      setActive((a) => Math.min(SAMPLES.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(SAMPLES.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else return;
    e.preventDefault();
  };

  return (
    <div className="pk" ref={box}>
      <button
        type="button"
        role="combobox"
        aria-label={`Example: ${value >= 0 ? SAMPLES[value][0] : "your code"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={key}
      >
        <span>{value >= 0 ? SAMPLES[value][0] : "Your code"}</span>
        <i aria-hidden="true">▾</i>
      </button>
      {open && (
        <div
          role="listbox"
          id={id}
          ref={list}
          style={{ maxHeight: maxH }}
          onPointerDown={(e) => e.preventDefault()}
        >
          {GROUPS.map((g, gi) => {
            const base = GROUPS.slice(0, gi).reduce(
              (n, x) => n + x.samples.length,
              0,
            ); // option numbers index into SAMPLES
            return (
              <div role="group" key={g.name} aria-labelledby={`${id}-g${gi}`}>
                <div className="pk-h" id={`${id}-g${gi}`}>
                  {g.name}
                </div>
                {g.samples.map(([name], j) => (
                  <div
                    key={name}
                    id={`${id}-${base + j}`}
                    role="option"
                    data-k={base + j}
                    aria-selected={base + j === value}
                    className={base + j === active ? "act" : ""}
                    onPointerMove={() =>
                      base + j !== active && setActive(base + j)
                    }
                    onClick={() => choose(base + j)}
                  >
                    {name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
