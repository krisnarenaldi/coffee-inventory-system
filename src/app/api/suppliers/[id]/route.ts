import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import { z } from 'zod'

const updateSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplier = await prisma.supplier.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        ingredients: {
          select: {
            id: true,
            name: true,
            type: true,
            stockQuantity: true,
            unitOfMeasure: true,
            minimumThreshold: true,
            costPerUnit: true,
            location: true,
            expirationDate: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        shipments: {
          orderBy: {
            receivedDate: 'desc',
          },
          take: 10,
          include: {
            items: {
              include: {
                ingredient: {
                  select: {
                    name: true,
                    type: true,
                  },
                },
              },
            },
            receivedBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            ingredients: true,
            shipments: true,
          },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Supplier GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSupplierSchema.parse(body)

    // Check if supplier exists and belongs to tenant
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const supplier = await prisma.supplier.update({
      where: {
        id: params.id,
      },
      data: validatedData,
      include: {
        _count: {
          select: {
            ingredients: true,
            shipments: true,
          },
        },
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Supplier PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if supplier exists and belongs to tenant
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        ingredients: {
          where: {
            isActive: true,
          },
        },
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check if supplier has active ingredients
    if (existingSupplier.ingredients.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with active ingredients' },
        { status: 400 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.supplier.update({
      where: {
        id: params.id,
      },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({ message: 'Supplier deleted successfully' })
  } catch (error) {
    console.error('Supplier DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}