export interface Book {
  id: string;
  title: string;
  author?: string;
  readingProgress?: number;
  dateAdded: string;
  lastRead?: string;
  publisher?: string;
  language?: string;
  fileSize: number;
  rights?: string;
  description?: string;
  categories?: string[];
}

export interface BookDisplayData {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  progress: number;
  lastRead: string;
  genre?: string;
  rating?: number;
  pages?: number;
  categories: string[];
}

export interface BookItemProps {
  book: {
    id: string;
    title: string;
    author: string;
    coverImage: string;
    progress: number;
    lastRead: string;
    genre: string;
    rating: number;
    pages: number;
    categories: string[];
  };
  index?: number; // Optional index prop for list view
}

export interface BookMetadata {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  language?: string;
  description?: string;
  rights?: string;
  coverPath?: string;
  filePath: string;
  fileSize: number;
  dateAdded: string;
  lastRead?: string;
  readingProgress?: number;
  categories?: string[];
  totalPages?: number;
  currentPage?: number;
  cfi?: string;
  readerPreferences?: {
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    autoPageTurn?: boolean;
    autoPageInterval?: number;
  };
}

export interface Metadata {
  title?: string;
  author?: string;
  cover?: string;
  language?: string;
  publisher?: string;
  rights?: string;
  description?: string;
  totalPages?: number;
  currentPage?: number;
}
