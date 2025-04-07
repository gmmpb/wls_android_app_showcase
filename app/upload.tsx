import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Reader, useReader, ReaderProvider } from "@epubjs-react-native/core";
import { useFileSystem } from "@epubjs-react-native/expo-file-system";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import {
  initializeStorage,
  addBookToLibrary,
  BookMetadata,
} from "../utils/bookStorage";
import CategorySelector from "../components/CategorySelector";

const categories = [
  { id: "all", label: "All Books" },
  { id: "currently-reading", label: "Currently Reading" },
  { id: "favorites", label: "Favorites" },
  { id: "to-read", label: "To Read" },
  { id: "completed", label: "Completed" },
  { id: "fiction", label: "Fiction" },
  { id: "non-fiction", label: "Non-Fiction" },
];

export default function UploadScreen() {
  const { theme, isLightMode } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  interface SelectedFile {
    uri: string;
    name: string;
    size: number;
  }

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  interface Metadata {
    title?: string;
    author?: string;
    cover?: string;
    language?: string;
    publisher?: string;
    rights?: string;
    description?: string;
  }

  const [metaData, setMetaData] = useState<Metadata | null>(null);
  const [error, setError] = useState("");
  const [bookReady, setBookReady] = useState(false);
  const [savedBook, setSavedBook] = useState<BookMetadata | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "to-read",
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (metaData) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [metaData]);

  useEffect(() => {
    initializeStorage().catch((err) => {
      console.error("Failed to initialize storage:", err);
    });
  }, []);

  const pickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setError("");
      setBookReady(false);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/epub+zip"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setSelectedFile({
        uri: result.assets[0].uri,
        name: result.assets[0].name,
        size: result.assets[0].size || 0, // Fallback to 0 if size is undefined
      });
    } catch (err) {
      console.error("Error picking document:", err);
      setError("Failed to select file. Please try again.");
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !metaData) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsUploading(true);
    try {
      const book = await addBookToLibrary(selectedFile.uri, selectedFile.size, {
        ...metaData,
        categories: selectedCategories,
      });

      setSavedBook(book);
      console.log("Book saved successfully:", book);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await new Promise((resolve) => setTimeout(resolve, 500));
      router.back();
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to add book to library. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ReaderProvider>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isLightMode ? "dark" : "light"} />

        <Stack.Screen
          options={{
            title: "Add Book",
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />

        {selectedFile && (
          <View style={styles.hiddenReader}>
            <BookMetadataExtractor
              src={selectedFile.uri}
              onMetadataExtracted={(metadata: Metadata) =>
                setMetaData(metadata)
              }
              onError={(err: Error) =>
                setError(err.message || "Failed to read book metadata")
              }
            />
          </View>
        )}

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { backgroundColor: theme.background },
            ]}
          >
            <View
              style={[styles.uploadArea, { backgroundColor: theme.surface }]}
            >
              {selectedFile ? (
                <View style={styles.filePreview}>
                  <View style={styles.coverContainer}>
                    {metaData && metaData.cover ? (
                      <Image
                        source={{ uri: metaData.cover }}
                        style={styles.coverImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.coverPlaceholder,
                          { backgroundColor: theme.primary + "20" },
                        ]}
                      >
                        <Ionicons name="book" size={50} color={theme.primary} />
                      </View>
                    )}

                    <View style={styles.coverOverlay}>
                      <BlurView
                        intensity={isLightMode ? 50 : 100}
                        tint={isLightMode ? "light" : "dark"}
                        style={styles.blurOverlay}
                      >
                        <TouchableOpacity
                          style={styles.coverButton}
                          onPress={pickDocument}
                        >
                          <Ionicons name="reload" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      </BlurView>
                    </View>
                  </View>

                  <Text
                    style={[styles.fileName, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {metaData?.title || selectedFile.name}
                  </Text>

                  <View style={styles.fileInfoRow}>
                    <Text
                      style={[styles.fileInfo, { color: theme.textSecondary }]}
                    >
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </Text>
                    <View style={styles.divider} />
                    {metaData?.language && (
                      <Text
                        style={[
                          styles.fileInfo,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {metaData.language.toUpperCase()}
                      </Text>
                    )}
                  </View>

                  {metaData && (
                    <View style={styles.metadataCard}>
                      {metaData.author && (
                        <View style={styles.metadataRow}>
                          <Text
                            style={[
                              styles.metadataLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Author
                          </Text>
                          <Text
                            style={[
                              styles.metadataValue,
                              { color: theme.text },
                            ]}
                          >
                            {metaData.author}
                          </Text>
                        </View>
                      )}

                      {metaData.publisher && (
                        <View style={styles.metadataRow}>
                          <Text
                            style={[
                              styles.metadataLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Publisher
                          </Text>
                          <Text
                            style={[
                              styles.metadataValue,
                              { color: theme.text },
                            ]}
                          >
                            {metaData.publisher}
                          </Text>
                        </View>
                      )}

                      {metaData.rights && (
                        <View style={styles.metadataRow}>
                          <Text
                            style={[
                              styles.metadataLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Rights
                          </Text>
                          <Text
                            style={[
                              styles.metadataValue,
                              { color: theme.text },
                            ]}
                          >
                            {metaData.rights}
                          </Text>
                        </View>
                      )}

                      {metaData.description && (
                        <View style={styles.descriptionContainer}>
                          <Text
                            style={[
                              styles.metadataLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Description
                          </Text>
                          <Text
                            style={[
                              styles.descriptionText,
                              { color: theme.text },
                            ]}
                            numberOfLines={4}
                          >
                            {metaData.description}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickDocument}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.uploadIconContainer,
                      { backgroundColor: theme.primary + "15" },
                    ]}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={50}
                      color={theme.primary}
                    />
                  </View>
                  <Text style={[styles.uploadText, { color: theme.text }]}>
                    Select EPUB File
                  </Text>
                  <Text
                    style={[
                      styles.uploadSubtext,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Tap to browse your files
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedFile && (
              <View style={styles.categoriesCard}>
                <CategorySelector
                  categories={categories}
                  selectedCategories={selectedCategories}
                  onToggleCategory={toggleCategory}
                  theme={theme}
                />
              </View>
            )}

            {error !== "" && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={"#F44336"} />
                <Text style={[styles.errorText, { color: "#F44336" }]}>
                  {error}
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: selectedFile ? theme.primary : theme.surface,
                opacity: selectedFile ? 1 : 0.6,
              },
            ]}
            disabled={!selectedFile || isUploading}
            onPress={handleUpload}
          >
            {isUploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingText}>Adding to library...</Text>
              </View>
            ) : (
              <>
                <Ionicons
                  name={selectedFile ? "library-outline" : "document-outline"}
                  size={20}
                  color={selectedFile ? "#FFFFFF" : theme.textSecondary}
                  style={styles.buttonIcon}
                />
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: selectedFile ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {selectedFile ? "Add to Library" : "Select a File"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ReaderProvider>
  );
}

// Helper component to extract EPUB metadata
function BookMetadataExtractor({ src, onMetadataExtracted, onError }: any) {
  const { getMeta } = useReader();
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const metadata = getMeta();
        console.log(`Attempt ${attempts + 1} - Extracted metadata:`, metadata);

        if (
          (metadata.title || metadata.author || metadata.cover) &&
          (metadata.title !== "" || metadata.cover)
        ) {
          onMetadataExtracted(metadata);
        } else if (attempts < MAX_ATTEMPTS) {
          setAttempts(attempts + 1);
        } else {
          const filename = src.split("/").pop().split(".")[0];
          onMetadataExtracted({
            ...metadata,
            title: filename ? filename.replace(/[-_]/g, " ") : "Unknown Title",
          });
        }
      } catch (err) {
        console.error("Error extracting metadata:", err);
        if (attempts < MAX_ATTEMPTS) {
          setAttempts(attempts + 1);
        } else {
          onError(err);
        }
      }
    }, 1000 * (attempts + 1));

    return () => clearTimeout(timer);
  }, [attempts, src]);

  return (
    <Reader
      src={src}
      fileSystem={useFileSystem}
      width={1}
      height={1}
      onReady={() => {
        console.log("Book ready event triggered");
      }}
      // Error handling can be done here if needed
    />
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hiddenReader: {
    width: 1,
    height: 1,
    opacity: 0,
    position: "absolute",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  uploadArea: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 10,
    marginBottom: 16,
  },
  uploadButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  uploadIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    fontFamily: "Poppins-SemiBold",
  },
  uploadSubtext: {
    fontSize: 14,
    marginTop: 8,
    fontFamily: "Poppins-Regular",
  },
  filePreview: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  coverContainer: {
    position: "relative",
    width: 140,
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  coverOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 10,
    overflow: "hidden",
  },
  blurOverlay: {
    padding: 8,
  },
  coverButton: {
    padding: 4,
  },
  fileName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
    maxWidth: "90%",
    fontFamily: "Poppins-Bold",
  },
  fileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  fileInfo: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  divider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D1D1",
    marginHorizontal: 8,
  },
  metadataCard: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 16,
  },
  metadataRow: {
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
  },
  descriptionContainer: {
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    marginLeft: 10,
    color: "#FFFFFF",
    fontFamily: "Poppins-Medium",
  },
  categoriesCard: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
});
