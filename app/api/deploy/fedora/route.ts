import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log('Received deploy request:', data);

    // Simulate success — you can do real SSH logic here
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error parsing request:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
