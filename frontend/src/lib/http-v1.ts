import { NextResponse } from 'next/server';

export function okV1<T>(data: T, status = 200, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { success: true as const, data, ...(meta && { meta }) },
    { status },
  );
}

export function failV1(code: string, status: number, message: string, details?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { success: false as const, error: { code, message, details: details ?? {} } },
    { status },
  );
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
