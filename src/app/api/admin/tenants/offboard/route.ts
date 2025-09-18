import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';
import { Prisma } from '@prisma/client';

interface OffboardingRequest {
  tenantId: string;
  reason: 'CANCELLATION' | 'NON_PAYMENT' | 'VIOLATION' | 'MIGRATION' | 'OTHER';
  notes?: string;
  dataRetentionDays?: number; // How long to keep data before permanent deletion
  exportData?: boolean; // Whether to export data before offboarding
  notifyUsers?: boolean; // Whether to notify users about offboarding
}

interface OffboardingResult {
  tenantId: string;
  status: 'SUSPENDED' | 'CANCELLED';
  dataExportUrl?: string;
  retentionUntil?: string;
  affectedUsers: number;
  message: string;
}

// POST /api/admin/tenants/offboard - Tenant offboarding workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['PLATFORM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const body: OffboardingRequest = await request.json();
    const { 
      tenantId, 
      reason, 
      notes, 
      dataRetentionDays = 30,
      exportData = true,
      notifyUsers = true 
    } = body;

    // Validate required fields
    if (!tenantId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, reason' },
        { status: 400 }
      );
    }

    // Validate tenant exists and is not already offboarded
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        },
        subscription: {
          include: {
            plan: true
          }
        },
        _count: {
          select: {
            users: true,
            ingredients: true,
            batches: true,
            recipes: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    if (tenant.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Tenant is already cancelled' },
        { status: 400 }
      );
    }

    // Determine new status based on reason
    const newStatus = reason === 'NON_PAYMENT' ? 'SUSPENDED' : 'CANCELLED';
    const retentionUntil = new Date(Date.now() + dataRetentionDays * 24 * 60 * 60 * 1000);

    let dataExportUrl: string | undefined;

    // Execute offboarding process in transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Export data if requested
      if (exportData) {
        dataExportUrl = await exportTenantData(tx, tenantId);
      }

      // Update tenant status
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      });

      // Update subscription status if exists
      if (tenant.subscription) {
        await tx.subscription.update({
          where: { tenantId },
          data: {
            status: newStatus === 'SUSPENDED' ? 'PAST_DUE' : 'CANCELLED',
            cancelAtPeriodEnd: true,
            updatedAt: new Date()
          }
        });
      }

      // Create offboarding settings
      await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: 'OFFBOARDING_REASON'
          }
        },
        update: {
          value: reason
        },
        create: {
          tenantId,
          key: 'OFFBOARDING_REASON',
          value: reason
        }
      });

      await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: 'OFFBOARDING_DATE'
          }
        },
        update: {
          value: new Date().toISOString()
        },
        create: {
          tenantId,
          key: 'OFFBOARDING_DATE',
          value: new Date().toISOString()
        }
      });

      await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: 'DATA_RETENTION_UNTIL'
          }
        },
        update: {
          value: retentionUntil.toISOString()
        },
        create: {
          tenantId,
          key: 'DATA_RETENTION_UNTIL',
          value: retentionUntil.toISOString()
        }
      });

      if (notes) {
        await tx.tenantSetting.upsert({
          where: {
            tenantId_key: {
              tenantId,
              key: 'OFFBOARDING_NOTES'
            }
          },
          update: {
            value: notes
          },
          create: {
            tenantId,
            key: 'OFFBOARDING_NOTES',
            value: notes
          }
        });
      }

      // Deactivate all user sessions (in a real implementation, this would invalidate JWT tokens)
      await tx.user.updateMany({
        where: { tenantId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return updatedTenant;
    });

    // Send notifications to users if requested
    if (notifyUsers && tenant.users.length > 0) {
      await notifyUsersOfOffboarding({
        tenantName: tenant.name,
        users: tenant.users.map(user => ({
          ...user,
          name: user.name || 'Unknown User'
        })),
        reason,
        newStatus,
        retentionUntil,
        dataExportUrl
      });
    }

    // Schedule data cleanup job (in a real implementation, this would use a job queue)
    await scheduleDataCleanup(tenantId, retentionUntil);

    const offboardingResult: OffboardingResult = {
      tenantId,
      status: newStatus,
      dataExportUrl,
      retentionUntil: retentionUntil.toISOString(),
      affectedUsers: tenant.users.length,
      message: `Tenant ${newStatus.toLowerCase()} successfully. Data will be retained until ${retentionUntil.toLocaleDateString()}.`
    };

    return NextResponse.json({
      message: 'Tenant offboarded successfully',
      result: offboardingResult
    });

  } catch (error) {
    console.error('Error offboarding tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to export tenant data
async function exportTenantData(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
  try {
    // In a real implementation, this would:
    // 1. Query all tenant data
    // 2. Format it as JSON/CSV
    // 3. Upload to cloud storage (S3, etc.)
    // 4. Return download URL
    
    // For now, we'll simulate the export process
    const exportData = {
      exportDate: new Date().toISOString(),
      tenantId,
      data: {
        // This would contain actual data in a real implementation
        users: await tx.user.findMany({ where: { tenantId } }),
        ingredients: await tx.ingredient.findMany({ where: { tenantId } }),
        recipes: await tx.recipe.findMany({ where: { tenantId } }),
        batches: await tx.batch.findMany({ where: { tenantId } }),
        suppliers: await tx.supplier.findMany({ where: { tenantId } }),
        settings: await tx.tenantSetting.findMany({ where: { tenantId } })
      }
    };

    // Simulate file upload and return mock URL
    const exportId = `export_${tenantId}_${Date.now()}`;
    const mockExportUrl = `https://exports.brewery.com/downloads/${exportId}.json`;
    
    console.log('Data export created:', {
      exportId,
      url: mockExportUrl,
      dataSize: JSON.stringify(exportData).length
    });

    return mockExportUrl;
  } catch (error) {
    console.error('Error exporting tenant data:', error);
    throw new Error('Failed to export tenant data');
  }
}

// Helper function to notify users of offboarding
async function notifyUsersOfOffboarding(data: {
  tenantName: string;
  users: { id: string; email: string; name: string; role: string; }[];
  reason: string;
  newStatus: string;
  retentionUntil: Date;
  dataExportUrl?: string;
}) {
  // In a real implementation, this would send emails to all users
  console.log('Offboarding notifications would be sent to:', data.users.length, 'users');
  
  for (const user of data.users) {
    const emailContent = {
      to: user.email,
      subject: `Important: ${data.tenantName} Account Status Update`,
      body: `
        Dear ${user.name},
        
        We're writing to inform you that the ${data.tenantName} account has been ${data.newStatus.toLowerCase()}.
        
        Reason: ${data.reason}
        Status: ${data.newStatus}
        Data Retention: Until ${data.retentionUntil.toLocaleDateString()}
        
        ${data.dataExportUrl ? `Your data export is available at: ${data.dataExportUrl}` : ''}
        
        If you have any questions, please contact our support team.
        
        Best regards,
        The Brewery Inventory Team
      `
    };
    
    console.log('Email notification for user:', user.email, emailContent);
  }
}

// Helper function to schedule data cleanup
async function scheduleDataCleanup(tenantId: string, retentionUntil: Date) {
  // In a real implementation, this would:
  // 1. Add job to queue (Redis, AWS SQS, etc.)
  // 2. Schedule cleanup job for retention date
  // 3. Handle permanent data deletion
  
  console.log('Data cleanup scheduled:', {
    tenantId,
    scheduledFor: retentionUntil.toISOString(),
    daysFromNow: Math.ceil((retentionUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  });
  
  // Mock job scheduling
  const cleanupJob = {
    id: `cleanup_${tenantId}_${Date.now()}`,
    tenantId,
    scheduledFor: retentionUntil.toISOString(),
    type: 'PERMANENT_DELETE',
    status: 'SCHEDULED'
  };
  
  console.log('Cleanup job created:', cleanupJob);
  
  return Promise.resolve(cleanupJob);
}

// GET /api/admin/tenants/offboard - Get offboarding status for tenants
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (tenantId) {
      // Get specific tenant offboarding status
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          settings: {
            where: {
              key: {
                in: ['OFFBOARDING_REASON', 'OFFBOARDING_DATE', 'DATA_RETENTION_UNTIL', 'OFFBOARDING_NOTES']
              }
            }
          }
        }
      });

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      const offboardingData = tenant.settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      return NextResponse.json({
        tenantId,
        status: tenant.status,
        offboardingData
      });
    } else {
      // Get all offboarded tenants
      const offboardedTenants = await prisma.tenant.findMany({
        where: {
          status: {
            in: ['SUSPENDED', 'CANCELLED']
          }
        },
        include: {
          settings: {
            where: {
              key: {
                in: ['OFFBOARDING_REASON', 'OFFBOARDING_DATE', 'DATA_RETENTION_UNTIL']
              }
            }
          },
          _count: {
            select: {
              users: true,
              ingredients: true,
              batches: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      const formattedTenants = offboardedTenants.map(tenant => {
        const offboardingData = tenant.settings.reduce((acc: Record<string, string>, setting: { key: string; value: string }) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, string>);

        return {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          status: tenant.status,
          updatedAt: tenant.updatedAt,
          dataCount: tenant._count,
          offboardingReason: offboardingData.OFFBOARDING_REASON,
          offboardingDate: offboardingData.OFFBOARDING_DATE,
          dataRetentionUntil: offboardingData.DATA_RETENTION_UNTIL
        };
      });

      return NextResponse.json({
        tenants: formattedTenants,
        total: formattedTenants.length
      });
    }
  } catch (error) {
    console.error('Error fetching offboarding data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}