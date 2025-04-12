import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getMetaFromAsyncStorage } from "../../utils/bookStorage";

interface BookHeroProps {
  title: string;
  author?: string;
  coverImage: string | null;
  progress: number;
  bookId: string;
  theme: any;
}

export default function BookHero({
  title,
  author,
  coverImage,
  progress,
  bookId,
  theme,
}: BookHeroProps) {
  // Convert progress to percentage (handle both 0-1 and 0-100 scales)
  const progressPercent = progress > 1 ? progress : Math.round(progress * 100);
  const isCompleted = progressPercent >= 100;
  const hasStarted = progressPercent > 0;

  // State to track if the book has a saved position
  const [hasSavedPosition, setHasSavedPosition] = useState(false);

  // Check if the book has a valid saved position
  useEffect(() => {
    const checkSavedPosition = async () => {
      try {
        const bookMeta = await getMetaFromAsyncStorage(bookId);
        if (bookMeta && bookMeta.cfi && bookMeta.cfi.length > 0) {
          setHasSavedPosition(true);
        } else {
          setHasSavedPosition(false);
        }
      } catch (error) {
        console.error("Error checking saved position:", error);
        setHasSavedPosition(false);
      }
    };

    checkSavedPosition();
  }, [bookId]);

  const handleStartReading = () => {
    router.push({
      pathname: "../reader/[id]",
      params: { id: bookId },
    });
  };

  return (
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

        {/* Reading status badge */}
        {isCompleted ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.success || "#4CAF50" },
            ]}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </View>
        ) : hasStarted ? (
          <View
            style={[styles.statusBadge, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="bookmark" size={18} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.heroContent}>
        <Text
          style={[styles.bookTitle, { color: theme.text }]}
          numberOfLines={3}
        >
          {title}
        </Text>

        {author && (
          <Text style={[styles.bookAuthor, { color: theme.textSecondary }]}>
            by {author}
          </Text>
        )}

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.text }]}>
              Reading Progress
            </Text>
            <Text style={[styles.progressPercent, { color: theme.primary }]}>
              {progressPercent}%
            </Text>
          </View>

          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border || "#e0e0e0",
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isCompleted
                    ? theme.success || "#4CAF50"
                    : theme.primary,
                },
              ]}
            />
          </View>

          {hasSavedPosition ? (
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleStartReading}
            >
              <Ionicons
                name="book-outline"
                size={16}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.continueButtonText}>
                {isCompleted ? "Read Again" : "Continue Reading"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleStartReading}
            >
              <Ionicons
                name="play"
                size={16}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.continueButtonText}>Start Reading</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  coverContainer: {
    position: "relative",
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
  statusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
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
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  progressPercent: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 0.5,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 4,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  buttonIcon: {
    marginRight: 6,
  },
});
