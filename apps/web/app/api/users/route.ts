import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma' // Adjust path as needed

interface UserData {
  email: string;
  name?: string;
}

export async function GET(request: Request) {
  try {
    const users = await prisma.user.findMany()
    return NextResponse.json(users)
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { email, name }: UserData = await request.json()
    const newUser = await prisma.user.create({
      data: { email, name },
    })
    return NextResponse.json(newUser, { status: 201 })
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 })
  }
}