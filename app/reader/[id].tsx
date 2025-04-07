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

import AsyncStorage from "@react-native-async-storage/async-storage";

// Simple header with back button and title
function ReaderHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

// Core reader component
function BookReader() {
  const { id } = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const tocRef = useRef(null);

  // Basic state
  const [bookTitle, setBookTitle] = useState("Book Reader");
  const [bookPath, setBookPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { getCurrentLocation, goToLocation } = useReader();
  const currentLocation = getCurrentLocation();
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

  // Memoize the onReady function to keep it stable between renders
  // Define interfaces for book metadata structure
  interface BookPackage {
    metadata: {
      title?: string;
    };
  }

  interface Book {
    package?: BookPackage;
    coverTitle?: string;
  }

  const handleReady = async () => {
    const bookMeta = await getMetaFromAsyncStorage(id as string);
    const lastLocation = bookMeta?.cfi;
    if (lastLocation) {
      console.log("Book metadata:!!!!", bookMeta);
      goToLocation(String(lastLocation));
    }
  };

  // Load book only once
  useEffect(() => {
    async function loadBook() {
      if (bookPath) return; // Don't reload if already loaded

      try {
        const filePath = await getBookFile(id as string);
        if (filePath) {
          setBookPath(filePath);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to load book:", error);
        setLoading(false);
      }
    }

    loadBook();
  }, [id, bookPath]);

  // Handle navigation back
  const goBack = useCallback(() => {
    router.back();
  }, []);

  // When a reader successfully mounts and has a location change
  const handleLocationChange = () => {
    try {
      const current = currentLocation?.end.displayed.page;
      const total = currentLocation?.end.displayed.total;
      const cfi = currentLocation?.start.cfi;
      const progress = Math.round(((current ?? 0) / (total ?? 1)) * 100) || 0;
      // Debounce updating progress
      if (currentLocation) {
        if (id) {
          updateReadingProgress(
            Array.isArray(id) ? id[0] : id,
            progress,
            current || 0,
            cfi || ""
          ).catch(console.error);
        }
      }
    } catch (e) {
      console.error("Error with location change:", e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ReaderHeader title={bookTitle} onBack={goBack} />

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
            // Disable unnecessary features that might cause updates
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginHorizontal: 12,
  },
  readerContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
