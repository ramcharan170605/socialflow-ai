import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'socialflow-ai',
    timestamp: new Date().toISOString(),
  });
}
