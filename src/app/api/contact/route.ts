import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { headers } from "next/headers";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  phone: z.string().optional(),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000),
  inquiryType: z
    .enum([
      "GENERAL",
      "SUPPORT",
      "SALES",
      "BILLING",
      "TECHNICAL",
      "PARTNERSHIP",
    ])
    .default("GENERAL"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validatedData = contactSchema.parse(body);

    // Get client IP and user agent
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Save to database
    const contact = await prisma.contact.create({
      data: {
        ...validatedData,
        ipAddress,
        userAgent,
      },
    });

    // TODO: Send email notification to admin
    // You can integrate with services like SendGrid, Resend, or Nodemailer here

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for your message. We will get back to you soon!",
        contactId: contact.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact form submission error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid form data",
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve contact submissions (admin only)
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check for admin users

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const inquiryType = searchParams.get("inquiryType");

    const where: any = {};
    if (status) where.status = status;
    if (inquiryType) where.inquiryType = inquiryType;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}
