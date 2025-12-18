import { NextResponse } from 'next/server'

export async function GET() {
  const headers = 'name,type,balance,currency'
  return new NextResponse(headers, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="accounts_template.csv"',
    },
  })
}
