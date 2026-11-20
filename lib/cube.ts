type Vector = [number, number, number];
const faces = ["U", "L", "F", "R", "B", "D"] as const;
type Face = typeof faces[number];
const frames: Record<Face, [Vector, Vector, Vector]> = {
  U: [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
  L: [[-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  F: [[0, 0, 1], [1, 0, 0], [0, -1, 0]],
  R: [[1, 0, 0], [0, 0, -1], [0, -1, 0]],
  B: [[0, 0, -1], [-1, 0, 0], [0, -1, 0]],
  D: [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
};

function dot(a: Vector, b: Vector) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clockwise(v: Vector, axis: Vector): Vector {
  const parallel = dot(v, axis);
  return [
    axis[0] * parallel + axis[2] * v[1] - axis[1] * v[2],
    axis[1] * parallel + axis[0] * v[2] - axis[2] * v[0],
    axis[2] * parallel + axis[1] * v[0] - axis[0] * v[1],
  ];
}

const solved = faces.flatMap(face => {
  const [normal, right, down] = frames[face];
  return Array.from({ length: 9 }, (_, i) => ({
    color: face,
    normal,
    position: normal.map((value, axis) => value + right[axis] * (i % 3 - 1) + down[axis] * (Math.floor(i / 3) - 1)) as Vector,
  }));
});

export function cubeNet(scramble: string) {
  const stickers = solved.map(sticker => ({ ...sticker }));
  for (const move of scramble.split(/\s+/)) {
    if (!/^[ULFRBD][2']?$/.test(move)) continue;
    const axis = frames[move[0] as Face][0];
    const turns = move.endsWith("2") ? 2 : move.endsWith("'") ? 3 : 1;
    for (const sticker of stickers) {
      if (dot(sticker.position, axis) !== 1) continue;
      for (let turn = 0; turn < turns; turn++) {
        sticker.position = clockwise(sticker.position, axis);
        sticker.normal = clockwise(sticker.normal, axis);
      }
    }
  }
  return faces.map(face => {
    const [normal, right, down] = frames[face];
    const colors = Array<Face>(9);
    for (const sticker of stickers) {
      if (dot(sticker.normal, normal) === 1) {
        colors[(dot(sticker.position, down) + 1) * 3 + dot(sticker.position, right) + 1] = sticker.color;
      }
    }
    return { face, colors };
  });
}
