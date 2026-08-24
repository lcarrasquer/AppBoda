import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const trimmed = query.trim()

  try {
    // 1. Query Nominatim for structured geocoding & place names
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=6&accept-language=es`
    
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'WeddingAppLocationHelper/1.0 (contact: support@weddingapp.local)',
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 }
    })

    if (!res.ok) {
      throw new Error(`Nominatim returned ${res.status}`)
    }

    const data = await res.json()

    const suggestions = data.map((item: any) => {
      const address = item.address || {}
      
      // Determine main title
      const title = item.name || address.amenity || address.building || address.road || trimmed
      
      // Build clean subtitle (city, state, country)
      const secondaryParts = [
        address.city || address.town || address.village || address.municipality,
        address.county,
        address.state || address.province,
        address.country
      ].filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx && part !== title)

      const subtitle = secondaryParts.slice(0, 3).join(', ')

      // Clean formatted full name
      const fullAddress = title && subtitle ? `${title}, ${subtitle}` : item.display_name

      return {
        id: item.place_id ? String(item.place_id) : fullAddress,
        title,
        subtitle,
        fullAddress,
        lat: item.lat,
        lon: item.lon,
        type: item.type || item.class
      }
    })

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error fetching place suggestions:', error)

    // Fallback: Google suggestions if Nominatim times out
    try {
      const googleRes = await fetch(
        `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmed)}&hl=es`
      )
      if (googleRes.ok) {
        const googleData = await googleRes.json()
        const rawList: string[] = googleData[1] || []
        const fallbackSuggestions = rawList.slice(0, 5).map((item, i) => ({
          id: `g-${i}`,
          title: item,
          subtitle: 'Lugar / sugerencia de búsqueda',
          fullAddress: item,
        }))
        return NextResponse.json({ suggestions: fallbackSuggestions })
      }
    } catch {
      // Ignore fallback error
    }

    return NextResponse.json({ suggestions: [] })
  }
}
