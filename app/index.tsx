import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import ActionBar from "../components/ActionBar";
import Categories from "../components/Categories";
import BookList from "../components/BookList";
import AddButton from "../components/AddButton";
import { getLibraryWithCovers, initializeStorage } from "../utils/bookStorage";
import { BookDisplayData } from "@/types/types";

// Define categories
const categories = [
  { id: "all", label: "All Books" },
  { id: "currently-reading", label: "Currently Reading" },
  { id: "favorites", label: "Favorites" },
  { id: "to-read", label: "To Read" },
  { id: "completed", label: "Completed" },
  { id: "fiction", label: "Fiction" },
  { id: "non-fiction", label: "Non-Fiction" },
];

// Define the interface for our enhanced book display data

export default function HomeScreen() {
  const { theme, isLightMode } = useTheme();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<BookDisplayData[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to trigger a refresh
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Initialize storage and fetch books
  const loadBooks = useCallback(async () => {
    try {
      // Don't set loading true during refresh to avoid full-screen loader
      if (!refreshing) {
        setLoading(true);
      }

      // Initialize storage if needed
      await initializeStorage();

      // Load books with their covers
      const libraryBooks = await getLibraryWithCovers();

      // Transform book data format for display
      const displayBooks = libraryBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author || "Unknown Author",
        coverImage: book.coverData || "", // Use the loaded cover data
        progress: book.readingProgress || 0,
        lastRead: book.lastRead
          ? new Date(book.lastRead).toLocaleDateString()
          : "Never",
        genre: book.publisher, // Using publisher as genre for now
        categories: book.categories || [],
      }));

      setBooks(displayBooks);
    } catch (error) {
      console.error("Error loading books:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Effect to load books when component mounts or refresh is triggered
  useEffect(() => {
    loadBooks();
  }, [refreshTrigger, loadBooks]);

  // Handle pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Handle refresh after adding a new book
  const handleBookAdded = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Filter books based on search and category
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesSearch =
        searchText === "" ||
        book.title.toLowerCase().includes(searchText.toLowerCase()) ||
        book.author.toLowerCase().includes(searchText.toLowerCase()) ||
        (book.genre &&
          book.genre.toLowerCase().includes(searchText.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" ||
        (book.categories && book.categories.includes(selectedCategory));

      return matchesSearch && matchesCategory;
    });
  }, [books, searchText, selectedCategory]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isLightMode ? "dark" : "light"} />

      {/* Fixed Header */}
      <View
        style={[styles.headerSection, { backgroundColor: theme.background }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              My Library
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            >
              {filteredBooks.length} books •{" "}
              {books.filter((b) => b.progress > 0 && b.progress < 1).length} in
              progress
            </Text>
          </View>

          {/* Add Button in header */}
          <AddButton
            style={styles.headerAddButton}
            onReturn={handleBookAdded}
          />
        </View>
      </View>

      {/* Fixed Action Bar and Categories */}
      <View
        style={[styles.fixedControls, { backgroundColor: theme.background }]}
      >
        <View style={styles.actionAndCategoriesContainer}>
          <ActionBar
            isSearching={isSearching}
            setIsSearching={setIsSearching}
            searchText={searchText}
            setSearchText={setSearchText}
          />
          <Categories
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={(id) => setSelectedCategory(String(id))}
          />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading your library...
            </Text>
          </View>
        ) : books.length === 0 ? (
          <View style={styles.emptyLibraryContainer}>
            <Text style={[styles.emptyLibraryTitle, { color: theme.text }]}>
              Your library is empty
            </Text>
            <Text
              style={[
                styles.emptyLibrarySubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Add your first book by tapping the + button
            </Text>
          </View>
        ) : (
          <BookList
            books={filteredBooks}
            viewMode={viewMode}
            scrollY={scrollY}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
  },
  headerSection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 6,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerAddButton: {
    position: "relative", // Override absolute positioning from original AddButton
    top: 0,
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
  },
  fixedControls: {
    position: "absolute",
    top: 70, // Position below the header
    left: 0,
    right: 0,
    zIndex: 9,
    paddingBottom: 8,
  },
  contentContainer: {
    flex: 1,
    marginTop: 130, // Adjusted to account for both header and controls
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginTop: 2,
  },
  actionAndCategoriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
  },
  emptyLibraryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyLibraryTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 8,
  },
  emptyLibrarySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
});
