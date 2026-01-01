import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { parse } from 'csv-parse/sync'
import prisma from '@lib/prisma'

// Define interfaces for the expected CSV data
interface AccountCsv {
  name: string;
  type: string;
  balance: string;
  currency: string;
}

interface TransactionCsv {
  date: string;
  description: string;
  amount: string;
  currency: string;
  account_name: string;
}

// Helper function to decode buffer with fallback for Korean encoding
const decodeBuffer = (buffer: Buffer): string => {
  const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    // Try decoding with UTF-8
    return utf8Decoder.decode(buffer);
  } catch (e) {
    // If UTF-8 fails, assume it's EUC-KR (a common Korean encoding)
    const eucKrDecoder = new TextDecoder('euc-kr');
    return eucKrDecoder.decode(buffer);
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const formData = await request.formData()
    const accountsFile = formData.get('accounts') as File | null
    const transactionsFile = formData.get('transactions') as File | null

    const createdAccounts = new Map<string, string>()

    // Process Accounts CSV
    if (accountsFile) {
      const accountsBuffer = Buffer.from(await accountsFile.arrayBuffer());
      const accountsCsvData = decodeBuffer(accountsBuffer);
      const records: AccountCsv[] = parse(accountsCsvData, {
        columns: true,
        skip_empty_lines: true,
      })

      for (const record of records) {
        const newAccount = await prisma.account.create({
          data: {
            userId,
            name: record.name,
            type: record.type,
            balance: parseFloat(record.balance),
            currency: record.currency,
          },
        })
        createdAccounts.set(newAccount.name, newAccount.id)
      }
    }

    // Process Transactions CSV
    if (transactionsFile) {
      // If accounts were not uploaded in the same batch, fetch existing accounts
      if (createdAccounts.size === 0) {
        const existingAccounts = await prisma.account.findMany({ where: { userId } })
        existingAccounts.forEach(acc => createdAccounts.set(acc.name, acc.id))
      }

      const transactionsBuffer = Buffer.from(await transactionsFile.arrayBuffer());
      const transactionsCsvData = decodeBuffer(transactionsBuffer);
      const records: TransactionCsv[] = parse(transactionsCsvData, {
        columns: true,
        skip_empty_lines: true,
      })

      const transactionData = records.map(record => {
        const accountId = createdAccounts.get(record.account_name)
        if (!accountId) {
          // In a real-world scenario, you might want to collect these errors
          // and return them to the user instead of throwing.
          throw new Error(`Account with name "${record.account_name}" not found for one of the transactions.`)
        }
        return {
          userId,
          accountId,
          date: new Date(record.date),
          description: record.description,
          amount: parseFloat(record.amount),
          currency: record.currency,
        }
      })

      await prisma.transaction.createMany({
        data: transactionData,
      })
    }

    return NextResponse.json({ message: 'CSV data imported successfully!' })

  } catch (error: any) {
    // Log the error for debugging purposes
    console.error('CSV Upload Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process CSV files.' }, { status: 500 })
  }
}
