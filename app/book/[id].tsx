import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Text,
  StyleSheet,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "expo-haptics";
import {
  getBookById,
  getBookCover,
  deleteBook,
  updateBookCategories,
} from "../../utils/bookStorage";
import { Book } from "@/types/types";

// Import components
import BookHero from "../../components/book-details/BookHero";
import BookActions from "../../components/book-details/BookActions";
import BookMetadata from "../../components/book-details/BookMetadata";
import BookCategories from "../../components/book-details/BookCategories";
import BookDescription from "../../components/book-details/BookDescription";

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

  if (!book) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.errorText, { color: "#F44336" }]}>
          Book not found
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
          // Fix the transition animations
          animation: "slide_from_right",
          animationDuration: 300,
          // These options prevent the screen from disappearing during animation
          presentation: "transparentModal", // Changed from "card" to maintain background
          contentStyle: {
            backgroundColor: theme.background,
          },
          // Ensure content stays visible during transitions
          detachPreviousScreen: false,
          // Make sure iOS gestures don't cause the white flash
          gestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BookHero
          title={book.title}
          author={book.author}
          coverImage={coverImage}
          progress={book.readingProgress || 0}
          theme={theme}
        />

        <BookActions
          onRead={handleReadBook}
          onDelete={handleDeleteBook}
          theme={theme}
        />

        <BookMetadata book={book} theme={theme} />

        <BookCategories
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
          onSaveCategories={saveCategories}
          isSaving={isSaving}
          theme={theme}
        />

        {book.description && (
          <BookDescription description={book.description} theme={theme} />
        )}
      </ScrollView>
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
  errorText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
