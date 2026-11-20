"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cubeNet } from "../lib/cube";

export function CopyIcon({ copied, size = 15 }: { copied: boolean; size?: number }) {
  return <span className="copy-icon" data-copied={copied} aria-hidden="true">
    <Copy className="copy-glyph" size={size} />
    <Check className="check-glyph" size={size} />
  </span>;
}

const moveVariants = Array.from("URFDLB").flatMap(face => ["", "'", "2"].map(suffix => face + suffix));

function randomAlternative<T>(values: T[], current: T): T {
  const index = values.indexOf(current);
  return values[(index + 1 + Math.floor(Math.random() * (values.length - 1))) % values.length];
}

type CubeFaces = ReturnType<typeof cubeNet>;
type ShuffleFrame = { scramble: string; moves: string[]; faces: CubeFaces };

export function useScrambleDisplay(scramble: string, animate: boolean) {
  const moves = useMemo(() => scramble ? scramble.split(/\s+/) : [], [scramble]);
  const faces = useMemo(() => cubeNet(scramble), [scramble]);
  const [frame, setFrame] = useState<ShuffleFrame | null>(null);

  useEffect(() => {
    if (!animate || !moves.length) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    const palette = faces.map(({ face }) => face);
    const lastFrame = 5 + Math.floor((moves.length - 1) / 3);
    let step = 0;
    const tick = () => {
      if (step >= lastFrame || motion.matches) {
        window.clearInterval(interval);
        setFrame(null);
        return;
      }
      const progress = step / lastFrame;
      setFrame({
        scramble,
        moves: moves.map((move, index) => step >= 5 + Math.floor(index / 3) ? move :
          randomAlternative(moveVariants, move)),
        faces: faces.map(({ face, colors }) => ({
          face,
          colors: colors.map((color, index) => index === 4 || (index + 1) / 9 <= progress
            ? color
            : randomAlternative(palette, color)),
        })),
      });
      step++;
    };
    const interval = window.setInterval(tick, 38);
    tick();
    return () => window.clearInterval(interval);
  }, [animate, faces, moves, scramble]);

  const active = frame?.scramble === scramble ? frame : null;
  return { moves, shuffledMoves: active?.moves, shuffledFaces: active?.faces ?? faces };
}

export function ScrambleMoves({ scramble, moves, shuffled }: { scramble: string; moves: string[]; shuffled?: string[] }) {
  return <>
    <span className="sr-only">{scramble}</span>
    <span className="scramble-moves" aria-hidden="true">
      {moves.map((move, index) => (
        <Fragment key={index}>
          <span className="scramble-move" data-shuffling={!!shuffled && shuffled[index] !== move}>
            {shuffled?.[index] ?? move}
          </span>{" "}
        </Fragment>
      ))}
    </span>
  </>;
}

export function CubeNet({ scramble, displayFaces }: { scramble: string; displayFaces?: CubeFaces }) {
  const faces = useMemo(() => displayFaces ?? cubeNet(scramble), [displayFaces, scramble]);
  return <div className="cube-net" role="img" aria-label="Scrambled cube net, white on top and green in front">
    {faces.map(({ face, colors }) => (
      <div className={`cube-face face-${face}`} key={face}>
        {colors.map((color, index) => <span key={index} className={`sticker sticker-${color}`} />)}
      </div>
    ))}
  </div>;
}
