import { NextResponse } from 'next/server';

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function accepted(data: unknown = { accepted: true }): NextResponse {
  return NextResponse.json(data, { status: 202 });
}

export function fail(code: string, status: number, message: string): NextResponse {
  return NextResponse.json(
    {
      code,
      message,
      details: {},
    },
    { status },
  );
}
