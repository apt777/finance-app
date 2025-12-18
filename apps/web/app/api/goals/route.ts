import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma' // Adjust path as needed

interface GoalData {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

export async function GET(request: Request) {
  try {
    // In a real app, you'd filter by user ID
    const goals = await prisma.goal.findMany()
    return NextResponse.json(goals)
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, name, targetAmount, currentAmount, targetDate }: GoalData = await request.json()
    const newGoal = await prisma.goal.create({
      data: {
        userId,
        name,
        targetAmount,
        currentAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    })
    return NextResponse.json(newGoal, { status: 201 })
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to create goal' }, { status: 500 })
  }
}
