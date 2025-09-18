import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import { z } from 'zod'

const createAdjustmentSchema = z.object({
  ingredientId: z.string().min(1, 'Ingredient ID is required'),
  type: z.enum(['INCREASE', 'DECREASE', 'CORRECTION', 'WASTE', 'TRANSFER']),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ingredientId = searchParams.get('ingredientId')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      tenantId: session.user.tenantId,
    }

    if (ingredientId) {
      where.ingredientId = ingredientId
    }

    if (type) {
      where.type = type
    }

    const [adjustments, total] = await Promise.all([
      prisma.inventoryAdjustment.findMany({
        where,
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              type: true,
              unitOfMeasure: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.inventoryAdjustment.count({ where }),
    ])

    return NextResponse.json({
      adjustments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Inventory adjustments GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAdjustmentSchema.parse(body)

    // Verify ingredient belongs to tenant
    const ingredient = await prisma.ingredient.findFirst({
      where: {
        id: validatedData.ingredientId,
        tenantId: session.user.tenantId,
        isActive: true,
      },
    })

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    // Calculate new stock quantity
    let newStockQuantity = ingredient.stockQuantity
    if (validatedData.type === 'INCREASE' || validatedData.type === 'CORRECTION') {
      newStockQuantity = ingredient.stockQuantity.add(validatedData.quantity)
    } else if (validatedData.type === 'DECREASE' || validatedData.type === 'WASTE') {
      newStockQuantity = ingredient.stockQuantity.sub(validatedData.quantity)
      if (newStockQuantity.lt(0)) {
        return NextResponse.json(
          { error: 'Insufficient stock quantity' },
          { status: 400 }
        )
      }
    }

    // Create adjustment and update ingredient in a transaction
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      // Create the adjustment record
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          ...validatedData,
          tenantId: session.user.tenantId,
          createdById: session.user.id,
        },
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              type: true,
              unitOfMeasure: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Update ingredient stock quantity
      await tx.ingredient.update({
        where: {
          id: validatedData.ingredientId,
        },
        data: {
          stockQuantity: newStockQuantity,
        },
      })

      return adjustment
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Inventory adjustment POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}