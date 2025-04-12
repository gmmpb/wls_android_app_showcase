import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { BookItemProps } from "@/types/types";
import { useTheme } from "../context/ThemeContext";

const fallbackImage = "https://via.placeholder.com/300x500?text=No+Image";

const BookItem: React.FC<BookItemProps> = ({ book, index }) => {
  const [imageUri, setImageUri] = useState(book.coverImage);
  const { theme } = useTheme();

  const handleImageError = () => {
    setImageUri(fallbackImage); // Use fallback image if the original fails
  };

  // Interpret progress from 0-100 scale
  const progressPercent =
    typeof book.progress === "number"
      ? book.progress > 1
        ? book.progress
        : Math.round(book.progress * 100)
      : 0;

  const isCompleted = progressPercent >= 100;
  const inProgress = progressPercent > 0 && progressPercent < 100;

  const handlePress = () => {
    router.push({
      pathname: "/book/[id]",
      params: { id: book.id },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.gridItem, { backgroundColor: theme.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.bookCover}
          resizeMode="cover"
          onError={handleImageError}
        />

        {/* Status indicator */}
        {isCompleted ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.success || "#4CAF50" },
            ]}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        ) : inProgress ? (
          <View
            style={[styles.statusBadge, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="book" size={16} color="#fff" />
          </View>
        ) : null}

        {/* Progress percentage */}
        {inProgress && (
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        )}
      </View>

      <View style={styles.bookInfo}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {book.title}
        </Text>

        <Text
          style={[styles.author, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {book.author}
        </Text>

        {/* Progress bar */}
        <View
          style={[
            styles.progressBar,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isCompleted
                  ? theme.success || "#4CAF50"
                  : theme.primary || "#2196F3",
              },
            ]}
          />
        </View>

        {/* Last read info */}
        {book.lastRead && book.lastRead !== "Never" && (
          <View style={styles.lastReadContainer}>
            <Ionicons
              name="time-outline"
              size={12}
              color={theme.textSecondary}
              style={styles.lastReadIcon}
            />
            <Text style={[styles.lastRead, { color: theme.textSecondary }]}>
              {book.lastRead}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    margin: 8,
    width: (Dimensions.get("window").width - 48) / 2,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  coverContainer: {
    position: "relative",
    aspectRatio: 0.7, // Maintain the aspect ratio for the cover image
  },
  bookCover: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0", // Fallback background color
  },
  progressIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
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
  },
  bookInfo: {
    padding: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 4,
    marginTop: 8,
    width: "100%",
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 0.5,
  },
  progressFill: {
    height: "100%",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 3,
  },
  author: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginBottom: 4,
  },
  lastReadContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  lastReadIcon: {
    marginRight: 4,
  },
  lastRead: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
  },
});

export default BookItem;
