import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"

dotenv.config()

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

interface MemberStatusUpdate {
  userId: string
  status: "online" | "offline" | "idle" | "dnd"
  serverId: string
}

interface MemberRoleUpdate {
  memberId: string
  role: "ADMIN" | "MODERATOR" | "MEMBER"
  serverId: string
}

interface MemberKicked {
  memberId: string
  serverId: string
}

interface DirectMessage {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
}

interface CallSignal {
  type: "offer" | "answer" | "candidate"
  offer?: any
  answer?: any
  candidate?: any
  to: string
  from?: string
}

interface CallEnded {
  to: string
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string
  const serverId = socket.handshake.query.serverId as string

  if (userId) {
    socket.join(`user:${userId}`)
  }

  if (serverId) {
    socket.join(`server:${serverId}`)
  }

  // Handle member status updates
  socket.on("memberStatusUpdate", (data: MemberStatusUpdate) => {
    io.to(`server:${data.serverId}`).emit("memberStatusUpdate", {
      userId: data.userId,
      status: data.status
    })
  })

  // Handle member role updates
  socket.on("memberRoleUpdate", (data: MemberRoleUpdate) => {
    io.to(`server:${data.serverId}`).emit("memberRoleUpdate", {
      memberId: data.memberId,
      role: data.role
    })
  })

  // Handle member kicks
  socket.on("memberKicked", (data: MemberKicked) => {
    io.to(`server:${data.serverId}`).emit("memberKicked", {
      memberId: data.memberId
    })
  })

  // Handle direct messages
  socket.on("directMessage", (message: DirectMessage) => {
    io.to(`user:${message.receiverId}`).emit("directMessage", message)
  })

  // Handle call signals
  socket.on("callSignal", (data: CallSignal) => {
    io.to(`user:${data.to}`).emit("callSignal", {
      ...data,
      from: userId
    })
  })

  // Handle call ended
  socket.on("callEnded", (data: CallEnded) => {
    io.to(`user:${data.to}`).emit("callEnded")
  })

  socket.on("disconnect", () => {
    if (userId) {
      io.to(`server:${serverId}`).emit("memberStatusUpdate", {
        userId,
        status: "offline"
      })
    }
  })
})

const PORT = process.env.SOCKET_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
}) 

for(int i=0;i<10;i++){
printf("hello");
