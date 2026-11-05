import { MediaItem, StreamingPlatform, ContinueWatchingItem } from '../types';

export const PLATFORMS_LIST: { name: StreamingPlatform; color: string; badgeBg: string; logoUrl: string }[] = [
  { name: 'Netflix', color: '#E50914', badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30', logoUrl: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2023.ico' },
  { name: 'Apple TV+', color: '#D1D5DB', badgeBg: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30', logoUrl: 'https://tv.apple.com/favicon.ico' },
  { name: 'HBO Max', color: '#7E22CE', badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', logoUrl: 'https://www.max.com/favicon.ico' },
  { name: 'Disney+', color: '#1E40AF', badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', logoUrl: 'https://www.disneyplus.com/favicon.ico' },
  { name: 'Prime Video', color: '#0284C7', badgeBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', logoUrl: 'https://www.primevideo.com/favicon.ico' },
  { name: 'Paramount+', color: '#2563EB', badgeBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', logoUrl: 'https://www.paramountplus.com/favicon.ico' },
];

export const GENRES_LIST = [
  'All Genres',
  'Action',
  'Sci-Fi',
  'Drama',
  'Thriller',
  'Animation',
  'Fantasy',
  'Mystery',
  'Crime',
  'Adventure',
  'Cyberpunk'
];

export const INDUSTRIES_LIST = [
  'All Industries',
  'Hollywood',
  'Anime',
  'Asian Cinema',
  'European',
  'Indie'
];

export const LANGUAGES_LIST = [
  'All Languages',
  'English',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'German'
];

export const YEARS_LIST = [
  'All Years',
  '2026',
  '2025',
  '2024',
  '2023',
  '2020-2022',
  'Classics'
];


export const MEDIA_CATALOG: MediaItem[] = [
  {
    id: 'avatar-way-of-water',
    title: 'Avatar: The Way of Water',
    type: 'movie',
    tagline: 'Return to Pandora.',
    synopsis: 'Set more than a decade after the events of the first film, Jake Sully and Neytiri have formed a family and are doing everything to stay together. However, they must leave their home and explore the regions of Pandora when an ancient threat resurfaces.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/kJsPVzdyBrYHLomuNv5SJDXUQ2f.jpg',
    rating: 8.4,
    voteCount: '640K',
    releaseYear: 2022,
    runtime: '3h 12m',
    ageRating: 'PG-13',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres: ['Sci-Fi', 'Action', 'Adventure'],
    platform: 'Disney+',
    industry: 'Hollywood',
    language: 'English',
    director: 'James Cameron',
    isTrending: true,
    isFresh: true,
    cast: [
      { name: 'Sam Worthington', character: 'Jake Sully', avatar: '' },
      { name: 'Zoe Saldana', character: 'Neytiri', avatar: '' },
      { name: 'Sigourney Weaver', character: 'Kiri', avatar: '' }
    ]
  },
  {
    id: 'avatar-2009',
    title: 'Avatar',
    type: 'movie',
    tagline: 'Enter the world.',
    synopsis: 'A paraplegic Marine dispatched to the moon Pandora on a unique mission becomes torn between following his orders and protecting the world he feels is his home.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg',
    rating: 7.9,
    voteCount: '1.4M',
    releaseYear: 2009,
    runtime: '2h 42m',
    ageRating: 'PG-13',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Action', 'Adventure', 'Fantasy', 'Sci-Fi'],
    platform: 'Disney+',
    industry: 'Hollywood',
    language: 'English',
    director: 'James Cameron',
    isTrending: false,
    isFresh: false,
    cast: [
      { name: 'Sam Worthington', character: 'Jake Sully', avatar: '' },
      { name: 'Zoe Saldana', character: 'Neytiri', avatar: '' }
    ]
  },
  {
    id: 'dune-2',
    title: 'Dune: Part Two',
    originalTitle: 'Dune: Part Two',
    type: 'movie',
    tagline: 'Long live the fighters.',
    synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    rating: 8.9,
    voteCount: '482K',
    releaseYear: 2024,
    runtime: '2h 46m',
    ageRating: 'PG-13',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres: ['Sci-Fi', 'Adventure', 'Action'],
    platform: 'HBO Max',
    industry: 'Hollywood',
    language: 'English',
    director: 'Denis Villeneuve',
    topTenRank: 1,
    isTrending: true,
    isFresh: true,
    featuredInHero: true,
    cast: [
      { name: 'Timothée Chalamet', character: 'Paul Atreides', avatar: '' },
      { name: 'Zendaya', character: 'Chani', avatar: '' },
      { name: 'Rebecca Ferguson', character: 'Lady Jessica', avatar: '' },
      { name: 'Javier Bardem', character: 'Stilgar', avatar: '' },
    ]
  },
  {
    id: 'severance',
    title: 'Severance',
    type: 'series',
    tagline: 'Please do not attempt to remember.',
    synopsis: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg',
    rating: 8.8,
    voteCount: '310K',
    releaseYear: 2025,
    totalSeasons: 2,
    ageRating: 'TV-MA',
    quality: '4K Ultra HD',
    audio: 'Spatial Audio',
    genres: ['Sci-Fi', 'Thriller', 'Mystery'],
    platform: 'Apple TV+',
    industry: 'Hollywood',
    language: 'English',
    director: 'Ben Stiller',
    topTenRank: 2,
    isTrending: true,
    isPopularSeries: true,
    featuredInHero: true,
    cast: [
      { name: 'Adam Scott', character: 'Mark Scout', avatar: '' },
      { name: 'Patricia Arquette', character: 'Harmony Cobel', avatar: '' },
      { name: 'John Turturro', character: 'Irving Bailiff', avatar: '' },
      { name: 'Christopher Walken', character: 'Burt Goodman', avatar: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodeCount: 9,
        episodes: [
          { id: 'sev-s1e1', episodeNumber: 1, seasonNumber: 1, title: 'Good News About Hell', runtime: '57m', synopsis: 'Mark Scout leads a team at Lumon Industries, whose employees have undergone a severance procedure.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', },
          { id: 'sev-s1e2', episodeNumber: 2, seasonNumber: 1, title: 'Half Loop', runtime: '53m', synopsis: 'The Macrodata Refinement team trains Helly on macrodata refinement numbers.', thumbnail: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', },
          { id: 'sev-s1e3', episodeNumber: 3, seasonNumber: 1, title: 'In Perpetuity', runtime: '54m', synopsis: 'Mark takes the team on a field trip to the perpetuity wing while Petey struggles on the outside.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', },
          { id: 'sev-s1e9', episodeNumber: 9, seasonNumber: 1, title: 'The We We Are', runtime: '43m', synopsis: 'The innies trigger the overtime contingency protocol with shocking consequences.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', },
        ]
      },
      {
        seasonNumber: 2,
        title: 'Season 2',
        episodeCount: 10,
        episodes: [
          { id: 'sev-s2e1', episodeNumber: 1, seasonNumber: 2, title: 'Hello, Lumon', runtime: '58m', synopsis: 'Mark returns to the severed floor following the unprecedented security breach.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', },
          { id: 'sev-s2e2', episodeNumber: 2, seasonNumber: 2, title: 'The Cold Harbor', runtime: '55m', synopsis: 'Cobel consolidates control as unexpected anomalies surface in department records.', thumbnail: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', },
        ]
      }
    ]
  },
  {
    id: 'cyberpunk-edgerunners',
    title: 'Cyberpunk: Edgerunners',
    type: 'anime',
    tagline: 'High-tech. Low life. No way out.',
    synopsis: 'A street kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner: a mercenary outlaw also known as a cyberpunk.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/v3JuB15WybKmxDeT1hWdK3j6eSJ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/bknKZO7DWVYKeByuJMnGI46PFZg.jpg',
    rating: 9.0,
    voteCount: '215K',
    releaseYear: 2024,
    totalSeasons: 1,
    ageRating: '18+',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Anime', 'Cyberpunk', 'Sci-Fi', 'Action'],
    platform: 'Netflix',
    industry: 'Anime',
    language: 'Japanese',
    director: 'Hiroyuki Imaishi',
    topTenRank: 3,
    isTrending: true,
    isPopularSeries: true,
    featuredInHero: true,
    cast: [
      { name: 'KENN', character: 'David Martinez', avatar: '' },
      { name: 'Aoi Yuuki', character: 'Lucy Kushinada', avatar: '' },
      { name: 'Tomoyo Kurosawa', character: 'Rebecca', avatar: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodeCount: 10,
        episodes: [
          { id: 'cpe-s1e1', episodeNumber: 1, seasonNumber: 1, title: 'Let You Down', runtime: '25m', synopsis: 'Tragedy strikes high-schooler David Martinez in Santo Domingo, forcing him to make a desperate choice.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', },
          { id: 'cpe-s1e2', episodeNumber: 2, seasonNumber: 1, title: 'Like a Boy', runtime: '24m', synopsis: 'Equipped with the high-grade military Sandevistan, David crosses paths with netrunner Lucy.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', },
          { id: 'cpe-s1e10', episodeNumber: 10, seasonNumber: 1, title: 'My Moon, My Man', runtime: '26m', synopsis: 'In the explosive finale atop Arasaka Tower, David confronts Adam Smasher.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', }
        ]
      }
    ]
  },
  {
    id: 'shogun',
    title: 'Shōgun',
    type: 'series',
    tagline: 'Destiny will be forged in blood and honor.',
    synopsis: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets that could tip the scales of power and devastate his formidable enemies in feudal Japan.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/bwSmgmd90hCWwqOKQYTEraeOZhJ.jpg',
    rating: 9.1,
    voteCount: '340K',
    releaseYear: 2024,
    totalSeasons: 1,
    ageRating: 'TV-MA',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres: ['Drama', 'Adventure', 'Action'],
    platform: 'Disney+',
    industry: 'Hollywood',
    language: 'Japanese',
    director: 'Rachel Kondo, Justin Marks',
    topTenRank: 4,
    isTrending: true,
    isPopularSeries: true,
    featuredInHero: true,
    cast: [
      { name: 'Hiroyuki Sanada', character: 'Lord Yoshii Toranaga', avatar: '' },
      { name: 'Cosmo Jarvis', character: 'John Blackthorne', avatar: '' },
      { name: 'Anna Sawai', character: 'Toda Mariko', avatar: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodeCount: 10,
        episodes: [
          { id: 'shg-s1e1', episodeNumber: 1, seasonNumber: 1, title: 'Chapter One: Anjin', runtime: '70m', synopsis: 'English pilot John Blackthorne washes ashore in Japan and is brought before the cunning Lord Toranaga.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', },
          { id: 'shg-s1e2', episodeNumber: 2, seasonNumber: 1, title: 'Chapter Two: Servants of Two Masters', runtime: '59m', synopsis: 'Toranaga struggles against political plots orchestrated by the Council of Regents in Osaka.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', }
        ]
      }
    ]
  },
  {
    id: 'interstellar',
    title: 'Interstellar',
    type: 'movie',
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    synopsis: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans through a newly discovered wormhole near Saturn.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8sNiAPPYU14PUepFNeSNGUTiHW.jpg',
    rating: 8.7,
    voteCount: '1.2M',
    releaseYear: 2014,
    runtime: '2h 49m',
    ageRating: 'PG-13',
    quality: '4K Ultra HD',
    audio: 'IMAX Enhanced 7.1',
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    platform: 'Paramount+',
    industry: 'Hollywood',
    language: 'English',
    director: 'Christopher Nolan',
    topTenRank: 5,
    isTrending: false,
    isFresh: false,
    featuredInHero: false,
    cast: [
      { name: 'Matthew McConaughey', character: 'Joseph Cooper', avatar: '' },
      { name: 'Anne Hathaway', character: 'Dr. Amelia Brand', avatar: '' },
      { name: 'Jessica Chastain', character: 'Murphy Cooper', avatar: '' }
    ]
  },
  {
    id: 'arcane',
    title: 'Arcane: League of Legends',
    type: 'anime',
    tagline: 'Every legend has a beginning.',
    synopsis: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and incompatible convictions.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    rating: 9.2,
    voteCount: '580K',
    releaseYear: 2024,
    totalSeasons: 2,
    ageRating: '16+',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Animation', 'Sci-Fi', 'Action', 'Fantasy'],
    platform: 'Netflix',
    industry: 'Indie',
    language: 'English',
    director: 'Christian Linke, Alex Yee',
    topTenRank: 6,
    isTrending: true,
    isPopularSeries: true,
    featuredInHero: true,
    cast: [
      { name: 'Hailee Steinfeld', character: 'Vi', avatar: '' },
      { name: 'Ella Purnell', character: 'Jinx', avatar: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodeCount: 9,
        episodes: [
          { id: 'arc-s1e1', episodeNumber: 1, seasonNumber: 1, title: 'Welcome to the Playground', runtime: '43m', synopsis: 'Orphan sisters Vi and Powder lead a botched heist in Piltover that unleashes volatile magic.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', }
        ]
      },
      {
        seasonNumber: 2,
        title: 'Season 2',
        episodeCount: 9,
        episodes: [
          { id: 'arc-s2e1', episodeNumber: 1, seasonNumber: 2, title: 'Heavy Is the Crown', runtime: '45m', synopsis: 'The aftermath of the council bombing drives Piltover martial law into full swing.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', }
        ]
      }
    ]
  },
  {
    id: 'oppenheimer',
    title: 'Oppenheimer',
    type: 'movie',
    tagline: 'The world forever changes.',
    synopsis: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II, and the subsequent security hearing that probed his loyalties.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
    rating: 8.9,
    voteCount: '620K',
    releaseYear: 2023,
    runtime: '3h 00m',
    ageRating: 'R',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Drama', 'History', 'Thriller'],
    platform: 'Prime Video',
    industry: 'Hollywood',
    language: 'English',
    director: 'Christopher Nolan',
    topTenRank: 7,
    isTrending: false,
    isFresh: true,
    cast: [
      { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer', avatar: '' },
      { name: 'Emily Blunt', character: 'Katherine Oppenheimer', avatar: '' },
      { name: 'Robert Downey Jr.', character: 'Lewis Strauss', avatar: '' }
    ]
  },
  {
    id: 'frieren',
    title: 'Frieren: Beyond Journey’s End',
    type: 'anime',
    tagline: 'The adventure has ended, but life goes on.',
    synopsis: 'After the party of heroes defeated the Demon King, they restored peace to the land and returned to lives of solitude. Generations pass, and the elven mage Frieren comes face to face with humanity’s mortality.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg',
    rating: 9.1,
    voteCount: '190K',
    releaseYear: 2024,
    totalSeasons: 1,
    ageRating: '13+',
    quality: '4K Ultra HD',
    audio: '5.1 Surround',
    genres: ['Anime', 'Fantasy', 'Adventure', 'Drama'],
    platform: 'Netflix',
    industry: 'Anime',
    language: 'Japanese',
    director: 'Keiichiro Saito',
    topTenRank: 8,
    isTrending: true,
    isPopularSeries: true,
    cast: [
      { name: 'Atsumi Tanezaki', character: 'Frieren', avatar: '' },
      { name: 'Kana Ichinose', character: 'Fern', avatar: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodeCount: 28,
        episodes: [
          { id: 'fri-s1e1', episodeNumber: 1, seasonNumber: 1, title: 'The Journey’s End', runtime: '24m', synopsis: 'Fifty years after defeating the Demon King, Frieren reunites with her old comrades one final time.', thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg', }
        ]
      }
    ]
  },
  {
    id: 'the-batman',
    title: 'The Batman',
    type: 'movie',
    tagline: 'Unmask the truth.',
    synopsis: 'In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/rvtdN5XkWAfGX6xDuPL6yYS2seK.jpg',
    rating: 8.3,
    voteCount: '520K',
    releaseYear: 2022,
    runtime: '2h 56m',
    ageRating: 'PG-13',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Crime', 'Mystery', 'Action', 'Thriller'],
    platform: 'HBO Max',
    industry: 'Hollywood',
    language: 'English',
    director: 'Matt Reeves',
    topTenRank: 9,
    isTrending: false,
    isFresh: true,
    cast: [
      { name: 'Robert Pattinson', character: 'Bruce Wayne / Batman', avatar: '' },
      { name: 'Zoë Kravitz', character: 'Selina Kyle / Catwoman', avatar: '' }
    ]
  },
  {
    id: 'the-last-of-us',
    title: 'The Last of Us',
    type: 'series',
    tagline: 'When you’re lost in the darkness, look for the light.',
    synopsis: 'Twenty years after modern civilization was destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone across a ravaged America.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg',
    rating: 8.8,
    voteCount: '490K',
    releaseYear: 2025,
    totalSeasons: 2,
    ageRating: 'TV-MA',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres: ['Drama', 'Sci-Fi', 'Action', 'Adventure'],
    platform: 'HBO Max',
    industry: 'Hollywood',
    language: 'English',
    director: 'Craig Mazin, Neil Druckmann',
    topTenRank: 10,
    isTrending: true,
    isPopularSeries: true,
    cast: [
      { name: 'Pedro Pascal', character: 'Joel Miller', avatar: '' },
      { name: 'Bella Ramsey', character: 'Ellie Williams', avatar: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodeCount: 9,
        episodes: [
          { id: 'tlou-s1e1', episodeNumber: 1, seasonNumber: 1, title: 'When You’re Lost in the Darkness', runtime: '81m', synopsis: 'Joel faces tragedy in Austin during the initial cordyceps outbreak, leaping twenty years forward to Boston.', thumbnail: 'https://image.tmdb.org/t/p/w780/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg', }
        ]
      }
    ]
  },
  {
    id: 'blade-runner-2049',
    title: 'Blade Runner 2049',
    type: 'movie',
    tagline: 'The key to the future is finally unearthed.',
    synopsis: 'Young Blade Runner K unearths a long-buried secret that leads him to track down former Blade Runner Rick Deckard, who has been missing for thirty years in an atmospheric neon dystopia.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg',
    rating: 8.6,
    voteCount: '780K',
    releaseYear: 2017,
    runtime: '2h 44m',
    ageRating: 'R',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Sci-Fi', 'Mystery', 'Drama', 'Cyberpunk'],
    platform: 'HBO Max',
    industry: 'Hollywood',
    language: 'English',
    director: 'Denis Villeneuve',
    isTrending: false,
    isFresh: false,
    cast: [
      { name: 'Ryan Gosling', character: 'Officer K / Joe', avatar: '' },
      { name: 'Harrison Ford', character: 'Rick Deckard', avatar: '' },
      { name: 'Ana de Armas', character: 'Joi', avatar: '' }
    ]
  },
  {
    id: 'silo',
    title: 'Silo',
    type: 'series',
    tagline: 'If the lies don’t kill you, the truth will.',
    synopsis: 'Men and women live in a giant subterranean silo with strict regulations which they believe are crafted to protect them from the toxic, ruined world outside.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/r2QXomqKjkKHVtYGGtkf2l2Y7go.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/4XccmjsOmQZw8S2iW1wvlvmb5v1.jpg',
    rating: 8.4,
    voteCount: '190K',
    releaseYear: 2025,
    totalSeasons: 2,
    ageRating: 'TV-MA',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Sci-Fi', 'Drama', 'Mystery'],
    platform: 'Apple TV+',
    industry: 'Hollywood',
    language: 'English',
    director: 'Graham Yost',
    isTrending: true,
    isPopularSeries: true,
    cast: [
      { name: 'Rebecca Ferguson', character: 'Juliette Nichols', avatar: '' },
      { name: 'Common', character: 'Robert Sims', avatar: '' },
      { name: 'Tim Robbins', character: 'Bernard Holland', avatar: '' }
    ]
  },
  {
    id: 'spider-verse',
    title: 'Spider-Man: Across the Spider-Verse',
    type: 'movie',
    tagline: 'It’s how you wear the mask that matters.',
    synopsis: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg',
    rating: 8.9,
    voteCount: '810K',
    releaseYear: 2023,
    runtime: '2h 20m',
    ageRating: 'PG',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres: ['Animation', 'Action', 'Adventure', 'Sci-Fi'],
    platform: 'Netflix',
    industry: 'Hollywood',
    language: 'English',
    director: 'Joaquim Dos Santos, Kemp Powers',
    isTrending: true,
    isFresh: true,
    cast: [
      { name: 'Shameik Moore', character: 'Miles Morales', avatar: '' },
      { name: 'Hailee Steinfeld', character: 'Gwen Stacy', avatar: '' }
    ]
  },
  {
    id: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen: Shibuya Incident',
    type: 'anime',
    tagline: 'Cursed spirits assemble.',
    synopsis: 'On October 31, 2018, a veil falls over Shibuya station trapping countless civilians. Satoru Gojo enters the subway depths alone, facing a deadly trap orchestrated by Kenjaku and special grade curses.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/6qQzMJG27XOJsyAEEIisoJB45j2.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/j2GvamiUMRpPjmNQSSht0Q7Z7e9.jpg',
    rating: 8.9,
    voteCount: '320K',
    releaseYear: 2024,
    totalSeasons: 2,
    ageRating: '16+',
    quality: '4K Ultra HD',
    audio: '5.1 Surround',
    genres: ['Anime', 'Action', 'Fantasy', 'Supernatural'],
    platform: 'Netflix',
    industry: 'Anime',
    language: 'Japanese',
    director: 'Shota Goshozono',
    isTrending: true,
    isPopularSeries: true,
    cast: [
      { name: 'Junya Enoki', character: 'Yuji Itadori', avatar: '' },
      { name: 'Yuichi Nakamura', character: 'Satoru Gojo', avatar: '' }
    ]
  },
  {
    id: 'john-wick-4',
    title: 'John Wick: Chapter 4',
    type: 'movie',
    tagline: 'No way back, one way out.',
    synopsis: 'John Wick uncovers a path to defeating The High Table. But before he can earn his freedom, Wick must face off against a new enemy with powerful alliances across the globe and forces that turn old friends into foes.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg',
    rating: 8.2,
    voteCount: '460K',
    releaseYear: 2023,
    runtime: '2h 49m',
    ageRating: 'R',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Action', 'Thriller', 'Crime'],
    platform: 'Paramount+',
    industry: 'Hollywood',
    language: 'English',
    director: 'Chad Stahelski',
    isTrending: false,
    isFresh: true,
    cast: [
      { name: 'Keanu Reeves', character: 'John Wick', avatar: '' },
      { name: 'Donnie Yen', character: 'Caine', avatar: '' },
      { name: 'Bill Skarsgård', character: 'Marquis de Gramont', avatar: '' }
    ]
  },
  {
    id: 'house-of-the-dragon',
    title: 'House of the Dragon',
    type: 'series',
    tagline: 'All must choose.',
    synopsis: 'The story of House Targaryen 200 years before the events of Game of Thrones, chronicling the beginning of the end of the dynasty and the devastating war of succession known as the Dance of the Dragons.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/577eXC8wFQT0eUrJcgznSiFPRmk.jpg',
    rating: 8.7,
    voteCount: '580K',
    releaseYear: 2024,
    totalSeasons: 2,
    ageRating: 'TV-MA',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres: ['Drama', 'Fantasy', 'Action'],
    platform: 'HBO Max',
    industry: 'Hollywood',
    language: 'English',
    director: 'Ryan J. Condal',
    isTrending: true,
    isPopularSeries: true,
    cast: [
      { name: 'Emma D’Arcy', character: 'Queen Rhaenyra Targaryen', avatar: '' },
      { name: 'Matt Smith', character: 'Prince Daemon Targaryen', avatar: '' },
      { name: 'Olivia Cooke', character: 'Queen Alicent Hightower', avatar: '' }
    ]
  },
  {
    id: 'demon-slayer',
    title: 'Demon Slayer: Hashira Training Arc',
    type: 'anime',
    tagline: 'Hone the blade. Slay the night.',
    synopsis: 'Tanjiro undergoes rigorous training with the elite Hashira swordsmen to prepare for the looming battle against Muzan Kibutsuji and the Upper Moon demons.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/nTvM4mhqNlHIvUkI1gVnW6XP7GG.jpg',
    rating: 8.8,
    voteCount: '240K',
    releaseYear: 2024,
    totalSeasons: 4,
    ageRating: '16+',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Anime', 'Action', 'Fantasy', 'Supernatural'],
    platform: 'Netflix',
    industry: 'Anime',
    language: 'Japanese',
    director: 'Haruo Sotozaki',
    isTrending: true,
    isPopularSeries: true,
    cast: [
      { name: 'Natsuki Hanae', character: 'Tanjiro Kamado', avatar: '' },
      { name: 'Akari Kito', character: 'Nezuko Kamado', avatar: '' }
    ]
  },
  {
    id: 'inception',
    title: 'Inception',
    type: 'movie',
    tagline: 'Your mind is the scene of the crime.',
    synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    rating: 8.8,
    voteCount: '2.4M',
    releaseYear: 2010,
    runtime: '2h 28m',
    ageRating: 'PG-13',
    quality: '4K Ultra HD',
    audio: '5.1 Surround',
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    platform: 'HBO Max',
    industry: 'Hollywood',
    language: 'English',
    director: 'Christopher Nolan',
    isTrending: false,
    isFresh: false,
    cast: [
      { name: 'Leonardo DiCaprio', character: 'Dom Cobb', avatar: '' },
      { name: 'Joseph Gordon-Levitt', character: 'Arthur', avatar: '' },
      { name: 'Elliot Page', character: 'Ariadne', avatar: '' }
    ]
  },
  {
    id: 'stranger-things',
    title: 'Stranger Things',
    type: 'series',
    tagline: 'Every ending has a beginning.',
    synopsis: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/9P4IIMYY3HifqeruZq0ZZ9g7YUi.jpg',
    rating: 8.7,
    voteCount: '1.4M',
    releaseYear: 2024,
    totalSeasons: 4,
    ageRating: 'TV-14',
    quality: '4K Ultra HD',
    audio: 'Spatial Audio',
    genres: ['Sci-Fi', 'Drama', 'Mystery', 'Horror'],
    platform: 'Netflix',
    industry: 'Hollywood',
    language: 'English',
    director: 'The Duffer Brothers',
    isTrending: true,
    isPopularSeries: true,
    cast: [
      { name: 'Millie Bobby Brown', character: 'Eleven', avatar: '' },
      { name: 'David Harbour', character: 'Jim Hopper', avatar: '' },
      { name: 'Winona Ryder', character: 'Joyce Byers', avatar: '' }
    ]
  },
  {
    id: 'parasite',
    title: 'Parasite',
    originalTitle: '기생충',
    type: 'movie',
    tagline: 'Act like you own the place.',
    synopsis: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    rating: 8.5,
    voteCount: '890K',
    releaseYear: 2019,
    runtime: '2h 12m',
    ageRating: 'R',
    quality: '4K Ultra HD',
    audio: '5.1 Surround',
    genres: ['Drama', 'Thriller', 'Mystery'],
    platform: 'HBO Max',
    industry: 'Asian Cinema',
    language: 'Korean',
    director: 'Bong Joon-ho',
    isTrending: false,
    isFresh: true,
    cast: [
      { name: 'Song Kang-ho', character: 'Kim Ki-taek', avatar: '' },
      { name: 'Choi Woo-shik', character: 'Kim Ki-woo', avatar: '' }
    ]
  },
  {
    id: 'poor-things',
    title: 'Poor Things',
    type: 'movie',
    tagline: 'She’s like nothing you’ve ever seen.',
    synopsis: 'The incredible tale of the fantastical evolution of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/zh6IdheEYinU4TPtorWsjx6qPQE.jpg',
    rating: 8.0,
    voteCount: '320K',
    releaseYear: 2023,
    runtime: '2h 21m',
    ageRating: 'R',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos',
    genres: ['Sci-Fi', 'Comedy', 'Drama', 'Fantasy'],
    platform: 'Disney+',
    industry: 'European',
    language: 'English',
    director: 'Yorgos Lanthimos',
    isTrending: false,
    isFresh: true,
    cast: [
      { name: 'Emma Stone', character: 'Bella Baxter', avatar: '' },
      { name: 'Mark Ruffalo', character: 'Duncan Wedderburn', avatar: '' },
      { name: 'Willem Dafoe', character: 'Dr. Godwin Baxter', avatar: '' }
    ]
  },
  {
    id: 'anatomy-of-a-fall',
    title: 'Anatomy of a Fall',
    originalTitle: 'Anatomie d’une chute',
    type: 'movie',
    tagline: 'Did he fall, or was he pushed?',
    synopsis: 'A woman is suspected of murder after her husband’s death in the snow near their secluded chalet. The trial becomes a grueling dissection of their complex marriage and their blind son’s testimony.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/1ho0d4LNZw3Y0voeKmSvPSgJOJ2.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/lDVl2jf6VB8ODl1olZ6FLvOV1gX.jpg',
    rating: 7.9,
    voteCount: '210K',
    releaseYear: 2023,
    runtime: '2h 31m',
    ageRating: '16+',
    quality: '4K Ultra HD',
    audio: '5.1 Surround',
    genres: ['Drama', 'Mystery', 'Crime'],
    platform: 'Prime Video',
    industry: 'European',
    language: 'French',
    director: 'Justine Triet',
    isTrending: false,
    isFresh: true,
    cast: [
      { name: 'Sandra Hüller', character: 'Sandra Voyter', avatar: '' },
      { name: 'Swann Arlaud', character: 'Vincent Renzi', avatar: '' }
    ]
  }
];

export const INITIAL_CONTINUE_WATCHING: ContinueWatchingItem[] = [
  {
    mediaId: 'dune-2',
    progressPercent: 68,
    currentTime: '1h 52m',
    totalDuration: '2h 46m',
    lastWatchedTimestamp: Date.now() - 3600 * 1000 * 2,
  },
  {
    mediaId: 'severance',
    progressPercent: 82,
    currentTime: '44m',
    totalDuration: '54m',
    seasonNumber: 1,
    episodeNumber: 3,
    episodeTitle: 'In Perpetuity',
    lastWatchedTimestamp: Date.now() - 3600 * 1000 * 18,
  },
  {
    mediaId: 'cyberpunk-edgerunners',
    progressPercent: 45,
    currentTime: '11m',
    totalDuration: '24m',
    seasonNumber: 1,
    episodeNumber: 2,
    episodeTitle: 'Like a Boy',
    lastWatchedTimestamp: Date.now() - 3600 * 1000 * 48,
  }
];

export interface NewEpisodeItem {
  id: string;
  showTitle: string;
  mediaId: string;
  seasonEpisode: string; // e.g. "S2 · E8"
  episodeTitle: string;
  updatedTime: string; // "2h ago", "Today", "Yesterday"
  thumbnail: string;
  runtime: string;
  platform: StreamingPlatform;
  statusBadge: string; // "New", "Finale", "Premier"
}

export const NEW_EPISODES: NewEpisodeItem[] = [
  {
    id: 'ep-sev-s2e2',
    showTitle: 'Severance',
    mediaId: 'severance',
    seasonEpisode: 'S2 · E2',
    episodeTitle: 'The Cold Harbor',
    updatedTime: '2h ago',
    thumbnail: 'https://image.tmdb.org/t/p/w1280/ixgFmf1X59PUZam2qbAfskx2gQr.jpg',
    runtime: '55m',
    platform: 'Apple TV+',
    statusBadge: 'New'
  },
  {
    id: 'ep-shg-s1e10',
    showTitle: 'Shōgun',
    mediaId: 'shogun',
    seasonEpisode: 'S1 · E10',
    episodeTitle: 'A Dream of a Dream',
    updatedTime: 'Today',
    thumbnail: 'https://image.tmdb.org/t/p/w1280/bwSmgmd90hCWwqOKQYTEraeOZhJ.jpg',
    runtime: '62m',
    platform: 'Disney+',
    statusBadge: 'Finale'
  },
  {
    id: 'ep-tlou-s2e1',
    showTitle: 'The Last of Us',
    mediaId: 'the-last-of-us',
    seasonEpisode: 'S2 · E1',
    episodeTitle: 'Return to Jackson',
    updatedTime: 'Yesterday',
    thumbnail: 'https://image.tmdb.org/t/p/w1280/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg',
    runtime: '68m',
    platform: 'HBO Max',
    statusBadge: 'Premiere'
  },
  {
    id: 'ep-arc-s2e3',
    showTitle: 'Arcane',
    mediaId: 'arcane',
    seasonEpisode: 'S2 · E3',
    episodeTitle: 'Finally Got the Name Right',
    updatedTime: '2 days ago',
    thumbnail: 'https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    runtime: '44m',
    platform: 'Netflix',
    statusBadge: 'New'
  }
];
