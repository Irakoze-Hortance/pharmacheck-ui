import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND = process.env.BACKEND_URL || 'https://capstone-ml-lqpp.onrender.com';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      const fetchLatest = async () => {
        const res = await fetch(`${BACKEND}/history`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : data.data ?? data.results ?? data.history ?? [];
      };

      try {
        // Send initial batch immediately on connect
        const initial = await fetchLatest();
        send({ type: 'initial', data: initial });

        // Track seen IDs to detect new records
        const seenIds = new Set(
          initial.map((d: { observation_id?: string; _id?: string }) => d.observation_id ?? String(d._id))
        );

        // Poll /history every 5s for new entries
        const poll = setInterval(async () => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));

            const latest = await fetchLatest();
            const newDocs = latest.filter(
              (d: { observation_id?: string; _id?: string }) =>
                !seenIds.has(d.observation_id ?? String(d._id))
            );

            if (newDocs.length > 0) {
              newDocs.forEach((doc: object) => send({ type: 'change', data: doc }));
              newDocs.forEach((d: { observation_id?: string; _id?: string }) =>
                seenIds.add(d.observation_id ?? String(d._id))
              );
            }
          } catch { /* skip tick */ }
        }, 5_000);

        // Clean up on disconnect
        controller.close = new Proxy(controller.close, {
          apply(target, thisArg) {
            clearInterval(poll);
            return target.call(thisArg);
          },
        });

      } catch (err) {
        send({ type: 'error', message: String(err) });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}