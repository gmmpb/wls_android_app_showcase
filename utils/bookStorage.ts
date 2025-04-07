import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { nanoid } from "nanoid/non-secure";
import { BookMetadata } from "@/types/types";

// Ensure the required directories exist
export const initializeStorage = async () => {
  const dirs = [
    FileSystem.documentDirectory + "books/",
    FileSystem.documentDirectory + "covers/",
  ];

  for (const dir of dirs) {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  }
};

// Save an EPUB file to the books directory
export const saveEpubFile = async (uri: string): Promise<string> => {
  const filename = `${nanoid()}.epub`;
  const destination = FileSystem.documentDirectory + "books/" + filename;

  await FileSystem.copyAsync({
    from: uri,
    to: destination,
  });

  return destination;
};

// Save a cover image from base64 data
export const saveCoverImage = async (
  base64Cover: string
): Promise<string | null> => {
  if (!base64Cover) return null;

  const filename = `${nanoid()}.jpg`;
  const destination = FileSystem.documentDirectory + "covers/" + filename;

  // Handle data URL format if present
  const base64Data = base64Cover.includes("data:image")
    ? base64Cover.split(",")[1]
    : base64Cover;

  await FileSystem.writeAsStringAsync(destination, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return destination;
};

// Add a book to the library
export const addBookToLibrary = async (
  fileUri: string,
  fileSize: number,
  metadata: any
): Promise<BookMetadata> => {
  // Save the EPUB file
  const savedFilePath = await saveEpubFile(fileUri);
  console.log("Book metadata:", metadata);

  // Save the cover image if available
  let coverPath = null;
  if (metadata.cover) {
    coverPath = await saveCoverImage(metadata.cover);
  }

  // Create the book metadata object
  const bookData: BookMetadata = {
    id: nanoid(),
    title: metadata.title || "Unknown Title",
    author: metadata.author || "Unknown Author",
    publisher: metadata.publisher || "",
    language: metadata.language || "",
    description: metadata.description || "",
    rights: metadata.rights || "",
    coverPath: coverPath || "",
    filePath: savedFilePath,
    fileSize: fileSize,
    dateAdded: new Date().toISOString(),
    readingProgress: 0,
    categories: metadata.categories || [],
    totalPages: metadata.totalLocations || 0,
    currentPage: metadata.currentPage || 0,
    cfi: metadata.cfi || "",
  };

  // Get current library
  const libraryJson = await AsyncStorage.getItem("bookLibrary");
  const library = libraryJson ? JSON.parse(libraryJson) : { books: [] };

  // Add the new book
  library.books.push(bookData);
  console.log("Library after adding book:", library);
  console.log("Book data:", bookData);
  // Save updated library
  await AsyncStorage.setItem("bookLibrary", JSON.stringify(library));

  return bookData;
};

// Get all books in the library
export const getLibrary = async (): Promise<BookMetadata[]> => {
  const libraryJson = await AsyncStorage.getItem("bookLibrary");
  if (!libraryJson) return [];

  const library = JSON.parse(libraryJson);
  return library.books || [];
};

// Get a book by ID
export const getBookById = async (id: string): Promise<BookMetadata | null> => {
  const library = await getLibrary();
  return library.find((book) => book.id === id) || null;
};

// Update a book's reading progress
export const updateReadingProgress = async (
  id: string,
  progress: number,
  currentPage: number,
  cfi: string
): Promise<void> => {
  const libraryJson = await AsyncStorage.getItem("bookLibrary");
  if (!libraryJson) return;
  const library = JSON.parse(libraryJson);
  const bookIndex: number = library.books.findIndex(
    (book: BookMetadata) => book.id === id
  );
  if (library.books[bookIndex].currentPage < currentPage) {
    library.books[bookIndex].readingProgress = progress;
    library.books[bookIndex].lastRead = new Date().toISOString();
    library.books[bookIndex].currentPage = currentPage;
    library.books[bookIndex].cfi = cfi;
    await AsyncStorage.setItem("bookLibrary", JSON.stringify(library));
  }
};

// Update a book's categories
export const updateBookCategories = async (
  id: string,
  categories: string[]
): Promise<void> => {
  const libraryJson = await AsyncStorage.getItem("bookLibrary");
  if (!libraryJson) return;

  const library = JSON.parse(libraryJson);
  const bookIndex: number = library.books.findIndex(
    (book: BookMetadata) => book.id === id
  );

  if (bookIndex !== -1) {
    library.books[bookIndex].categories = categories;
    await AsyncStorage.setItem("bookLibrary", JSON.stringify(library));
  }
};

// Delete a book from the library
export const deleteBook = async (id: string): Promise<boolean> => {
  const libraryJson = await AsyncStorage.getItem("bookLibrary");
  if (!libraryJson) return false;

  const library = JSON.parse(libraryJson);
  const bookIndex: number = library.books.findIndex(
    (book: BookMetadata) => book.id === id
  );

  if (bookIndex === -1) return false;

  const book = library.books[bookIndex];

  // Delete the book file
  if (book.filePath) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(book.filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(book.filePath);
      }
    } catch (error) {
      console.error("Error deleting book file:", error);
    }
  }

  // Delete the cover image
  if (book.coverPath) {
    try {
      const coverInfo = await FileSystem.getInfoAsync(book.coverPath);
      if (coverInfo.exists) {
        await FileSystem.deleteAsync(book.coverPath);
      }
    } catch (error) {
      console.error("Error deleting cover image:", error);
    }
  }

  // Remove the book from the library
  library.books.splice(bookIndex, 1);
  await AsyncStorage.setItem("bookLibrary", JSON.stringify(library));

  return true;
};

// Get cover image as base64 for a book
export const getBookCover = async (bookId: string): Promise<string | null> => {
  const book = await getBookById(bookId);
  if (!book || !book.coverPath) return null;

  try {
    const coverInfo = await FileSystem.getInfoAsync(book.coverPath);
    if (!coverInfo.exists) return null;

    // Read the image file as base64
    const base64Cover = await FileSystem.readAsStringAsync(book.coverPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Return as proper data URL
    return `data:image/jpeg;base64,${base64Cover}`;
  } catch (error) {
    console.error(`Error loading cover for book ${bookId}:`, error);
    return null;
  }
};

// Get book file for reading
export const getBookFile = async (bookId: string): Promise<string | null> => {
  const book = await getBookById(bookId);
  if (!book || !book.filePath) return null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(book.filePath);
    if (!fileInfo.exists) return null;

    // Just return the file path as it exists
    return book.filePath;
  } catch (error) {
    console.error(`Error accessing file for book ${bookId}:`, error);
    return null;
  }
};

// Get all books with their covers loaded
export const getLibraryWithCovers = async (): Promise<
  (BookMetadata & { coverData?: string })[]
> => {
  const books = await getLibrary();

  // Load covers for all books in parallel
  const booksWithCovers = await Promise.all(
    books.map(async (book) => {
      let coverData = undefined;

      if (book.coverPath) {
        try {
          const cover = await getBookCover(book.id);
          coverData = cover || undefined;
        } catch (error) {
          console.error(`Failed to load cover for book ${book.id}:`, error);
        }
      }

      return {
        ...book,
        coverData,
      };
    })
  );

  return booksWithCovers;
};

export const getMetaFromAsyncStorage = async (
  id: string
): Promise<BookMetadata | null> => {
  const libraryJson = await AsyncStorage.getItem("bookLibrary");
  if (!libraryJson) return null;
  const library = JSON.parse(libraryJson);
  const book = library.books.find((book: BookMetadata) => book.id === id);

  return book || null;
};
