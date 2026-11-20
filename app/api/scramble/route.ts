import { randomScrambleForEvent } from "cubing/scramble";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scramble = await randomScrambleForEvent("333");
  return Response.json({ scramble: scramble.toString() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
