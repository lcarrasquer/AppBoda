'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { registerGuest, getPhotos, savePhotoRecord, toggleLike, deletePhoto, getEventTagsAndChallenges } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Image as ImageIcon, Heart, Loader2, Upload, Trash2, Download, Tag, Trophy } from 'lucide-react'

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
    <div className="max-w-sm mx-auto mt-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>¡Bienvenido/a!</CardTitle>
          <CardDescription>
            Para compartir fotos y mensajes con {event.bride_name} y {event.groom_name}, dinos tu nombre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre y apellidos</Label>
              <Input 
                id="name" 
                placeholder="Ej. Ana García" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim()}>
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
  
  // Tagging & Filters State
  const [activeFilter, setActiveFilter] = useState<{type: 'all' | 'tag' | 'challenge', id?: string}>({type: 'all'})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null)
  
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [availableChallenges, setAvailableChallenges] = useState<any[]>([])
  
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)

  // Para la animación del corazón al hacer doble clic
  const [heartAnim, setHeartAnim] = useState<{ id: string, x: number, y: number } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchPhotos()
    fetchTagsAndChallenges()
  }, [])

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
    const file = e.target.files?.[0]
    if (!file) return

    setShowMenu(false)
    setSelectedFile(file)
    setSelectedFilePreview(window.URL.createObjectURL(file))
    setSelectedTags([])
    setSelectedChallenge(null)
    
    // Reseteamos inputs
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const cancelUpload = () => {
    if (selectedFilePreview) window.URL.revokeObjectURL(selectedFilePreview)
    setSelectedFile(null)
    setSelectedFilePreview(null)
    setSelectedTags([])
    setSelectedChallenge(null)
  }

  const confirmUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${event.id}/${crypto.randomUUID()}.${fileExt}`

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Guardar en BD con tags y challenge
      await savePhotoRecord(event.id, guestId, fileName, selectedChallenge, selectedTags)
      
      // Limpiar y refrescar
      cancelUpload()
      await fetchPhotos()

    } catch (err) {
      console.error('Upload failed', err)
      alert('Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const handleDoubleClick = async (e: React.MouseEvent, photoId: string) => {
    // Animación visual rápida
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setHeartAnim({ id: photoId, x, y })
    setTimeout(() => setHeartAnim(null), 800)

    // Optimistic UI update
    setPhotos(prev => prev.map(p => {
      if (p.id === photoId) {
        return { ...p, likes_count: p.likes_count + 1 } // Simulamos que siempre suma al doble clic
      }
      return p
    }))

    // Background server action
    await toggleLike(photoId, guestId)
  }

  const handleSingleClick = (photo: any) => {
    setExpandedPhoto(photo)
  }

  const handleDelete = async (photoId: string, storagePath: string) => {
    if (!confirm('¿Seguro que quieres borrar esta foto?')) return

    // Optimistic UI update
    setPhotos(prev => prev.filter(p => p.id !== photoId))

    const res = await deletePhoto(photoId, guestId, storagePath)
    if (res.error) {
      alert(res.error)
      await fetchPhotos() // revert if error
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

  const filteredPhotos = photos.filter(photo => {
    if (activeFilter.type === 'all') return true
    if (activeFilter.type === 'tag') {
      return photo.photo_tag_assignments?.some((pta: any) => pta.tag_id === activeFilter.id)
    }
    if (activeFilter.type === 'challenge') {
      return photo.challenge_id === activeFilter.id
    }
    return true
  })

  return (
    <div className="space-y-6 pb-24">
      
      {/* Kahoot Banner */}
      {kahootEnabled && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="text-xl">🏆</span> ¡Juega al Kahoot!
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Responde la trivia y gana un premio.</p>
          </div>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-md text-sm font-medium" onClick={() => window.location.href = `/e/${event.slug}/kahoot`}>
            Jugar
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x">
        <button 
          onClick={() => setActiveFilter({ type: 'all' })}
          className={`snap-start shrink-0 px-4 py-1.5 text-sm font-medium rounded-full shadow-sm transition-colors ${
            activeFilter.type === 'all' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background border border-border text-foreground hover:bg-muted'
          }`}
        >
          Todas
        </button>
        
        {availableTags.map(tag => (
          <button 
            key={tag.id}
            onClick={() => setActiveFilter({ type: 'tag', id: tag.id })}
            className={`snap-start shrink-0 px-4 py-1.5 text-sm font-medium rounded-full shadow-sm transition-colors ${
              activeFilter.type === 'tag' && activeFilter.id === tag.id
                ? 'bg-primary text-primary-foreground' 
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
            className={`flex items-center gap-1.5 snap-start shrink-0 px-4 py-1.5 text-sm font-medium rounded-full shadow-sm transition-colors ${
              activeFilter.type === 'challenge' && activeFilter.id === challenge.id
                ? 'bg-primary text-primary-foreground border border-primary' 
                : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
            }`}
          >
            <span>{challenge.icon || '✨'}</span> Reto: {challenge.title}
          </button>
        ))}
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
              onDoubleClick={(e) => {
                e.stopPropagation(); // Prevenir que el click se confunda si es posible
                handleDoubleClick(e, photo.id);
              }}
            >
              <img src={getPublicUrl(photo.storage_path)} alt="Boda" className="object-cover w-full h-full pointer-events-none" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 pointer-events-none" />
              
              {/* Overlay elements */}
              <div className="absolute bottom-1 left-1 right-1 flex justify-between items-end text-white pointer-events-none">
                <span className="text-[10px] font-medium truncate drop-shadow-md">{photo.guests?.full_name}</span>
                <div className="flex gap-1 pointer-events-auto">
                  <button 
                    className="flex items-center gap-0.5 text-[10px] hover:text-primary transition-colors drop-shadow-md"
                    onClick={() => handleDoubleClick({ currentTarget: document.body, clientX: 0, clientY: 0 } as any, photo.id)} // manual click like
                  >
                    <Heart className="w-3 h-3" /> {photo.likes_count}
                  </button>
                </div>
              </div>

              {/* Botón de borrar si es tu foto */}
              {photo.guest_id === guestId && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo.id, photo.storage_path) }}
                  className="absolute top-1 right-1 p-1.5 bg-black/40 hover:bg-destructive/80 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 lg:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              {/* Animación del corazón gigante */}
              {heartAnim?.id === photo.id && (
                <div 
                  className="absolute pointer-events-none text-primary/80 animate-in zoom-in-50 fade-in duration-300"
                  style={{ left: (heartAnim?.x || 0) - 24, top: (heartAnim?.y || 0) - 24 }}
                >
                  <Heart className="w-12 h-12 fill-primary drop-shadow-2xl" />
                </div>
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
            className="absolute top-6 right-6 text-white/80 hover:text-white p-2"
            onClick={(e) => { e.stopPropagation(); setExpandedPhoto(null) }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <div 
            className="relative w-full max-w-3xl max-h-[80vh] flex justify-center px-4"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => handleDoubleClick(e, expandedPhoto.id)}
          >
            <img 
              src={getPublicUrl(expandedPhoto.storage_path)} 
              alt="Boda Ampliada" 
              className="object-contain max-h-[80vh] w-auto rounded-md shadow-2xl select-none" 
            />

            {/* Animación del corazón gigante en el modal */}
            {heartAnim?.id === expandedPhoto.id && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-primary/80 animate-in zoom-in-50 fade-in duration-300"
              >
                <Heart className="w-24 h-24 fill-primary drop-shadow-2xl" />
              </div>
            )}
            
            {/* Info overlay inside modal */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
              <span className="text-sm font-medium drop-shadow-md">{expandedPhoto.guests?.full_name}</span>
              <div className="flex gap-2">
                <button 
                  className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors drop-shadow-md bg-black/40 px-3 py-1.5 rounded-full"
                  onClick={() => handleDoubleClick({ currentTarget: document.body, clientX: 0, clientY: 0 } as any, expandedPhoto.id)}
                >
                  <Heart className="w-4 h-4" /> {expandedPhoto.likes_count}
                </button>

                <button 
                  onClick={() => handleDownload(getPublicUrl(expandedPhoto.storage_path), `boda-${expandedPhoto.id}.jpg`)}
                  className="p-1.5 bg-black/40 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Descargar foto"
                >
                  <Download className="w-4 h-4" />
                </button>

                {expandedPhoto.guest_id === guestId && (
                  <button 
                    onClick={() => {
                      handleDelete(expandedPhoto.id, expandedPhoto.storage_path);
                      setExpandedPhoto(null);
                    }}
                    className="p-1.5 bg-black/40 hover:bg-destructive/80 text-white rounded-full transition-colors"
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
      {selectedFilePreview && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col sm:justify-center animate-in fade-in duration-200">
          <div className="flex-1 overflow-y-auto sm:max-h-[90vh] sm:max-w-md sm:mx-auto sm:border sm:rounded-xl bg-background sm:shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur-md p-4 flex justify-between items-center border-b z-10">
              <h3 className="font-bold text-lg">Subir Foto</h3>
              <button onClick={cancelUpload} className="p-2 hover:bg-muted rounded-full transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            {/* Image Preview */}
            <div className="bg-black/5 flex justify-center max-h-72">
              <img src={selectedFilePreview} alt="Preview" className="object-contain max-h-72 w-auto" />
            </div>

            <div className="p-4 space-y-6">
              {/* Tags Section */}
              {availableTags.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Tag className="w-4 h-4 text-primary" /> Etiquetas (opcional)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                          )
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                          selectedTags.includes(tag.id) 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-background hover:bg-muted text-foreground'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenges Section */}
              {availableChallenges.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Trophy className="w-4 h-4 text-primary" /> Participar en un reto (opcional)
                  </Label>
                  <div className="space-y-2">
                    {availableChallenges.map(challenge => (
                      <div 
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(prev => prev === challenge.id ? null : challenge.id)}
                        className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                          selectedChallenge === challenge.id 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        <div className="text-2xl mt-0.5">{challenge.icon || '✨'}</div>
                        <div>
                          <p className="font-semibold text-sm">{challenge.title}</p>
                          {challenge.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
                          )}
                        </div>
                        {selectedChallenge === challenge.id && (
                          <div className="ml-auto text-primary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="sticky bottom-0 bg-background border-t p-4 pb-8 sm:pb-4 z-10">
              <Button 
                onClick={confirmUpload} 
                disabled={uploading}
                className="w-full text-base py-6 rounded-xl font-bold"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" /> Publicar Foto
                  </>
                )}
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
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
    </div>
  )
}
