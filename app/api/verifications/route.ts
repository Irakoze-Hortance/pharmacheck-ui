import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND = process.env.BACKEND_URL || 'https://capstone-ml-lqpp.onrender.com';


export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/history`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Backend returned ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const items = Array.isArray(data) ? data : data.data ?? data.results ?? data.history ?? [];

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
