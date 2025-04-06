"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ChevronRight, Edit, MessageSquare, Users, Menu, Shield, UserPlus, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EventCard } from "@/components/event-card"
import { ModernEventCarousel } from "@/components/modern-event-carousel"
import { AnnouncementCard } from "@/components/announcement-card"
import { GroupCard } from "@/components/group-card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ShareDialog } from "@/components/share-dialog"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { CreateAnnouncementDialog } from "@/components/create-announcement-dialog"
import { CreateGroupDialog } from "@/components/create-group-dialog"
import { MembersDialog } from "@/components/manage-members-dialog"
import { PrivateServerAccessDialog } from "@/components/private-server-access-dialog"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import { useSession } from "next-auth/react"
import React from "react"
import { useParams } from "next/navigation"
import {Server, MemberRole,Event,Group,Announcement,ServerMember} from "@prisma/client"
import { useStore } from "@/hooks/use-store"

// interface ServerWithMembers extends Server {
//   members: ServerMember[]
// }



export default function ServerPage() {
  const { toast } = useToast()
  const params = useParams<{ serverId: string }>();
  const serverId = params.serverId

  // State for private server access
  const [hasAccess, setHasAccess] = useState(false)
  const [showAccessDialog, setShowAccessDialog] = useState(false)
  const [userRole, setUserRole] = useState<MemberRole>(MemberRole.VISITOR)
  const [isLoading, setIsLoading] = useState(true)
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { setServerData, setRole } = useStore()
  // Server data
  const [server, setServer] = useState<Server | null>(null)


  // Events data
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])

  // Announcements data
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  // Groups data
  const [groups, setGroups] = useState<Group[]>([])

  // Load server data and check access
  useEffect(() => {
    const loadServerData = async () => {
      try {
        // Fetch server data
        const serverRes = await axios.get<Server>(`/api/servers/${serverId}`)
        if (!serverRes.status) throw new Error('Failed to fetch server data')
        setServer(serverRes.data)
        setUserRole(serverRes.data.members[0].role)
       
        

        // If server is private, check access
        // if (serverData.isPrivate) {
        //   const accessRes = await fetch(`/api/servers/${serverId}/access`)
        //   if (!accessRes.ok) throw new Error('Failed to check access')
        //   const accessData = await accessRes.json()
        //   setHasAccess(accessData.hasAccess)
        //   setUserRole(accessData.role)
        //   if (!accessData.hasAccess) {
        //     setShowAccessDialog(true)
        //   }
        // }

        // Fetch events
        const eventsRes = await fetch(`/api/servers/${serverId}/events`)
        if (!eventsRes.ok) throw new Error('Failed to fetch events')
        const eventsData = await eventsRes.json()
        setUpcomingEvents(eventsData.upcoming)
        setPastEvents(eventsData.past)

        // Fetch announcements
        const announcementsRes = await fetch(`/api/servers/${serverId}/announcements`)
        if (!announcementsRes.ok) throw new Error('Failed to fetch announcements')
        const announcementsData = await announcementsRes.json()
        setAnnouncements(announcementsData.announcements)

        // Fetch groups
        const groupsRes = await fetch(`/api/servers/${serverId}/groups`)
        if (!groupsRes.ok) throw new Error('Failed to fetch groups')
        const groupsData = await groupsRes.json()
        setGroups(groupsData.groups)

        setIsLoading(false)
      } catch (error) {
        console.error('Error loading server data:', error)
        toast({
          title: "Error",
          description: "Failed to load server data. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    loadServerData()
  }, [serverId, toast])

  const isAdmin = userRole === MemberRole.ADMIN
  const isModerator = userRole === MemberRole.MODERATOR
  const hasEditRights = isAdmin || isModerator

  // Handle private server access
  const handleAccessSubmit = async (accessKey: string) => {
    try {
      const response = await axios.get<{ success: boolean; role: "member" | "visitor" }>(
        `/api/servers/${serverId}/access`,
        {
          params: {
            accessKey,
          },
        },
      )

      if (response.data.success) {
        setHasAccess(true)
        setShowAccessDialog(false)
        setUserRole(response.data.role)

        // Fetch server data again
        const serverData = await axios.get<Server>(`/api/servers/${serverId}`)
        setServer(serverData.data)

        // Fetch events
        const eventsData = await axios.get<{
          upcoming: Event[]
          past: Event[]
        }>(`/api/servers/${serverId}/events`)

        setUpcomingEvents(eventsData.data.upcoming)
        setPastEvents(eventsData.data.past)

        // Fetch announcements
        const announcementsData = await axios.get<Announcement[]>(`/api/servers/${serverId}/announcements`)
        setAnnouncements(announcementsData.data)

        // Fetch groups
        const groupsData = await axios.get<Group[]>(`/api/servers/${serverId}/groups`)
        setGroups(groupsData.data)
      } else {
        toast({
          title: "Invalid access key",
          description: "The access key you provided is invalid. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting access key:", error)
      toast({
        title: "Error",
        description: "Failed to verify access key. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Join server handler
  const handleJoinServer = async () => {
    try {
      await axios.get(`/api/servers/${serverId}/join`, {
        method: "POST",
      })

      toast({
        title: "Success",
        description: "You have joined the server",
      })

      // Update server data
      const serverData = await axios.get<Server>(`/api/servers/${serverId}`)
      setServer({
        ...serverData.data,
        isJoined: true,
      })

      // Update user role
      setUserRole("member")
    } catch (error) {
      console.error("Error joining server:", error)
      toast({
        title: "Error",
        description: "Failed to join server. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (showAccessDialog) {
    return (
      <PrivateServerAccessDialog
        serverName={server?.name || "Private Server"}
        onSubmit={handleAccessSubmit}
        onCancel={() => (window.location.href = "/")}
      />
    )
  }

  if (!server) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Server not found</h1>
          <p className="text-muted-foreground">The server you're looking for doesn't exist or you don't have access.</p>
          <Button className="mt-4" asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[200px] w-full md:h-[300px]">
        <Image
          src={server.bannerUrl || "/placeholder.svg"}
          alt={`${server.name} banner`}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container relative -mt-20 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start sm:flex-row sm:items-end sm:gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border-4 border-background bg-background sm:h-32 sm:w-32">
              <Image
                src={server.imageUrl || "/placeholder.svg"}
                alt={`${server.name} logo`}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="mt-2 flex items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{server.name}</h1>
                {server.isPrivate && (
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    <Lock className="mr-1 h-3 w-3" />
                    Private
                  </Badge>
                )}
                {isAdmin && (
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </Badge>
                )}
                {isModerator && (
                  <Badge variant="outline" className="border-primary text-primary">
                    <Shield className="mr-1 h-3 w-3" />
                    Moderator
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{server._count.members} members</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {isAdmin && (
              <>
                <Button className="flex-1 sm:flex-none" asChild >
                  <Link href={`/server/${serverId}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Server
                  </Link>
                </Button>
              </>
            )}
            <MembersDialog serverId={serverId} />
            {userRole==MemberRole.VISITOR && (
              <Button className="flex-1 sm:flex-none" onClick={handleJoinServer}>
                {server.isPrivate ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Request Access
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Join Server
                  </>
                )}
              </Button>
            )}
            <ShareDialog title={server.name} url={`/server/${serverId}`} type="server" />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-muted-foreground">{server.description}</p>
        </div>

        {/* Mobile tabs navigation */}
        <div className="mt-8 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>Navigate Server</span>
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <div className="grid gap-4 py-4">
                <Button variant="ghost" className="justify-start" asChild>
                  <Link href="#events">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Events
                  </Link>
                </Button>
                {(hasAccess || !server.isPrivate) && (
                  <>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="#announcements">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Announcements
                      </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="#groups">
                        <Users className="mr-2 h-4 w-4" />
                        Groups
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop tabs */}
        <Tabs defaultValue="events" className="mt-8">
          <TabsList className="hidden w-full justify-start md:flex">
            <TabsTrigger value="events" className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              Events
            </TabsTrigger>
            {(hasAccess || !server.isPrivate) && (
              <>
                <TabsTrigger value="announcements" className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Announcements
                </TabsTrigger>
                <TabsTrigger value="groups" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Groups
                </TabsTrigger>
              </>
            )}
            {!hasAccess && server.isPrivate && (
              <div className="ml-auto flex items-center">
                <Badge variant="outline" className="flex gap-1 text-amber-500">
                  <Lock className="h-3 w-3" />
                  Join this server to view all content
                </Badge>
              </div>
            )}
          </TabsList>

          <TabsContent value="events" className="mt-6 space-y-8 animate-fade-in" id="events">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Upcoming Events</h2>
              {hasEditRights && (
                <CreateEventDialog
                  serverId={serverId}
                  // onEventCreated={async () => {
                  //   // Refresh events after creation
                  //   const eventsData = await apiClient<{
                  //     upcoming: {
                  //       today: Event[]
                  //       tomorrow: Event[]
                  //       thisWeek: Event[]
                  //     }
                  //     past: Event[]
                  //   }>(`/api/servers/${serverId}/events`)

                  //   setUpcomingEvents(eventsData.upcoming)
                  //   setPastEvents(eventsData.past)
                  // }}
                />
              )}
            </div>

            {/* Today's events */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Today</h3>
                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
              </div>
            )}

            {/* No upcoming events */}
            {Object.values(upcomingEvents).length==0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <h3 className="mb-2 text-lg font-semibold">No upcoming events</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {hasEditRights ? "Create an event to get started" : "Check back later for upcoming events"}
                </p>
                {hasEditRights && (
                  <CreateEventDialog
                    serverId={serverId}
                    // onEventCreated={async () => {
                    //   // Refresh events after creation
                    //   const eventsData = await apiClient<{
                    //     upcoming: {
                    //       today: Event[]
                    //       tomorrow: Event[]
                    //       thisWeek: Event[]
                    //     }
                    //     past: Event[]
                    //   }>(`/api/servers/${serverId}/events`)

                    //   setUpcomingEvents(eventsData.upcoming)
                    //   setPastEvents(eventsData.past)
                    // }}
                  />
                )}
              </div>
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Past Events</h3>
                <Button variant="ghost" size="sm" className="gap-1" asChild>
                  <Link href={`/server/${serverId}/past-events`}>
                    View all <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map((event) => (
                  <Link key={event.id} href={`/server/${serverId}/event/${event.id}`}>
                    <EventCard event={event} isPast serverId={serverId} />
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>

          {(hasAccess || !server.isPrivate) && (
            <>
              <TabsContent value="announcements" className="mt-6 space-y-8 animate-fade-in" id="announcements">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Announcements</h2>
                  {hasEditRights && (
                    <CreateAnnouncementDialog
                      serverId={serverId}
                      // onAnnouncementCreated={async () => {
                      //   // Refresh announcements after creation
                      //   const announcementsData = await apiClient<Announcement[]>(
                      //     `/api/servers/${serverId}/announcements`,
                      //   )
                      //   setAnnouncements(announcementsData)
                      // }}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  {announcements.length > 0 ? (
                    announcements.map((announcement) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        canEdit={hasEditRights}
                        serverId={serverId}
                        // onUpdate={async () => {
                        //   // Refresh announcements after update
                        //   const announcementsData = await apiClient<Announcement[]>(
                        //     `/api/servers/${serverId}/announcements`,
                        //   )
                        //   setAnnouncements(announcementsData)
                        // }}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                      <h3 className="mb-2 text-lg font-semibold">No announcements yet</h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {hasEditRights ? "Create an announcement to get started" : "Check back later for announcements"}
                      </p>
                      {hasEditRights && (
                        <CreateAnnouncementDialog
                          serverId={serverId}
                          // onAnnouncementCreated={async () => {
                          //   // Refresh announcements after creation
                          //   const announcementsData = await apiClient<Announcement[]>(
                          //     `/api/servers/${serverId}/announcements`,
                          //   )
                          //   setAnnouncements(announcementsData)
                          // }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="groups" className="mt-6 space-y-8 animate-fade-in" id="groups">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Groups</h2>
                  {hasEditRights && (
                    <CreateGroupDialog
                      serverId={serverId}
                      // onGroupCreated={async () => {
                      //   // Refresh groups after creation
                      //   const groupsData = await apiClient<Group[]>(`/api/servers/${serverId}/groups`)
                      //   setGroups(groupsData)
                      // }}
                    />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        serverId={server.id}
                        canEdit={hasEditRights}
                        // onUpdate={async () => {
                        //   // Refresh groups after update
                        //   const groupsData = await apiClient<Group[]>(`/api/servers/${serverId}/groups`)
                        //   setGroups(groupsData)
                        // }}
                      />
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                      <h3 className="mb-2 text-lg font-semibold">No groups yet</h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {hasEditRights ? "Create a group to get started" : "Check back later for groups"}
                      </p>
                      {hasEditRights && (
                        <CreateGroupDialog
                          serverId={serverId}
                          // onGroupCreated={async () => {
                          //   // Refresh groups after creation
                          //   const groupsData = await apiClient<Group[]>(`/api/servers/${serverId}/groups`)
                          //   setGroups(groupsData)
                          // }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Mobile content sections */}
        <div className="mt-8 space-y-12 md:hidden">
          <section id="events" className="space-y-8 scroll-mt-16">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Upcoming Events</h2>
              {hasEditRights && (
                <CreateEventDialog
                  serverId={serverId}
                  buttonSize="sm"
                  // onEventCreated={async () => {
                  //   // Refresh events after creation
                  //   const eventsData = await apiClient<{
                  //     upcoming: {
                  //       today: Event[]
                  //       tomorrow: Event[]
                  //       thisWeek: Event[]
                  //     }
                  //     past: Event[]
                  //   }>(`/api/servers/${serverId}/events`)

                  //   setUpcomingEvents(eventsData.upcoming)
                  //   setPastEvents(eventsData.past)
                  // }}
                />
              )}
            </div>

            {/* Today's events */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Today</h3>
                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
              </div>
            )}

            {/* Tomorrow's events */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tomorrow</h3>
                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
              </div>
            )}

            {/* This week's events */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">This Week</h3>
                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
              </div>
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Past Events</h3>
                <Button variant="ghost" size="sm" className="gap-1" asChild>
                  <Link href={`/server/${serverId}/past-events`}>
                    View all <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {pastEvents.map((event) => (
                  <Link key={event.id} href={`/server/${serverId}/event/${event.id}`}>
                    <EventCard event={event} isPast serverId={serverId} />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {(hasAccess || !server.isPrivate) && (
            <>
              <section id="announcements" className="space-y-8 scroll-mt-16">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Announcements</h2>
                  {hasEditRights && (
                    <CreateAnnouncementDialog
                      serverId={serverId}
                      buttonSize="sm"
                      // onAnnouncementCreated={async () => {
                      //   // Refresh announcements after creation
                      //   const announcementsData = await apiClient<Announcement[]>(
                      //     `/api/servers/${serverId}/announcements`,
                      //   )
                      //   setAnnouncements(announcementsData)
                      // }}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <AnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      canEdit={hasEditRights}
                      serverId={serverId}
                      // onUpdate={async () => {
                      //   // Refresh announcements after update
                      //   const announcementsData = await apiClient<Announcement[]>(
                      //     `/api/servers/${serverId}/announcements`,
                      //   )
                      //   setAnnouncements(announcementsData)
                      // }}
                    />
                  ))}
                </div>
              </section>

              <section id="groups" className="space-y-8 scroll-mt-16">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Groups</h2>
                  {hasEditRights && (
                    <CreateGroupDialog
                      serverId={serverId}
                      buttonSize="sm"
                      // onGroupCreated={async () => {
                      //   // Refresh groups after creation
                      //   const groupsData = await apiClient<Group[]>(`/api/servers/${serverId}/groups`)
                      //   setGroups(groupsData)
                      // }}
                    />
                  )}
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      serverId={server.id}
                      canEdit={hasEditRights}
                      // onUpdate={async () => {
                      //   // Refresh groups after update
                      //   const groupsData = await apiClient<Group[]>(`/api/servers/${serverId}/groups`)
                      //   setGroups(groupsData)
                      // }}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

