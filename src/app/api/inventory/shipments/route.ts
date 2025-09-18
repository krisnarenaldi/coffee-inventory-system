import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import { z } from 'zod'

const shipmentItemSchema = z.object({
  ingredientId: z.string().min(1, 'Ingredient ID is required'),
  quantityOrdered: z.number().min(0.01, 'Quantity ordered must be greater than 0'),
  quantityReceived: z.number().min(0, 'Quantity received must be non-negative'),
  unitCost: z.number().min(0, 'Unit cost must be non-negative').optional(),
  batchNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  notes: z.string().optional(),
})

const createShipmentSchema = z.object({
  supplierId: z.string().optional(),
  shipmentNumber: z.string().optional(),
  receivedDate: z.string().min(1, 'Received date is required'),
  status: z.enum(['PENDING', 'RECEIVED', 'PARTIAL', 'CANCELLED']).default('RECEIVED'),
  notes: z.string().optional(),
  items: z.array(shipmentItemSchema).min(1, 'At least one item is required'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {
      tenantId: session.user.tenantId,
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (status) {
      where.status = status
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              contactPerson: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  unitOfMeasure: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: {
          receivedDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ])

    return NextResponse.json({
      shipments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Shipments GET error:', error)
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
    const validatedData = createShipmentSchema.parse(body)

    // Verify supplier belongs to tenant if provided
    if (validatedData.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: validatedData.supplierId,
          tenantId: session.user.tenantId,
          isActive: true,
        },
      })

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
      }
    }

    // Verify all ingredients belong to tenant
    const ingredientIds = validatedData.items.map(item => item.ingredientId)
    const ingredients = await prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        tenantId: session.user.tenantId,
        isActive: true,
      },
    })

    if (ingredients.length !== ingredientIds.length) {
      return NextResponse.json(
        { error: 'One or more ingredients not found' },
        { status: 404 }
      )
    }

    // Create shipment and update inventory in a transaction
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      // Create the shipment
      const shipment = await tx.shipment.create({
        data: {
          supplierId: validatedData.supplierId,
          shipmentNumber: validatedData.shipmentNumber,
          receivedDate: new Date(validatedData.receivedDate),
          status: validatedData.status,
          notes: validatedData.notes,
          tenantId: session.user.tenantId,
          receivedById: session.user.id,
        },
      })

      // Create shipment items and update ingredient stock
      const shipmentItems = []
      for (const item of validatedData.items) {
        // Create shipment item
        const shipmentItem = await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            ingredientId: item.ingredientId,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: item.quantityReceived,
            unitCost: item.unitCost,
            batchNumber: item.batchNumber,
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            notes: item.notes,
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
          },
        })

        shipmentItems.push(shipmentItem)

        // Update ingredient stock quantity if status is RECEIVED or PARTIAL
        if (validatedData.status === 'RECEIVED' || validatedData.status === 'PARTIAL') {
          const ingredient = ingredients.find((ing: { id: string; stockQuantity: any; }) => ing.id === item.ingredientId)
          if (ingredient && item.quantityReceived > 0) {
            await tx.ingredient.update({
              where: {
                id: item.ingredientId,
              },
              data: {
                stockQuantity: ingredient.stockQuantity.add(item.quantityReceived),
                // Update cost per unit if provided
                ...(item.unitCost && { costPerUnit: item.unitCost }),
                // Update batch number and expiration date if provided
                ...(item.batchNumber && { batchNumber: item.batchNumber }),
                ...(item.expirationDate && { expirationDate: new Date(item.expirationDate) }),
              },
            })
          }
        }
      }

      return {
        ...shipment,
        items: shipmentItems,
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Shipment POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}