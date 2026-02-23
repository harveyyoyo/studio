import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json();

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const isValid = passcode === process.env.DEV_PASSCODE;

    return NextResponse.json({ success: isValid });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
