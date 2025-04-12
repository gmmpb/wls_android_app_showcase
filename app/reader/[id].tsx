import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { ReaderProvider, Reader, useReader } from "@epubjs-react-native/core";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import {
  getBookFile,
  updateReadingProgress,
  getMetaFromAsyncStorage,
} from "../../utils/bookStorage";

// Simple header with back button and title
function ReaderHeader({
  title,
  onBack,
  progress,
}: {
  title: string;
  onBack: () => void;
  progress: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {progress}%
        </Text>
      </View>
    </View>
  );
}

// Core reader component
function BookReader() {
  const { id } = useLocalSearchParams();
  const bookId = Array.isArray(id) ? id[0] : id;
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const tocRef = useRef(null);

  // Basic state
  const [bookTitle, setBookTitle] = useState("Book Reader");
  const [bookPath, setBookPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { getCurrentLocation, goToLocation, totalLocations, key, setKey } =
    useReader();

  // Create stable theme object for the reader to prevent re-renders
  const readerTheme = useMemo(
    () => ({
      body: {
        background: theme.background,
        color: theme.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      },
    }),
    [theme.background, theme.text]
  );

  // Load book metadata and last location when reader is ready
  const handleReady = async () => {
    try {
      const bookMeta = await getMetaFromAsyncStorage(bookId);

      if (bookMeta) {
        setBookTitle(bookMeta.title);

        // Set initial progress from stored metadata
        if (bookMeta.readingProgress) {
          setReadingProgress(bookMeta.readingProgress);
        }

        // Restore last reading location if available
        if (bookMeta.cfi && bookMeta.cfi.length > 0) {
          console.log("Attempting to restore position to:", bookMeta.cfi);

          // Delay a bit more to ensure the reader is fully ready
          setTimeout(() => {
            try {
              goToLocation(bookMeta.cfi);
              console.log("Position restored successfully");
            } catch (error) {
              console.error("Error while restoring position:", error);

              // Try again with a longer delay as a fallback
              setTimeout(() => {
                try {
                  goToLocation(bookMeta.cfi);
                  console.log("Position restored on second attempt");
                } catch (secondError) {
                  console.error(
                    "Failed to restore position on second attempt:",
                    secondError
                  );
                }
              }, 1000);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error("Failed to load book metadata:", error);
    }
  };

  // Load book only once
  useEffect(() => {
    async function loadBook() {
      if (bookPath) return; // Don't reload if already loaded

      try {
        setLoading(true);
        const filePath = await getBookFile(bookId);
        if (filePath) {
          setBookPath(filePath);

          // Get book metadata to retrieve title
          const bookMeta = await getMetaFromAsyncStorage(bookId);
          if (bookMeta) {
            setBookTitle(bookMeta.title);
            if (bookMeta.readingProgress) {
              setReadingProgress(bookMeta.readingProgress);
            }
          }
        } else {
          setErrorMessage("Book file could not be loaded");
        }
      } catch (error) {
        console.error("Failed to load book:", error);
        setErrorMessage("Error loading book");
      } finally {
        setLoading(false);
      }
    }

    loadBook();

    return () => {
      // Cleanup function to reset state when component unmounts
      setBookPath(null);
    };
  }, [bookId]);

  // Handle navigation back
  const goBack = useCallback(() => {
    router.back();
  }, []);

  // Handle when the reader changes location
  const handleLocationChange = useCallback(() => {
    try {
      // Get current location from the reader
      const location = getCurrentLocation();
      console.log("Current location:", location);
      if (!location) return;

      // Get current page and total pages
      const current = location.end.displayed.page || 0;
      const total = location.end.displayed.total || 1;

      // Get CFI string - use start.cfi for more precise location tracking when navigating backwards
      const cfi = location.start.cfi;

      // Skip progress update for table of contents (typically has "toc" in the href)
      const isTOC =
        location.end.href && location.end.href.toLowerCase().includes("toc");

      // Ensure we have valid data before updating progress
      if (!cfi || current === 0 || total === 0) return;

      // Don't update progress if we're in the table of contents
      if (isTOC) {
        console.log("Skipping progress update for table of contents");
        return;
      }

      // Calculate progress percentage (0-100)
      const progressPercent = Math.round((current / total) * 100);

      // Verify the progress is valid (between 0-100)
      if (progressPercent < 0 || progressPercent > 100) {
        console.log("Invalid progress value:", progressPercent);
        return;
      }

      // Update local state
      setReadingProgress(progressPercent);

      // Always save the current CFI regardless of whether it's forward or backward navigation
      // This ensures we can always resume at the exact position
      updateReadingProgress(
        bookId,
        progressPercent,
        current,
        cfi,
        false // Don't enforce forward-only progress
      ).catch((error) => {
        console.error("Error updating reading progress:", error);
      });
    } catch (error) {
      console.error("Error with location change:", error);
    }
  }, [bookId, getCurrentLocation]);

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading book...
        </Text>
      </View>
    );
  }

  // Render error state
  if (errorMessage) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons
          name="alert-circle-outline"
          size={50}
          color={theme.error || "#ff4444"}
        />
        <Text style={[styles.errorText, { color: theme.text }]}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={goBack}
        >
          <Text style={styles.buttonText}>Back to Library</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ReaderHeader
        title={bookTitle}
        onBack={goBack}
        progress={readingProgress}
      />

      <View style={styles.readerContainer}>
        {bookPath && (
          <Reader
            src={bookPath}
            width={width}
            height={height * 0.85}
            fileSystem={useFileSystem}
            defaultTheme={readerTheme}
            onReady={handleReady}
            onLocationChange={handleLocationChange}
            enableSwipe={true}
            enableSelection={true}
          />
        )}
      </View>
    </View>
  );
}

// Main screen component
export default function ReaderScreen() {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.page, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        />
        <ReaderProvider>
          <BookReader />
        </ReaderProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginHorizontal: 12,
  },
  progressContainer: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  readerContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
});
