'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'
import { registerGuest, getPhotos, savePhotoRecord, toggleLike, deletePhoto, getEventTagsAndChallenges, checkGuestKahootAttempt, getEventSchedule, addGuestbookEntry, getGuestbookEntries } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Image as ImageIcon, Heart, Loader2, Upload, Trash2, Download, Tag, Trophy, X, CalendarCheck, Clock, CheckCircle2, BookOpen, Lock, MessageSquare, Send, Sparkles, MapPin, Navigation, ExternalLink, ChevronLeft, ChevronRight, Layers, Search } from 'lucide-react'
import { getGoogleMapsUrl, parseScheduleLocation } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LocationMapModal } from '@/components/common/LocationMapModal'
import { SeatingFinderModal } from '@/components/guest/SeatingFinderModal'

export default function GuestFlow({ event }: { event: any }) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [guestId, setGuestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for guest_id
    const stored = localStorage.getItem(`appboda_guest_${event.id}`)
    if (stored) {
      setGuestId(stored)
    }
    setLoading(false)
  }, [event.id])

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-pulse">Cargando...</div></div>
  }

  if (!guestId) {
    return <GuestOnboarding event={event} onComplete={(id) => {
      localStorage.setItem(`appboda_guest_${event.id}`, id)
      setGuestId(id)
    }} />
  }

  return <GuestFeed event={event} guestId={guestId} />
}

function GuestOnboarding({ event, onComplete }: { event: any, onComplete: (id: string) => void }) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const res = await registerGuest(event.id, name)
      if (res.error) throw new Error(res.error)
      if (res.guest) {
        onComplete(res.guest.id)
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12 p-4 relative">
      <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
      <Card className="liquid-glass liquid-glass-card rounded-2xl border-white/60 dark:border-white/10 shadow-2xl relative z-10 backdrop-blur-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-sky-600 to-primary bg-clip-text text-transparent">¡Bienvenido/a!</CardTitle>
          <CardDescription className="text-muted-foreground/90 font-medium">
            Para compartir fotos y mensajes con {event.bride_name} y {event.groom_name}, dinos tu nombre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Tu nombre y apellidos</Label>
              <Input 
                id="name" 
                placeholder="Ej. Ana García" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl"
              />
            </div>
            {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">{error}</div>}
            <Button type="submit" className="w-full font-semibold shadow-lg shadow-primary/20 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 transition-all" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Entrando...' : 'Entrar a la sala'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function GuestFeed({ event, guestId }: { event: any, guestId: string }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [expandedPhoto, setExpandedPhoto] = useState<any | null>(null)
  const [hasPlayedKahoot, setHasPlayedKahoot] = useState(false)
  
  // Schedule / Timeline State
  const [schedule, setSchedule] = useState<any[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [nowMinutes, setNowMinutes] = useState<number>(0)

  // Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedScheduleLocation, setSelectedScheduleLocation] = useState<{ location: string; title: string } | null>(null)

  // Seating Plan State
  const [showSeatingModal, setShowSeatingModal] = useState(false)

  // Guestbook State
  const [guestbookEntries, setGuestbookEntries] = useState<any[]>([])
  const [showGuestbookModal, setShowGuestbookModal] = useState(false)
  const [guestbookContent, setGuestbookContent] = useState('')
  const [guestbookIsPrivate, setGuestbookIsPrivate] = useState(false)
  const [submittingGuestbook, setSubmittingGuestbook] = useState(false)

  // Tagging & Filters State
  const [activeFilter, setActiveFilter] = useState<{type: 'all' | 'tag' | 'challenge', id?: string}>({type: 'all'})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null)
  
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [availableChallenges, setAvailableChallenges] = useState<any[]>([])
  
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)

  // Horizontal Category Scroll States
  const filterScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)

  const checkFilterScroll = useCallback(() => {
    if (!filterScrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = filterScrollRef.current
    setCanScrollLeft(scrollLeft > 5)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
  }, [])

  const scrollFilters = (direction: 'left' | 'right') => {
    if (!filterScrollRef.current) return
    const scrollAmount = direction === 'left' ? -220 : 220
    filterScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    setTimeout(checkFilterScroll, 350)
  }

  // Para la animación del corazón al hacer doble clic
  const [heartAnim, setHeartAnim] = useState<{ id: string, x: number, y: number } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchPhotos()
    fetchTagsAndChallenges()
    checkKahootPlayed()
    fetchSchedule()
    fetchGuestbook()

    const updateTime = () => {
      const d = new Date()
      setNowMinutes(d.getHours() * 60 + d.getMinutes())
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setTimeout(checkFilterScroll, 200)
    window.addEventListener('resize', checkFilterScroll)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkFilterScroll)
    }
  }, [availableTags, availableChallenges, isFilterExpanded, checkFilterScroll])

  const fetchGuestbook = async () => {
    const res = await getGuestbookEntries(event.id)
    if (res.entries) {
      setGuestbookEntries(res.entries)
    }
  }

  const handleGuestbookSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestbookContent.trim()) return

    setSubmittingGuestbook(true)
    const res = await addGuestbookEntry(event.id, guestId, guestbookContent, guestbookIsPrivate)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      setGuestbookContent('')
      setGuestbookIsPrivate(false)
      await fetchGuestbook()
      if (guestbookIsPrivate) {
        toast.success('¡Mensaje privado enviado solo a los novios! 🔒')
      } else {
        toast.success('¡Tu dedicatoria ha sido publicada en el libro de firmas! 💖')
      }
    }
    setSubmittingGuestbook(false)
  }

  const fetchSchedule = async () => {
    const res = await getEventSchedule(event.id)
    if (res.schedule) {
      setSchedule(res.schedule)
    }
  }

  const getItemMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':')
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
  }

  const getTodayYYYYMMDD = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getScheduleItemStatus = (item: any, index: number, allItems: any[]) => {
    const todayStr = getTodayYYYYMMDD()
    const eventDateStr = event.event_date ? String(event.event_date).slice(0, 10) : todayStr

    if (eventDateStr > todayStr) {
      return 'upcoming'
    } else if (eventDateStr < todayStr) {
      return 'completed'
    }

    const itemMins = getItemMinutes(item.scheduled_time)
    const nextItem = allItems[index + 1]
    const nextMins = nextItem ? getItemMinutes(nextItem.scheduled_time) : itemMins + 120

    if (nowMinutes >= itemMins && nowMinutes < nextMins) {
      return 'active'
    } else if (nowMinutes < itemMins) {
      return 'upcoming'
    } else {
      return 'completed'
    }
  }

  const activeScheduleEvent = schedule.find((item, idx) => getScheduleItemStatus(item, idx, schedule) === 'active')
  const nextScheduleEvent = !activeScheduleEvent ? schedule.find((item, idx) => getScheduleItemStatus(item, idx, schedule) === 'upcoming') : null

  const checkKahootPlayed = async () => {
    const res = await checkGuestKahootAttempt(event.id, guestId)
    if (res.hasPlayed) {
      setHasPlayedKahoot(true)
    }
  }

  const fetchPhotos = async () => {
    const res = await getPhotos(event.id)
    if (res.data) {
      setPhotos(res.data)
    }
    setLoading(false)
  }

  const fetchTagsAndChallenges = async () => {
    const { tags, challenges } = await getEventTagsAndChallenges(event.id)
    setAvailableTags(tags)
    setAvailableChallenges(challenges)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setShowMenu(false)
    setSelectedFiles(files)
    const previews = files.map(file => window.URL.createObjectURL(file))
    setSelectedFilePreviews(previews)
    setSelectedTags([])
    setSelectedChallenge(null)
    
    // Reseteamos inputs
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const cancelUpload = () => {
    selectedFilePreviews.forEach(url => window.URL.revokeObjectURL(url))
    setSelectedFiles([])
    setSelectedFilePreviews([])
    setSelectedTags([])
    setSelectedChallenge(null)
    setUploadProgress(null)
  }

  const removeFile = (index: number) => {
    if (selectedFilePreviews[index]) {
      window.URL.revokeObjectURL(selectedFilePreviews[index])
    }
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = selectedFilePreviews.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    setSelectedFilePreviews(newPreviews)
    if (newFiles.length === 0) {
      cancelUpload()
    }
  }

  const confirmUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setUploadProgress({ current: 0, total: selectedFiles.length })

    try {
      // Comprimir la imagen manteniendo alta resolución (Max 2560px, calidad 85%)
      const compressionOptions = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2560,
        useWebWorker: true,
        initialQuality: 0.85,
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setUploadProgress({ current: i + 1, total: selectedFiles.length })

        let fileToUpload: File = file
        if (file.type.startsWith('image/')) {
          try {
            const compressedBlob = await imageCompression(file, compressionOptions)
            fileToUpload = new File([compressedBlob], file.name, {
              type: compressedBlob.type || file.type,
            })
          } catch (compErr) {
            console.warn('Compression fallback to original file', compErr)
          }
        }

        const fileExt = fileToUpload.name.split('.').pop() || 'jpg'
        const fileName = `${event.id}/${crypto.randomUUID()}.${fileExt}`

        // Subir a Storage
        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(fileName, fileToUpload)

        if (uploadError) throw uploadError

        // Guardar en BD con tags y challenge
        await savePhotoRecord(event.id, guestId, fileName, selectedChallenge, selectedTags)
      }

      // Limpiar y refrescar
      const count = selectedFilePreviews.length
      cancelUpload()
      await fetchPhotos()
      toast.success(count === 1 ? '¡Foto publicada con éxito! 📸' : `¡${count} fotos publicadas con éxito! 📸`)

    } catch (err) {
      console.error('Upload failed', err)
      toast.error('Error al subir las fotos')
      await fetchPhotos()
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  const handleToggleLike = async (e: React.MouseEvent, photoId: string, forceLikeOnly: boolean = false) => {
    e.stopPropagation()
    if (!guestId) return

    const targetPhoto = photos.find(p => p.id === photoId)
    if (!targetPhoto) return

    const isCurrentlyLiked = Boolean(
      targetPhoto.photo_likes && targetPhoto.photo_likes.some((l: any) => l.guest_id === guestId)
    )

    // If double click on an already liked photo, trigger visual heart bounce without incrementing
    if (forceLikeOnly && isCurrentlyLiked) {
      const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect?.()
      if (rect && e.clientX && e.clientY) {
        setHeartAnim({ id: photoId, x: e.clientX - rect.left, y: e.clientY - rect.top })
      } else {
        setHeartAnim({ id: photoId, x: 100, y: 100 })
      }
      setTimeout(() => setHeartAnim(null), 800)
      return
    }

    const nextLiked = !isCurrentlyLiked

    // Trigger visual heart bounce animation when liking
    if (nextLiked) {
      const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect?.()
      if (rect && e.clientX && e.clientY) {
        setHeartAnim({ id: photoId, x: e.clientX - rect.left, y: e.clientY - rect.top })
      } else {
        setHeartAnim({ id: photoId, x: 100, y: 100 })
      }
      setTimeout(() => setHeartAnim(null), 800)
    }

    // Optimistic UI update
    const updatePhotoObj = (p: any) => {
      if (p.id !== photoId) return p
      const updatedLikes = nextLiked
        ? [...(p.photo_likes || []), { guest_id: guestId }]
        : (p.photo_likes || []).filter((l: any) => l.guest_id !== guestId)
      return {
        ...p,
        likes_count: Math.max(0, (p.likes_count || 0) + (nextLiked ? 1 : -1)),
        photo_likes: updatedLikes
      }
    }

    setPhotos(prev => prev.map(updatePhotoObj))
    if (expandedPhoto?.id === photoId) {
      setExpandedPhoto((prev: any) => (prev ? updatePhotoObj(prev) : null))
    }

    // Call server action
    try {
      const res = await toggleLike(photoId, guestId)
      if (res.likesCount !== undefined) {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, likes_count: res.likesCount } : p))
        if (expandedPhoto?.id === photoId) {
          setExpandedPhoto((prev: any) => (prev ? { ...prev, likes_count: res.likesCount } : null))
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      await fetchPhotos()
    }
  }

  const handleDoubleClick = (e: React.MouseEvent, photoId: string) => {
    handleToggleLike(e, photoId, true)
  }

  const handleSingleClick = (photo: any) => {
    setExpandedPhoto(photo)
  }

  const [photoToDelete, setPhotoToDelete] = useState<{ id: string; storage_path: string } | null>(null)
  const [deletingPhoto, setDeletingPhoto] = useState(false)

  const onRequestDeletePhoto = (photo: any) => {
    setPhotoToDelete({ id: photo.id, storage_path: photo.storage_path })
  }

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return
    try {
      setDeletingPhoto(true)
      // Optimistic UI update
      setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id))

      if (expandedPhoto?.id === photoToDelete.id) {
        setExpandedPhoto(null)
      }

      const res = await deletePhoto(photoToDelete.id, guestId, photoToDelete.storage_path)
      if (res.error) {
        toast.error(res.error)
        await fetchPhotos() // revert if error
      } else {
        toast.success('Foto eliminada correctamente 🗑️')
      }
    } catch (err: any) {
      toast.error('Error al eliminar la foto')
    } finally {
      setDeletingPhoto(false)
      setPhotoToDelete(null)
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'foto-boda.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Error al descargar la imagen', err)
      // Fallback: abrir en nueva pestaña
      window.open(url, '_blank')
    }
  }

  const getPublicUrl = (path: string) => {
    return supabase.storage.from('event-media').getPublicUrl(path).data.publicUrl
  }

  const kahootEnabled = event.modules?.find((m: any) => m.module_key === 'kahoot')?.is_enabled
  const seatingEnabled = event.modules?.find((m: any) => m.module_key === 'seating')?.is_enabled ?? true
  const [photoSort, setPhotoSort] = useState<'recent' | 'popular'>('recent')

  const filteredPhotos = useMemo(() => {
    const base = photos.filter(photo => {
      if (activeFilter.type === 'all') return true
      if (activeFilter.type === 'tag') {
        return photo.photo_tag_assignments?.some((pta: any) => pta.tag_id === activeFilter.id)
      }
      if (activeFilter.type === 'challenge') {
        return photo.challenge_id === activeFilter.id
      }
      return true
    })

    if (photoSort === 'popular') {
      return [...base].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
    }
    return base
  }, [photos, activeFilter, photoSort])

  const currentIndex = expandedPhoto ? filteredPhotos.findIndex((p: any) => p.id === expandedPhoto.id) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < filteredPhotos.length - 1

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (hasPrev) setExpandedPhoto(filteredPhotos[currentIndex - 1])
  }

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (hasNext) setExpandedPhoto(filteredPhotos[currentIndex + 1])
  }

  useEffect(() => {
    if (!expandedPhoto) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedPhoto(null)
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        setExpandedPhoto(filteredPhotos[currentIndex - 1])
      } else if (e.key === 'ArrowRight' && hasNext) {
        setExpandedPhoto(filteredPhotos[currentIndex + 1])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expandedPhoto, currentIndex, hasPrev, hasNext, filteredPhotos])

  return (
    <div className="space-y-6 pb-24">
      
      {/* Action / Information Grid (2 columns on mobile) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Location Card */}
        {event.location && (
          <div
            onClick={() => setShowLocationModal(true)}
            className="liquid-glass liquid-glass-card rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-2.5 border-white/60 dark:border-white/10 shadow-lg backdrop-blur-xl hover:scale-[1.02] active:scale-[0.98] transition-all group/loc cursor-pointer"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20 group-hover/loc:scale-110 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 truncate">
                Ubicación 📍
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 group-hover/loc:text-primary transition-colors leading-snug">
                {event.location}
              </p>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Ver mapa</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover/loc:translate-x-0.5 transition-transform" />
            </div>
          </div>
        )}

        {/* Schedule Card */}
        {schedule.length > 0 && (
          <div 
            onClick={() => setShowScheduleModal(true)}
            className="liquid-glass liquid-glass-card rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-2.5 border-white/60 dark:border-white/10 shadow-lg backdrop-blur-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group/sched"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20 group-hover/sched:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              {activeScheduleEvent ? (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-red-500 uppercase tracking-wider bg-red-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-red-500/20 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> En vivo 🔴
                </span>
              ) : nextScheduleEvent ? (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/20 truncate">
                  Próximo ⏳
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] font-extrabold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 truncate">
                  Itinerario 🗺️
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 group-hover/sched:text-primary transition-colors leading-snug">
                {activeScheduleEvent 
                  ? `${activeScheduleEvent.icon || '💍'} ${activeScheduleEvent.title} (${activeScheduleEvent.scheduled_time?.slice(0, 5)}h)`
                  : nextScheduleEvent 
                  ? `${nextScheduleEvent.icon || '⏳'} ${nextScheduleEvent.title} (${nextScheduleEvent.scheduled_time?.slice(0, 5)}h)`
                  : 'Ver el itinerario completo'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-primary/10 text-[11px] font-semibold text-primary">
              <span>Ver todo</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover/sched:translate-x-0.5 transition-transform" />
            </div>
          </div>
        )}

        {/* Guestbook Card */}
        <div 
          onClick={() => setShowGuestbookModal(true)}
          className="liquid-glass liquid-glass-card rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-2.5 border-white/60 dark:border-white/10 shadow-lg backdrop-blur-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group/guestbook"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 border border-sky-500/20 group-hover/guestbook:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 truncate">
              Firmas ✍️
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 group-hover/guestbook:text-primary transition-colors leading-snug">
              Deja tus felicitaciones o dedicatoria
            </p>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-sky-500/10 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
            <span>Firmar</span>
            <Sparkles className="w-3.5 h-3.5 group-hover/guestbook:rotate-12 transition-transform" />
          </div>
        </div>

        {/* Seating Plan Card (Buscador de Mesas) */}
        {seatingEnabled && (
          <div 
            onClick={() => setShowSeatingModal(true)}
            className="liquid-glass liquid-glass-card rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-2.5 border-white/60 dark:border-white/10 shadow-lg backdrop-blur-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group/seating"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20 group-hover/seating:scale-110 transition-transform flex items-center justify-center">
                <span className="text-xl leading-none">🪑</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 truncate">
                Mesas 🍽️
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 group-hover/seating:text-primary transition-colors leading-snug">
                ¿Dónde me siento? Encuentra tu mesa
              </p>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-amber-500/10 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <span>Buscar mesa</span>
              <Search className="w-3.5 h-3.5 group-hover/seating:scale-110 transition-transform" />
            </div>
          </div>
        )}
      </div>

      {/* Kahoot Banner */}
      {kahootEnabled && (
        <div className="liquid-glass liquid-glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 border-white/60 dark:border-white/10 shadow-xl backdrop-blur-xl">
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold bg-gradient-to-r from-primary via-sky-600 to-primary bg-clip-text text-transparent flex items-center gap-2 text-sm sm:text-base">
              <span className="text-xl shrink-0">🏆</span> ¡Juega al Kahoot!
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground/90 font-medium mt-0.5 truncate">
              {hasPlayedKahoot ? 'Ya has participado. ¡Consulta la clasificación!' : 'Responde la trivia y gana un premio.'}
            </p>
          </div>
          <button 
            className="bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 text-primary-foreground h-9 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 self-center transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95"
            onClick={() => window.location.href = `/e/${event.slug}/kahoot`}
          >
            {hasPlayedKahoot ? 'Ver resultados' : 'Jugar'}
          </button>
        </div>
      )}

      {/* Category & Tag Filters & Sort */}
      <div className="relative group/filters">
        <div className="flex items-center justify-between gap-2 mb-2 px-1 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-primary" /> Galería ({filteredPhotos.length})
            </span>
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPhotoSort('recent')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  photoSort === 'recent' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Recientes
              </button>
              <button
                type="button"
                onClick={() => setPhotoSort('popular')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  photoSort === 'popular' ? 'bg-background text-rose-500 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Populares 🔥
              </button>
            </div>
          </div>
          {(availableTags.length + availableChallenges.length > 2) && (
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              <span>{isFilterExpanded ? 'Modo carrusel' : 'Ver todas'}</span>
            </button>
          )}
        </div>

        {isFilterExpanded ? (
          /* Modo desplegado: todas las categorías visibles en filas */
          <div className="flex flex-wrap gap-2 p-2 bg-muted/20 rounded-2xl border border-white/40 dark:border-white/10 animate-in fade-in duration-200 shadow-inner">
            <button 
              onClick={() => setActiveFilter({ type: 'all' })}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                activeFilter.type === 'all' 
                  ? 'bg-gradient-to-r from-primary to-sky-600 text-primary-foreground shadow-md shadow-primary/20' 
                  : 'glass-pill border border-white/50 dark:border-white/10 text-foreground hover:bg-white/70 dark:hover:bg-slate-800/70 shadow-sm'
              }`}
            >
              Todas las fotos
            </button>
            
            {availableTags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setActiveFilter({ type: 'tag', id: tag.id })}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full shadow-sm transition-all cursor-pointer ${
                  activeFilter.type === 'tag' && activeFilter.id === tag.id
                    ? 'bg-primary text-primary-foreground font-bold shadow-md' 
                    : 'bg-background border border-border text-foreground hover:bg-muted'
                }`}
              >
                🏷️ {tag.name}
              </button>
            ))}

            {availableChallenges.map(challenge => (
              <button 
                key={challenge.id}
                onClick={() => setActiveFilter({ type: 'challenge', id: challenge.id })}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full shadow-sm transition-all cursor-pointer ${
                  activeFilter.type === 'challenge' && activeFilter.id === challenge.id
                    ? 'bg-primary text-primary-foreground border border-primary font-bold shadow-md' 
                    : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
                }`}
              >
                <span>{challenge.icon || '✨'}</span> Reto: {challenge.title}
              </button>
            ))}
          </div>
        ) : (
          /* Modo carrusel horizontal con flechas de navegación */
          <div className="relative flex items-center">
            {/* Flecha izquierda */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollFilters('left')}
                className="absolute left-0 z-20 p-1.5 rounded-full bg-background/95 backdrop-blur-md shadow-lg border border-border text-foreground hover:bg-primary hover:text-white transition-all -ml-2.5 cursor-pointer hover:scale-105"
                title="Ver anteriores"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Contenedor desplazable */}
            <div 
              ref={filterScrollRef}
              onScroll={checkFilterScroll}
              className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 px-1 scroll-smooth scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 w-full"
            >
              <button 
                onClick={() => setActiveFilter({ type: 'all' })}
                className={`shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer select-none ${
                  activeFilter.type === 'all' 
                    ? 'bg-gradient-to-r from-primary to-sky-600 text-primary-foreground shadow-md shadow-primary/20' 
                    : 'glass-pill border border-white/50 dark:border-white/10 text-foreground hover:bg-white/70 dark:hover:bg-slate-800/70 shadow-sm'
                }`}
              >
                Todas
              </button>
              
              {availableTags.map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => setActiveFilter({ type: 'tag', id: tag.id })}
                  className={`shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full shadow-sm transition-all cursor-pointer select-none whitespace-nowrap ${
                    activeFilter.type === 'tag' && activeFilter.id === tag.id
                      ? 'bg-primary text-primary-foreground font-bold shadow-md' 
                      : 'bg-background border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {tag.name}
                </button>
              ))}

              {availableChallenges.map(challenge => (
                <button 
                  key={challenge.id}
                  onClick={() => setActiveFilter({ type: 'challenge', id: challenge.id })}
                  className={`flex items-center gap-1.5 shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full shadow-sm transition-all cursor-pointer select-none whitespace-nowrap ${
                    activeFilter.type === 'challenge' && activeFilter.id === challenge.id
                      ? 'bg-primary text-primary-foreground border border-primary font-bold shadow-md' 
                      : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
                  }`}
                >
                  <span>{challenge.icon || '✨'}</span> Reto: {challenge.title}
                </button>
              ))}
            </div>

            {/* Flecha derecha */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollFilters('right')}
                className="absolute right-0 z-20 p-1.5 rounded-full bg-background/95 backdrop-blur-md shadow-lg border border-border text-foreground hover:bg-primary hover:text-white transition-all -mr-2.5 cursor-pointer hover:scale-105"
                title="Ver más categorías"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feed Grid - 3 columns */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Aún no hay fotos con este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {filteredPhotos.map((photo) => (
            <div 
              key={photo.id} 
              className="relative group overflow-hidden bg-muted aspect-square select-none cursor-pointer"
              onClick={() => handleSingleClick(photo)}
            >
              <img src={getPublicUrl(photo.storage_path)} alt="Boda" className="object-cover w-full h-full pointer-events-none" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 pointer-events-none" />
              
              {/* Overlay elements */}
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-end text-white pointer-events-none">
                <span className="text-[10px] font-medium truncate drop-shadow-md">{photo.guests?.full_name}</span>
                
                {/* Passive like count indicator */}
                {Boolean(photo.likes_count && photo.likes_count > 0) && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold bg-black/60 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-md">
                    {(() => {
                      const isLiked = Boolean(guestId && photo.photo_likes?.some((l: any) => l.guest_id === guestId))
                      return (
                        <>
                          <Heart className={`w-3 h-3 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white/80'}`} />
                          <span>{photo.likes_count}</span>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Botón de borrar si es tu foto */}
              {photo.guest_id === guestId && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRequestDeletePhoto(photo) }}
                  className="absolute top-1 right-1 p-1.5 bg-black/40 hover:bg-destructive/80 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 lg:opacity-100 cursor-pointer"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Photo Modal */}
      {expandedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center items-center animate-in fade-in duration-200"
          onClick={() => setExpandedPhoto(null)}
        >
          {/* Botón cerrar */}
          <button 
            className="absolute top-6 right-6 text-white/80 hover:text-white p-2 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setExpandedPhoto(null) }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <div 
            className="relative w-full max-w-3xl max-h-[80vh] flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => handleDoubleClick(e, expandedPhoto.id)}
          >
            {/* Prev Photo Arrow */}
            {hasPrev && (
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 cursor-pointer border border-white/20"
                title="Foto anterior (←)"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            <img 
              src={getPublicUrl(expandedPhoto.storage_path)} 
              alt="Boda Ampliada" 
              className="object-contain max-h-[80vh] w-auto rounded-md shadow-2xl select-none" 
            />

            {/* Next Photo Arrow */}
            {hasNext && (
              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 cursor-pointer border border-white/20"
                title="Siguiente foto (→)"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Animación del corazón gigante en el modal */}
            {heartAnim?.id === expandedPhoto.id && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-rose-500 animate-in zoom-in-50 fade-in duration-300"
              >
                <Heart className="w-24 h-24 fill-rose-500 drop-shadow-2xl" />
              </div>
            )}
            
            {/* Info overlay inside modal */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
              <span className="text-sm font-medium drop-shadow-md">{expandedPhoto.guests?.full_name}</span>
              <div className="flex gap-2 items-center">
                {(() => {
                  const isLiked = Boolean(guestId && expandedPhoto.photo_likes?.some((l: any) => l.guest_id === guestId))
                  return (
                    <button 
                      type="button"
                      className={`flex items-center gap-1.5 text-sm font-semibold transition-all drop-shadow-md px-3.5 py-1.5 rounded-full cursor-pointer ${
                        isLiked 
                          ? 'text-rose-400 bg-rose-500/20 border border-rose-500/30' 
                          : 'text-white hover:text-rose-300 bg-black/50 hover:bg-black/70 border border-white/10'
                      }`}
                      onClick={(e) => handleToggleLike(e, expandedPhoto.id, false)}
                    >
                      <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'text-rose-500 fill-rose-500 scale-105' : 'text-white'}`} />
                      <span>{expandedPhoto.likes_count || 0}</span>
                    </button>
                  )
                })()}

                <button 
                  onClick={() => handleDownload(getPublicUrl(expandedPhoto.storage_path), `boda-${expandedPhoto.id}.jpg`)}
                  className="p-2 bg-black/40 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                  title="Descargar foto"
                >
                  <Download className="w-4 h-4" />
                </button>

                {expandedPhoto.guest_id === guestId && (
                  <button 
                    onClick={() => onRequestDeletePhoto(expandedPhoto)}
                    className="p-2 bg-black/40 hover:bg-destructive/80 text-white rounded-full transition-colors cursor-pointer"
                    title="Borrar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Preview & Tagging Modal */}
      {selectedFilePreviews.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={cancelUpload}
        >
          <div 
            className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg bg-background sm:rounded-2xl sm:border sm:border-white/40 dark:sm:border-white/10 sm:shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-background/80 backdrop-blur-md p-4 flex justify-between items-center border-b shrink-0">
              <div>
                <h3 className="font-extrabold text-lg">
                  {selectedFilePreviews.length === 1 ? 'Subir Foto' : `Subir ${selectedFilePreviews.length} Fotos`}
                </h3>
                <p className="text-xs text-muted-foreground">Personaliza tus fotos antes de publicar</p>
              </div>
              <button onClick={cancelUpload} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Image Preview */}
              {selectedFilePreviews.length === 1 ? (
                <div className="bg-black/10 dark:bg-black/40 rounded-xl overflow-hidden flex justify-center max-h-80 p-2 border">
                  <img src={selectedFilePreviews[0]} alt="Preview" className="object-contain max-h-76 w-auto rounded-lg shadow-sm" />
                </div>
              ) : (
                <div className="bg-muted/40 p-3 rounded-xl border overflow-x-auto flex gap-3 snap-x scrollbar-hide no-scrollbar">
                  {selectedFilePreviews.map((src, idx) => (
                    <div key={idx} className="relative flex-shrink-0 snap-center rounded-xl overflow-hidden border bg-background group shadow-sm" style={{ width: '130px', height: '130px' }}>
                      <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeFile(idx)} 
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-destructive text-white p-1 rounded-full backdrop-blur-md transition-all shadow"
                        title="Eliminar foto de la selección"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md">
                        {idx + 1} de {selectedFilePreviews.length}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags Section */}
              {availableTags.length > 0 && (
                <div className="space-y-2.5">
                  <Label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    <Tag className="w-4 h-4 text-primary" /> Etiquetas (opcional)
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1.5 rounded-xl bg-muted/20 border border-border/40 scrollbar-thin">
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                          )
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer select-none ${
                          selectedTags.includes(tag.id) 
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm font-bold' 
                            : 'bg-background hover:bg-muted text-foreground'
                        }`}
                      >
                        🏷️ {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenges Section */}
              {availableChallenges.length > 0 && (
                <div className="space-y-2.5">
                  <Label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    <Trophy className="w-4 h-4 text-primary" /> Participar en un reto (opcional)
                  </Label>
                  <div className="space-y-2">
                    {availableChallenges.map(challenge => (
                      <div 
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(prev => prev === challenge.id ? null : challenge.id)}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                          selectedChallenge === challenge.id 
                            ? 'bg-primary/10 border-primary ring-1 ring-primary/30' 
                            : 'bg-card hover:bg-muted/60'
                        }`}
                      >
                        <div className="text-2xl shrink-0 mt-0.5">{challenge.icon || '✨'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm leading-tight">{challenge.title}</p>
                          {challenge.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{challenge.description}</p>
                          )}
                        </div>
                        {selectedChallenge === challenge.id && (
                          <div className="ml-auto text-primary shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer Upload Button */}
            <div className="border-t p-4 bg-background shrink-0">
              <Button 
                onClick={confirmUpload} 
                disabled={uploading}
                className="w-full text-base py-5 rounded-xl font-bold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 transition-all"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
                    {uploadProgress ? `Subiendo foto ${uploadProgress.current} de ${uploadProgress.total}...` : 'Subiendo...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" /> 
                    {selectedFilePreviews.length === 1 ? 'Publicar Foto' : `Publicar ${selectedFilePreviews.length} Fotos`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule / Timeline Modal */}
      {showScheduleModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowScheduleModal(false)}
        >
          <div 
            className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg bg-background sm:rounded-2xl sm:border sm:border-white/40 dark:sm:border-white/10 sm:shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-background/80 backdrop-blur-md p-4 flex justify-between items-center border-b shrink-0">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-primary" /> Cronograma de la Boda
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Itinerario en tiempo real</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timeline items list */}
            <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
              {schedule.map((item, idx) => {
                const status = getScheduleItemStatus(item, idx, schedule)
                const { location, notes } = parseScheduleLocation(item)
                return (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                      status === 'active'
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md'
                        : status === 'completed'
                        ? 'bg-muted/30 border-muted opacity-75'
                        : 'bg-card border-border shadow-sm'
                    }`}
                  >
                    <div className="text-3xl bg-background p-2.5 rounded-xl border border-border shadow-sm shrink-0">
                      {item.icon || '💍'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-muted text-foreground border">
                          {item.scheduled_time?.slice(0, 5)}h
                        </span>
                        {status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-red-500 uppercase tracking-wider bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> En curso 🔴
                          </span>
                        )}
                        {status === 'upcoming' && idx === schedule.findIndex((it, i) => getScheduleItemStatus(it, i, schedule) === 'upcoming') && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            Próximo ⏳
                          </span>
                        )}
                        {status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Finalizado
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base mt-1 text-foreground leading-snug">{item.title}</h4>

                      {/* Location Badge & Navigation */}
                      {location && (
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedScheduleLocation({ location, title: item.title })}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-all cursor-pointer text-left"
                            title="Ver ubicación en el mapa"
                          >
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{location}</span>
                          </button>

                          <a
                            href={getGoogleMapsUrl(location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            title="Abrir en app de Google Maps"
                          >
                            <span>Cómo llegar</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}

                      {notes && (
                        <p className="text-xs text-muted-foreground pt-0.5 leading-normal">{notes}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sticky Footer Close Button */}
            <div className="p-4 border-t bg-background shrink-0">
              <Button onClick={() => setShowScheduleModal(false)} variant="outline" className="w-full font-bold rounded-xl py-5">
                Cerrar Cronograma
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Guestbook Modal */}
      {showGuestbookModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowGuestbookModal(false)}
        >
          <div 
            className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg bg-background sm:rounded-2xl sm:border sm:border-white/40 dark:sm:border-white/10 sm:shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-background/80 backdrop-blur-md p-4 flex justify-between items-center border-b shrink-0">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Libro de Firmas
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Dedicatorias para {event.bride_name} & {event.groom_name}</p>
              </div>
              <button onClick={() => setShowGuestbookModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
              {/* Form to leave message */}
              <form onSubmit={handleGuestbookSubmit} className="space-y-3 bg-muted/40 p-4 rounded-xl border">
                <Label htmlFor="guestbook_content" className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Tu dedicatoria o felicitación
                </Label>
                <textarea
                  id="guestbook_content"
                  rows={3}
                  value={guestbookContent}
                  onChange={(e) => setGuestbookContent(e.target.value)}
                  placeholder="Escribe aquí unas palabras emotivas o divertidas..."
                  required
                  className="w-full p-3 rounded-xl bg-background border border-input text-sm resize-none focus-visible:ring-1 focus-visible:ring-primary outline-none"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={guestbookIsPrivate}
                      onChange={(e) => setGuestbookIsPrivate(e.target.checked)}
                      className="rounded text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-500" /> Mensaje privado (solo para los novios 🔒)
                    </span>
                  </label>
                  
                  <Button type="submit" size="sm" disabled={submittingGuestbook || !guestbookContent.trim()} className="font-bold gap-1.5 rounded-xl shadow-sm">
                    {submittingGuestbook ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Enviar</>}
                  </Button>
                </div>
              </form>

              {/* Public Entries Feed */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Mensajes de los invitados
                </h4>
                {guestbookEntries.length > 0 ? (
                  <div className="space-y-3">
                    {guestbookEntries.map((entry) => (
                      <div key={entry.id} className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-primary">{entry.guests?.full_name || 'Invitado'}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed pt-1">"{entry.content}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-xs">
                    ¡Sé el primero en firmar el libro de dedicatorias!
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-background shrink-0">
              <Button onClick={() => setShowGuestbookModal(false)} variant="outline" className="w-full font-bold rounded-xl py-5">
                Cerrar Libro de Firmas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Camera Menu */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        
        {/* Dropdown Options */}
        {showMenu && (
          <div className="absolute bottom-20 flex flex-col gap-3 items-center animate-in slide-in-from-bottom-2 fade-in">
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 bg-background border shadow-lg rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <Camera className="w-4 h-4" /> Hacer foto
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-background border shadow-lg rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <ImageIcon className="w-4 h-4" /> De galería
            </button>
          </div>
        )}

        <button 
          className="w-16 h-16 rounded-full shadow-2xl bg-primary hover:bg-primary/90 hover:scale-105 transition-all flex items-center justify-center border-4 border-background"
          onClick={() => setShowMenu(!showMenu)}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
          ) : (
            <Camera className="w-7 h-7 text-primary-foreground" />
          )}
        </button>
      </div>

      {/* Background Overlay for closing menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-20 bg-black/5 backdrop-blur-[1px]" 
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={cameraInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/*" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Photo Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!photoToDelete}
        title="¿Borrar esta fotografía?"
        description="La imagen se eliminará permanentemente de la galería de fotos del evento."
        confirmText="Borrar foto"
        loading={deletingPhoto}
        onConfirm={handleConfirmDeletePhoto}
        onClose={() => setPhotoToDelete(null)}
      />

      {/* Interactive Location & Map Modal (General Event) */}
      {event.location && (
        <LocationMapModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          location={event.location}
          eventName={`${event.bride_name} & ${event.groom_name}`}
        />
      )}

      {/* Interactive Location & Map Modal (Specific Schedule Milestone) */}
      {selectedScheduleLocation && (
        <LocationMapModal
          isOpen={!!selectedScheduleLocation}
          onClose={() => setSelectedScheduleLocation(null)}
          location={selectedScheduleLocation.location}
          eventName={selectedScheduleLocation.title}
        />
      )}

      {/* Seating Plan / Buscador de Mesas Modal */}
      <SeatingFinderModal
        isOpen={showSeatingModal}
        onClose={() => setShowSeatingModal(false)}
        eventId={event.id}
      />
    </div>
  )
}
