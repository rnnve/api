export interface LastfmImage {
  small: string | null
  medium: string | null
  large: string | null
  extraLarge: string | null
  mega: string | null
}

export interface LastfmDate {
  uts: number
  text: string
}

export interface LastfmTrack {
  name: string
  artist: string
  album: string | null
  url: string
  image: LastfmImage
  nowPlaying: boolean
  date: LastfmDate | null
  mbid: string | null
}

export interface LastfmNowPlaying {
  user: string
  nowPlaying: boolean
  track: LastfmTrack | null
}

export interface LastfmUserProfile {
  username: string
  realname: string | null
  url: string
  image: LastfmImage
  country: string | null
  age: number | null
  gender: string | null
  playcount: number
  artistCount: number | null
  trackCount: number | null
  albumCount: number | null
  playlists: number
  registered: LastfmDate | null
}

export interface LastfmTopArtist {
  name: string
  playcount: number
  url: string
  mbid: string | null
  rank: number
  image: LastfmImage
}

export interface LastfmTopAlbum {
  name: string
  artist: string
  playcount: number
  url: string
  mbid: string | null
  rank: number
  image: LastfmImage
}

export interface LastfmTopTrack {
  name: string
  artist: string
  playcount: number
  listeners: number | null
  url: string
  mbid: string | null
  rank: number
  image: LastfmImage
}

export interface LastfmPagination {
  user: string
  page: number
  perPage: number
  totalPages: number
  total: number
}

export interface LastfmRecentTracksResponse {
  user: string
  tracks: LastfmTrack[]
  pagination: LastfmPagination
}

export interface LastfmTopArtistsResponse {
  user: string
  artists: LastfmTopArtist[]
  pagination: LastfmPagination
}

export interface LastfmTopAlbumsResponse {
  user: string
  albums: LastfmTopAlbum[]
  pagination: LastfmPagination
}

export interface LastfmTopTracksResponse {
  user: string
  tracks: LastfmTopTrack[]
  pagination: LastfmPagination
}

export type LastfmPeriod = "overall" | "7day" | "1month" | "3month" | "6month" | "12month"
