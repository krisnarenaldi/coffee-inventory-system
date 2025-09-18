import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import {
  createPlatformNotification,
  sendPlatformNotification,
  getPlatformNotification,
  updateNotificationStatus,
  getNotificationTemplates,
  getNotificationChannels,
  scheduleNotification,
  cancelNotification,
  getNotificationAnalytics,
  PlatformNotification,
} from "../../../../../lib/platform-notifications";

// GET /api/admin/notifications - Get notifications, templates, channels, or analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "notifications";
    const id = searchParams.get("id");
    const period = parseInt(searchParams.get("period") || "30");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    switch (type) {
      case "notification":
        if (!id) {
          return NextResponse.json(
            { error: "Notification ID is required" },
            { status: 400 }
          );
        }
        const notification = await getPlatformNotification(id);
        if (!notification) {
          return NextResponse.json(
            { error: "Notification not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(notification);

      case "templates":
        const templates = await getNotificationTemplates();
        return NextResponse.json({ templates });

      case "channels":
        const channels = await getNotificationChannels();
        return NextResponse.json({ channels });

      case "analytics":
        const analytics = await getNotificationAnalytics(period);
        return NextResponse.json(analytics);

      case "notifications":
      default:
        // Mock notifications list (in real implementation, fetch from database)
        const notifications = await getMockNotifications(status, limit);
        return NextResponse.json({ notifications });
    }
  } catch (error) {
    console.error("Error fetching notifications data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/notifications - Create or send notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create":
        const {
          type,
          priority,
          title,
          message,
          targetAudience,
          targetTenants,
          targetPlans,
          scheduledFor,
          expiresAt,
          actionUrl,
          actionText,
        } = data;

        if (!type || !priority || !title || !message || !targetAudience) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const notification = await createPlatformNotification({
          type,
          priority,
          title,
          message,
          targetAudience,
          targetTenants,
          targetPlans,
          scheduledFor,
          expiresAt,
          actionUrl,
          actionText,
          createdBy: session.user.id,
        });

        // If scheduled for future, schedule it
        if (scheduledFor) {
          await scheduleNotification(notification, new Date(scheduledFor));
        }

        return NextResponse.json({
          message: "Notification created successfully",
          notification,
        });

      case "send":
        const { notificationId, channels } = data;

        if (!notificationId) {
          return NextResponse.json(
            { error: "Notification ID is required" },
            { status: 400 }
          );
        }

        const result = await sendPlatformNotification(notificationId, channels);

        return NextResponse.json({
          message: result.success
            ? "Notification sent successfully"
            : "Notification sent with errors",
          success: result.success,
          stats: result.stats,
        });

      case "schedule":
        const { notification: notifData, scheduledFor: scheduleDate } = data;

        if (!notifData || !scheduleDate) {
          return NextResponse.json(
            { error: "Notification data and schedule date are required" },
            { status: 400 }
          );
        }

        const createdNotification = await createPlatformNotification({
          ...notifData,
          createdBy: session.user.id,
          scheduledFor: scheduleDate,
        });

        await scheduleNotification(createdNotification, new Date(scheduleDate));

        return NextResponse.json({
          message: "Notification scheduled successfully",
          notification: createdNotification,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing notification request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/notifications - Update notification status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, status, stats } = body;

    if (!notificationId || !status) {
      return NextResponse.json(
        { error: "Notification ID and status are required" },
        { status: 400 }
      );
    }

    await updateNotificationStatus(notificationId, status, stats);

    return NextResponse.json({
      message: "Notification status updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/notifications - Cancel notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const success = await cancelNotification(notificationId);

    if (success) {
      return NextResponse.json({
        message: "Notification cancelled successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to cancel notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error cancelling notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get mock notifications
async function getMockNotifications(
  status?: string | null,
  limit: number = 50
): Promise<PlatformNotification[]> {
  // In a real implementation, fetch from database
  const allNotifications: PlatformNotification[] = [
    {
      id: "notif_1",
      type: "maintenance",
      priority: "high",
      title: "Scheduled Maintenance - December 15th",
      message:
        "We will be performing scheduled maintenance on December 15th from 2:00 AM to 4:00 AM UTC. Expected downtime: 2 hours.",
      targetAudience: "all",
      scheduledFor: "2024-12-15T02:00:00Z",
      createdAt: "2024-12-10T10:00:00Z",
      createdBy: "admin_1",
      status: "scheduled",
      deliveryStats: {
        sent: 0,
        delivered: 0,
        read: 0,
        clicked: 0,
      },
    },
    {
      id: "notif_2",
      type: "feature",
      priority: "medium",
      title: "New Feature: Advanced Analytics Dashboard",
      message:
        "We're excited to announce our new Advanced Analytics Dashboard with real-time insights and custom reports.",
      targetAudience: "admins",
      actionUrl: "/analytics",
      actionText: "Explore Analytics",
      createdAt: "2024-12-08T14:30:00Z",
      createdBy: "admin_1",
      status: "sent",
      deliveryStats: {
        sent: 150,
        delivered: 148,
        read: 112,
        clicked: 45,
      },
    },
    {
      id: "notif_3",
      type: "security",
      priority: "critical",
      title: "Security Update Required",
      message:
        "A critical security update is available. Please update your passwords and enable two-factor authentication.",
      targetAudience: "all",
      actionUrl: "/security",
      actionText: "Update Security",
      createdAt: "2024-12-05T09:15:00Z",
      createdBy: "admin_1",
      status: "sent",
      deliveryStats: {
        sent: 500,
        delivered: 495,
        read: 420,
        clicked: 380,
      },
    },
    {
      id: "notif_4",
      type: "billing",
      priority: "medium",
      title: "Billing System Upgrade",
      message:
        "Our billing system has been upgraded with new features including automated invoicing and payment reminders.",
      targetAudience: "admins",
      createdAt: "2024-12-03T16:45:00Z",
      createdBy: "admin_1",
      status: "sent",
      deliveryStats: {
        sent: 150,
        delivered: 150,
        read: 135,
        clicked: 67,
      },
    },
    {
      id: "notif_5",
      type: "announcement",
      priority: "low",
      title: "Holiday Schedule",
      message:
        "Our support team will have limited availability during the holiday season. Emergency support will still be available.",
      targetAudience: "all",
      createdAt: "2024-12-01T12:00:00Z",
      createdBy: "admin_1",
      status: "draft",
    },
  ];

  // Filter by status if provided
  let filteredNotifications = allNotifications;
  if (status) {
    filteredNotifications = allNotifications.filter((n) => n.status === status);
  }

  // Apply limit
  return filteredNotifications.slice(0, limit);
}
