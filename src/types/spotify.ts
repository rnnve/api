export interface SpotifyArtist {
  name: string
  id: string
  url: string
}

export interface SpotifyImage {
  url: string
  width: number | null
  height: number | null
}

export interface SpotifyAlbum {
  name: string
  id: string
  url: string
  images: SpotifyImage[]
  cover: string | null
  releaseDate: string | null
}

export interface SpotifyDevice {
  name: string
  type: string
  volumePercent: number | null
}

export interface SpotifyTrackImages {
  small: string | null
  medium: string | null
  large: string | null
}

export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  artists: SpotifyArtist[]
  album: string
  cover: string | null
  images: SpotifyTrackImages
  durationMs: number
  url: string
  uri: string
  playedAt?: string | null
}

export interface SpotifyCurrentlyPlaying {
  isPlaying: boolean
  track: SpotifyTrack | null
  progressMs: number | null
  device: SpotifyDevice | null
  startedAt: number | null
  endsAt: number | null
  contextType: string | null
  contextUrl: string | null
  lastPlayed?: SpotifyTrack | null
}

export interface SpotifyRecentlyPlayedResponse {
  tracks: SpotifyTrack[]
}

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token?: string
}
