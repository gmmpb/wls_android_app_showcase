import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { ReaderProvider, Reader, useReader } from "@epubjs-react-native/core";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../context/ThemeContext";
import { getBookFile, updateReadingProgress } from "../../utils/bookStorage";
import { TableOfContents } from "../../components/reader/TableOfContent";

// Header component for the reader
function ReaderHeader({ title, onBack, onOpenToc }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={onBack} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <Text
        style={[styles.headerTitle, { color: theme.text }]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <TouchableOpacity onPress={onOpenToc} style={styles.headerButton}>
        <Ionicons name="list" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
}

// Footer component for the reader
function ReaderFooter({ currentPage, totalPages, onPageChange }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.footer, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        onPress={() => onPageChange(-1)}
        style={styles.footerButton}
        disabled={currentPage <= 1}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={currentPage <= 1 ? theme.textSecondary : theme.text}
        />
      </TouchableOpacity>

      <Text style={[styles.footerText, { color: theme.text }]}>
        {currentPage} / {totalPages}
      </Text>

      <TouchableOpacity
        onPress={() => onPageChange(1)}
        style={styles.footerButton}
        disabled={currentPage >= totalPages}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color={currentPage >= totalPages ? theme.textSecondary : theme.text}
        />
      </TouchableOpacity>
    </View>
  );
}

// Main reader component that wraps the EPUB reader
function BookReader() {
  const { id } = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme: appTheme } = useTheme();

  const readerInstance = useReader();

  const getCurrentLocation = useRef(
    () => readerInstance.getCurrentLocation?.() || 0
  ).current;
  const getTotalLocations = useRef(
    () => readerInstance.getTotalLocations?.() || 0
  ).current;
  const goToPage = useRef((page) => readerInstance.goToPage?.(page)).current;
  const goToLocation = useRef((loc) =>
    readerInstance.goToLocation?.(loc)
  ).current;

  const [bookTitle, setBookTitle] = useState("Loading...");
  const [bookPath, setBookPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [readerMounted, setReaderMounted] = useState(false);

  const tocRef = useRef(null);
  const themeApplied = useRef(false);
  const progressRef = useRef(0);
  const progressSaveTimeout = useRef(null);
  const initialThemeSetup = useRef({
    body: {
      background: appTheme.background || "#FFFFFF",
      color: "#FFFFFF",
      font: "Poppins",
      fontSize: "1.0rem",
      lineHeight: "1.5em",
      padding: "0 10px",
    },

    area: {
      background: appTheme.background || "#FFFFFF",
      color: appTheme.text || "#000000",
    },
    toc: {
      background: appTheme.background || "#FFFFFF",
      color: appTheme.text || "#000000",
      font: "Poppins",
      fontSize: "1.0rem",
      listStyleType: "none",
      listItem: {
        padding: "10px 0",
      },
      link: {
        color: appTheme.primary || "#5D5FEF",
        textDecoration: "none",
      },
    },
    svg: {
      fill: appTheme.text || "#000000",
    },
    a: {
      color: appTheme.primary || "#5D5FEF",
      textDecoration: "none",
    },
    nav: {
      background: appTheme.background || "#FFFFFF",
      color: appTheme.text || "#000000",
      padding: "20px",
      fontSize: "0.9rem",
    },
    "nav > ol": {
      listStyleType: "none",
      padding: "0 0 0 15px",
      margin: "0",
    },
    "nav li": {
      padding: "6px 0",
      borderBottom: "1px solid rgba(0,0,0,0.05)",
    },
    "nav a": {
      color: appTheme.text || "#000000",
      textDecoration: "none",
    },
  }).current;

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        const bookFilePath = await getBookFile(id as string);

        if (!bookFilePath) {
          setError("Book file not found");
          return;
        }

        setBookPath(bookFilePath);
        setLoading(false);

        setTimeout(() => {
          setReaderMounted(true);
        }, 100);
      } catch (error) {
        console.error("Error loading book file:", error);
        setError("Failed to load book. Please try again.");
      }
    }

    loadBook();
  }, [id]);

  const debounceSaveProgress = useCallback(() => {
    if (!id) return;

    try {
      const loc = getCurrentLocation();
      const total = getTotalLocations();

      if (loc && total && total > 0) {
        const progress = Math.min(loc / total, 1.0);

        if (progressSaveTimeout.current) {
          clearTimeout(progressSaveTimeout.current);
        }

        progressSaveTimeout.current = setTimeout(() => {
          updateReadingProgress(id as string, progress).catch((e) =>
            console.error("Error saving progress:", e)
          );
        }, 2000);
      }
    } catch (e) {
      console.error("Progress calculation error:", e);
    }
  }, [id, getCurrentLocation, getTotalLocations]);

  useEffect(() => {
    return () => {
      if (progressSaveTimeout.current) {
        clearTimeout(progressSaveTimeout.current);
      }
    };
  }, []);

  const handleBookReady = useCallback(({ totalLocations, coverTitle }) => {
    setBookTitle(coverTitle || "Book Reader");
    setTotalPages(totalLocations || 0);
  }, []);

  const handleLocationChange = useCallback(
    ({ location, totalLocations }) => {
      setCurrentPage((prevPage) => {
        if (prevPage !== location) {
          return location || 1;
        }
        return prevPage;
      });

      setTotalPages((prevTotal) => {
        if (prevTotal !== totalLocations) {
          return totalLocations || 0;
        }
        return prevTotal;
      });

      debounceSaveProgress();
    },
    [debounceSaveProgress]
  );

  const handlePageChange = useCallback(
    (direction: number) => {
      goToPage(currentPage + direction);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [currentPage, goToPage]
  );

  const handleBack = useCallback(() => {
    const loc = getCurrentLocation();
    const total = getTotalLocations();

    if (loc && total && total > 0) {
      const progress = Math.min(loc / total, 1.0);

      updateReadingProgress(id as string, progress)
        .then(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        })
        .catch(() => router.back());
    } else {
      router.back();
    }
  }, [id, getCurrentLocation, getTotalLocations]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: appTheme.background },
        ]}
      >
        <ActivityIndicator size="large" color={appTheme.primary} />
        <Text style={[styles.loadingText, { color: appTheme.textSecondary }]}>
          Loading book...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: appTheme.background },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={appTheme.error || "#F44336"}
        />
        <Text style={[styles.errorText, { color: appTheme.text }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.errorButton, { backgroundColor: appTheme.primary }]}
          onPress={handleBack}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={{
        ...styles.container,
        backgroundColor: appTheme.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <ReaderHeader
        title={bookTitle}
        onBack={handleBack}
        onOpenToc={() => tocRef.current?.present()}
      />

      <View style={styles.readerContainer}>
        {bookPath && readerMounted && (
          <Reader
            src={bookPath}
            width={width}
            height={height * 0.8}
            fileSystem={useFileSystem}
            onReady={handleBookReady}
            onLocationChange={handleLocationChange}
            defaultTheme={initialThemeSetup}
            initialLocation={"2"}
            renderOpeningBookComponent={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={appTheme.primary} size="large" />
                <Text
                  style={[
                    styles.loadingText,
                    { color: appTheme.text, marginTop: 16 },
                  ]}
                >
                  Opening book...
                </Text>
              </View>
            )}
            useNavigation={false}
            injectedJavaScript={`
              document.addEventListener('DOMContentLoaded', function() {
                var style = document.createElement('style');
                style.textContent = \`
                  body { 
                    color: ${appTheme.text || "#000000"};
                    background-color: ${appTheme.background || "#FFFFFF"};
                    font-family: system-ui, -apple-system, sans-serif;
                    padding: 16px;
                    line-height: 1.5;
                  }
                  nav ol { 
                    list-style-type: none;
                    padding-left: 10px;
                  }
                  nav li {
                    margin: 12px 0;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                  }
                  a { 
                    color: ${appTheme.primary || "#5D5FEF"};
                    text-decoration: none; 
                  }
                \`;
                document.head.appendChild(style);
              });
            `}
          />
        )}
      </View>

      <TableOfContents
        ref={tocRef}
        onPressSection={(section) => {
          goToLocation(section.href.split("/")[1]);
          tocRef.current?.dismiss();
        }}
        onClose={() => tocRef.current?.dismiss()}
      />

      <ReaderFooter
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </GestureHandlerRootView>
  );
}

// Main export that wraps with ReaderProvider
export default function ReaderScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      />

      <ReaderProvider>
        <BookReader />
      </ReaderProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 16,
    fontFamily: "Poppins-SemiBold",
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  readerContainer: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  footerButton: {
    padding: 8,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontFamily: "Poppins-Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 16,
    fontFamily: "Poppins-Medium",
  },
  errorButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});
