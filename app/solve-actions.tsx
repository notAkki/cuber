import { Trash2 } from "lucide-react";
import type { Penalty, Solve } from "../lib/solves";

export function SolveActions({ solve, onDelete, onPenalty, last = false }: {
  solve: Solve;
  onDelete: (solve: Solve) => void;
  onPenalty: (solve: Solve, penalty: Penalty) => void;
  last?: boolean;
}) {
  const deleteLabel = last ? "Delete last solve" : "Delete solve";
  return <>
    <button className="text-button solve-action delete-action" onClick={() => onDelete(solve)} aria-label={deleteLabel} title={deleteLabel}><Trash2 size={15} /></button>
    <button className="text-button solve-action dnf-action" aria-pressed={solve.penalty === "DNF"} onClick={() => onPenalty(solve, "DNF")}>DNF</button>
    <button className="text-button solve-action plus-action" aria-pressed={solve.penalty === "+2"} onClick={() => onPenalty(solve, "+2")}>+2</button>
  </>;
}
