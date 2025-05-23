import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  return authMiddlewareAppRouter(req, async (req, session, prisma) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          image: true,
          bio: true,
          emailVerified: true,
          twoFactorAuth: {
            select: {
              enabled: true
            }
          }
        }
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      return NextResponse.json(user)
    } catch (error) {
      console.error("[SETTINGS_GET]", error)
      return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
  })
}

export async function PUT(req: NextRequest) {
  return authMiddlewareAppRouter(req, async (req, session, prisma) => {
    try {
      const body = await req.json()
      const { name, email, bio } = body

      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name,
          email,
          bio
        },
        select: {
          name: true,
          email: true,
          image: true,
          bio: true,
          emailVerified: true,
          twoFactorAuth: {
            select: {
              enabled: true
            }
          }
        }
      })

      return NextResponse.json(user)
    } catch (error) {
      console.error("[SETTINGS_PUT]", error)
      return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
  })
} 