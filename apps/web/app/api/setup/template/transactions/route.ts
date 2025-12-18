import { NextResponse } from 'next/server'

export async function GET() {
  const headers = 'date,description,amount,currency,account_name'
  return new NextResponse(headers, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="transactions_template.csv"',
    },
  })
}
