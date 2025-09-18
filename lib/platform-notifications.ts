import { prisma } from './prisma';

export interface PlatformNotification {
  id: string;
  type: 'system' | 'maintenance' | 'feature' | 'security' | 'billing' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  targetAudience: 'all' | 'admins' | 'specific_tenants' | 'specific_plans';
  targetTenants?: string[]; // tenant IDs
  targetPlans?: string[]; // plan IDs
  scheduledFor?: string; // ISO date string
  expiresAt?: string; // ISO date string
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  deliveryStats?: {
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: PlatformNotification['type'];
  subject: string;
  content: string;
  variables: string[]; // Available template variables
  isActive: boolean;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'in_app' | 'sms' | 'webhook';
  config: {
    endpoint?: string;
    apiKey?: string;
    template?: string;
  };
  isActive: boolean;
}

/**
 * Create a new platform notification
 */
export async function createPlatformNotification(
  notification: Omit<PlatformNotification, 'id' | 'createdAt' | 'status' | 'deliveryStats'>
): Promise<PlatformNotification> {
  const newNotification: PlatformNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    status: notification.scheduledFor ? 'scheduled' : 'draft'
  };

  // In a real implementation, save to database
  console.log('Created platform notification:', newNotification.id);
  
  return newNotification;
}

/**
 * Send notification to target audience
 */
export async function sendPlatformNotification(
  notificationId: string,
  channels: string[] = ['in_app', 'email']
): Promise<{ success: boolean; stats: PlatformNotification['deliveryStats'] }> {
  try {
    // Get notification details (mock)
    const notification = await getPlatformNotification(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    // Determine target audience
    const targetTenants = await getTargetTenants(notification);
    const targetUsers = await getTargetUsers(targetTenants, notification);

    let sent = 0;
    let delivered = 0;
    let errors = 0;

    // Send to each user through specified channels
    for (const user of targetUsers) {
      for (const channel of channels) {
        try {
          await sendNotificationToUser(user, notification, channel);
          sent++;
          delivered++; // Simplified - in real implementation, track actual delivery
        } catch (error) {
          console.error(`Failed to send notification to user ${user.id} via ${channel}:`, error);
          errors++;
        }
      }
    }

    const stats = {
      sent,
      delivered,
      read: 0, // Will be updated as users read notifications
      clicked: 0 // Will be updated as users click action buttons
    };

    // Update notification status
    await updateNotificationStatus(notificationId, 'sent', stats);

    return {
      success: errors === 0,
      stats
    };
  } catch (error) {
    console.error('Error sending platform notification:', error);
    return {
      success: false,
      stats: { sent: 0, delivered: 0, read: 0, clicked: 0 }
    };
  }
}

/**
 * Get target tenants based on notification criteria
 */
async function getTargetTenants(notification: PlatformNotification): Promise<any[]> {
  try {
    let whereClause: any = {};

    switch (notification.targetAudience) {
      case 'all':
        whereClause = {
          status: 'ACTIVE'
        };
        break;
        
      case 'specific_tenants':
        if (notification.targetTenants && notification.targetTenants.length > 0) {
          whereClause = {
            id: {
              in: notification.targetTenants
            }
          };
        }
        break;
        
      case 'specific_plans':
        if (notification.targetPlans && notification.targetPlans.length > 0) {
          whereClause = {
            subscription: {
              planId: {
                in: notification.targetPlans
              },
              status: 'ACTIVE'
            }
          };
        }
        break;
        
      case 'admins':
        whereClause = {
          status: 'ACTIVE',
          users: {
            some: {
              role: {
                in: ['ADMIN', 'PLATFORM_ADMIN']
              },
              isActive: true
            }
          }
        };
        break;
    }

    const tenants = await prisma.tenant.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    return tenants;
  } catch (error) {
    console.error('Error getting target tenants:', error);
    return [];
  }
}

/**
 * Get target users from tenants
 */
async function getTargetUsers(tenants: any[], notification: PlatformNotification): Promise<any[]> {
  try {
    const tenantIds = tenants.map(t => t.id);
    
    let whereClause: any = {
      tenantId: {
        in: tenantIds
      },
      isActive: true
    };

    // If targeting admins specifically, filter by role
    if (notification.targetAudience === 'admins') {
      whereClause.role = {
        in: ['ADMIN', 'PLATFORM_ADMIN']
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return users;
  } catch (error) {
    console.error('Error getting target users:', error);
    return [];
  }
}

/**
 * Send notification to a specific user via a channel
 */
async function sendNotificationToUser(
  user: any,
  notification: PlatformNotification,
  channel: string
): Promise<void> {
  switch (channel) {
    case 'email':
      await sendEmailNotification(user, notification);
      break;
      
    case 'in_app':
      await createInAppNotification(user, notification);
      break;
      
    case 'sms':
      await sendSMSNotification(user, notification);
      break;
      
    case 'webhook':
      await sendWebhookNotification(user, notification);
      break;
      
    default:
      throw new Error(`Unsupported notification channel: ${channel}`);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(user: any, notification: PlatformNotification): Promise<void> {
  // In a real implementation, integrate with email service (SendGrid, AWS SES, etc.)
  console.log(`Sending email notification to ${user.email}:`, {
    subject: notification.title,
    content: notification.message,
    actionUrl: notification.actionUrl,
    actionText: notification.actionText
  });
  
  // Mock email sending delay
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Create in-app notification
 */
async function createInAppNotification(user: any, notification: PlatformNotification): Promise<void> {
  // In a real implementation, save to notifications table
  console.log(`Creating in-app notification for user ${user.id}:`, {
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority
  });
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(user: any, notification: PlatformNotification): Promise<void> {
  // In a real implementation, integrate with SMS service (Twilio, AWS SNS, etc.)
  if (!user.phone) {
    throw new Error('User has no phone number');
  }
  
  console.log(`Sending SMS notification to ${user.phone}:`, {
    message: `${notification.title}: ${notification.message}`
  });
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(user: any, notification: PlatformNotification): Promise<void> {
  // In a real implementation, send HTTP POST to tenant's webhook URL
  console.log(`Sending webhook notification for tenant ${user.tenant.id}:`, {
    event: 'platform_notification',
    data: {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      user: {
        id: user.id,
        email: user.email
      }
    }
  });
}

/**
 * Get platform notification by ID
 */
export async function getPlatformNotification(id: string): Promise<PlatformNotification | null> {
  // In a real implementation, fetch from database
  // For now, return mock data
  return {
    id,
    type: 'system',
    priority: 'medium',
    title: 'System Maintenance Scheduled',
    message: 'We will be performing scheduled maintenance on our servers.',
    targetAudience: 'all',
    createdAt: new Date().toISOString(),
    createdBy: 'system',
    status: 'draft'
  };
}

/**
 * Update notification status and stats
 */
export async function updateNotificationStatus(
  id: string,
  status: PlatformNotification['status'],
  stats?: PlatformNotification['deliveryStats']
): Promise<void> {
  // In a real implementation, update database
  console.log(`Updated notification ${id} status to ${status}`, stats);
}

/**
 * Get notification templates
 */
export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  // In a real implementation, fetch from database
  return [
    {
      id: 'maintenance',
      name: 'Maintenance Notification',
      type: 'maintenance',
      subject: 'Scheduled Maintenance - {{date}}',
      content: 'We will be performing maintenance on {{date}} from {{start_time}} to {{end_time}}. Expected downtime: {{duration}}.',
      variables: ['date', 'start_time', 'end_time', 'duration'],
      isActive: true
    },
    {
      id: 'feature_release',
      name: 'Feature Release',
      type: 'feature',
      subject: 'New Feature: {{feature_name}}',
      content: 'We\'re excited to announce {{feature_name}}! {{description}}',
      variables: ['feature_name', 'description'],
      isActive: true
    },
    {
      id: 'security_alert',
      name: 'Security Alert',
      type: 'security',
      subject: 'Security Alert: {{alert_type}}',
      content: 'We\'ve detected {{alert_type}}. Please {{action_required}}.',
      variables: ['alert_type', 'action_required'],
      isActive: true
    }
  ];
}

/**
 * Get notification channels
 */
export async function getNotificationChannels(): Promise<NotificationChannel[]> {
  // In a real implementation, fetch from database
  return [
    {
      id: 'email',
      name: 'Email',
      type: 'email',
      config: {
        template: 'default_email_template'
      },
      isActive: true
    },
    {
      id: 'in_app',
      name: 'In-App Notifications',
      type: 'in_app',
      config: {},
      isActive: true
    },
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'webhook',
      config: {
        endpoint: '/api/notifications/webhook'
      },
      isActive: true
    }
  ];
}

/**
 * Schedule notification for future delivery
 */
export async function scheduleNotification(
  notification: PlatformNotification,
  scheduledFor: Date
): Promise<void> {
  // In a real implementation, use a job queue (Bull, Agenda, etc.)
  console.log(`Scheduled notification ${notification.id} for ${scheduledFor.toISOString()}`);
  
  // Mock scheduling
  setTimeout(async () => {
    await sendPlatformNotification(notification.id);
  }, scheduledFor.getTime() - Date.now());
}

/**
 * Cancel scheduled notification
 */
export async function cancelNotification(id: string): Promise<boolean> {
  try {
    // In a real implementation, remove from job queue and update database
    await updateNotificationStatus(id, 'cancelled');
    console.log(`Cancelled notification ${id}`);
    return true;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
}

/**
 * Get notification analytics
 */
export async function getNotificationAnalytics(period: number = 30): Promise<{
  totalSent: number;
  deliveryRate: number;
  readRate: number;
  clickRate: number;
  byType: { [type: string]: number };
  byChannel: { [channel: string]: number };
}> {
  // In a real implementation, aggregate from database
  return {
    totalSent: 1250,
    deliveryRate: 98.5,
    readRate: 75.2,
    clickRate: 12.8,
    byType: {
      system: 450,
      maintenance: 200,
      feature: 300,
      security: 150,
      billing: 100,
      announcement: 50
    },
    byChannel: {
      email: 800,
      in_app: 1250,
      sms: 200,
      webhook: 150
    }
  };
}