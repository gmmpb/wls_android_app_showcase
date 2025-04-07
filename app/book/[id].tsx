import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  getBookById,
  getBookCover,
  deleteBook,
  updateBookCategories,
} from "../../utils/bookStorage";
import CategorySelector from "../../components/CategorySelector";
import { Book } from "@/types/types";

// Define categories (should ideally be centralized)
const categories = [
  { id: "currently-reading", label: "Currently Reading" },
  { id: "favorites", label: "Favorites" },
  { id: "to-read", label: "To Read" },
  { id: "completed", label: "Completed" },
  { id: "fiction", label: "Fiction" },
  { id: "non-fiction", label: "Non-Fiction" },
];

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme, isLightMode } = useTheme();

  const [book, setBook] = useState<Book | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        const bookData = await getBookById(id as string);
        if (!bookData) {
          Alert.alert("Error", "Book not found");
          router.back();
          return;
        }

        setBook(bookData);
        setSelectedCategories(bookData.categories || []);

        // Load cover image
        const cover = await getBookCover(id as string);
        setCoverImage(cover);
      } catch (error) {
        console.error("Error loading book details:", error);
        Alert.alert("Error", "Failed to load book details");
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [id]);

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const saveCategories = async () => {
    if (!book) return;

    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await updateBookCategories(book.id, selectedCategories);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Categories updated successfully");
    } catch (error) {
      console.error("Error updating categories:", error);
      Alert.alert("Error", "Failed to update categories");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBook = () => {
    Alert.alert(
      "Delete Book",
      "Are you sure you want to delete this book? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              if (book) {
                await deleteBook(book.id);
              } else {
                Alert.alert("Error", "Book data is unavailable");
              }
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              router.back();
            } catch (error) {
              console.error("Error deleting book:", error);
              Alert.alert("Error", "Failed to delete book");
            }
          },
        },
      ]
    );
  };

  const handleReadBook = () => {
    if (book) {
      router.push({
        pathname: "../reader/[id]",
        params: { id: book.id },
      });
    }
  };

  const handleNavBack = () => {
    // Trigger smooth transition back
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading book details...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={handleNavBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
          // Animation configurations
          animation: "slide_from_right",
          presentation: "card",
          contentStyle: { backgroundColor: theme.background },
        }}
      />

      {book && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Section with Cover */}
          <View style={styles.heroSection}>
            <View style={styles.coverContainer}>
              {coverImage ? (
                <Image
                  source={{ uri: coverImage }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.placeholderCover,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <Ionicons name="book" size={64} color={theme.primary} />
                </View>
              )}
            </View>

            <View style={styles.heroContent}>
              <Text
                style={[styles.bookTitle, { color: theme.text }]}
                numberOfLines={3}
              >
                {book.title}
              </Text>
              {book.author && (
                <Text
                  style={[styles.bookAuthor, { color: theme.textSecondary }]}
                >
                  by {book.author}
                </Text>
              )}

              <View style={styles.progressSection}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: theme.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(book.readingProgress || 0) * 100}%`,
                        backgroundColor: theme.primary,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.progressText, { color: theme.textSecondary }]}
                >
                  {Math.round((book.readingProgress || 0) * 100)}% completed
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={handleReadBook}
            >
              <Ionicons name="book-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Read Book</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#F44336" }]}
              onPress={handleDeleteBook}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Book Details */}
          <View
            style={[styles.detailsCard, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Book Details
            </Text>

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: theme.textSecondary }]}
              >
                Added to Library
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {new Date(book.dateAdded).toLocaleDateString()}
              </Text>
            </View>

            {book.lastRead && (
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: theme.textSecondary }]}
                >
                  Last Read
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {new Date(book.lastRead).toLocaleDateString()}
                </Text>
              </View>
            )}

            {book.publisher && (
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: theme.textSecondary }]}
                >
                  Publisher
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {book.publisher}
                </Text>
              </View>
            )}

            {book.language && (
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: theme.textSecondary }]}
                >
                  Language
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {book.language.toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: theme.textSecondary }]}
              >
                File Size
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {(book.fileSize / (1024 * 1024)).toFixed(2)} MB
              </Text>
            </View>

            {book.rights && (
              <View
                style={[
                  styles.descriptionContainer,
                  { borderTopColor: "#E0E0E0" },
                ]}
              >
                <Text
                  style={[styles.detailLabel, { color: theme.textSecondary }]}
                >
                  Copyright
                </Text>
                <Text style={[styles.descriptionText, { color: theme.text }]}>
                  {book.rights}
                </Text>
              </View>
            )}
          </View>

          {/* Categories Section */}
          <View
            style={[styles.categoriesCard, { backgroundColor: theme.surface }]}
          >
            <View style={styles.categoriesHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Categories
              </Text>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: isSaving ? 0.7 : 1,
                  },
                ]}
                onPress={saveCategories}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <CategorySelector
              categories={categories}
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              theme={theme}
            />
          </View>

          {/* Description Section */}
          {book.description && (
            <View
              style={[
                styles.descriptionCard,
                { backgroundColor: theme.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Description
              </Text>
              <Text style={[styles.descriptionText, { color: theme.text }]}>
                {book.description}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  heroSection: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  coverContainer: {
    width: 120,
    height: 180,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  placeholderCover: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    fontFamily: "Poppins-Bold",
  },
  bookAuthor: {
    fontSize: 14,
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
  },
  progressSection: {
    width: "100%",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    marginBottom: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
    flex: 1,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: "Poppins-SemiBold",
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    fontFamily: "Poppins-SemiBold",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Poppins-Medium",
  },
  categoriesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  categoriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  descriptionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
    marginTop: 8,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
