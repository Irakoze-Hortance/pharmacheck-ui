import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('pharmacheck');
    const col = db.collection('observations');
    const docs = await col.find({}).limit(10).toArray();
    const count = await col.countDocuments();

    return NextResponse.json({
      connected: true,
      count,
      docs,
    });
  } catch (err) {
    return NextResponse.json({ connected: false, error: String(err) }, { status: 500 });
  } finally {
    await client.close();
  }
}