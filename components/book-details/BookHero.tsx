import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface BookHeroProps {
  title: string;
  author?: string;
  coverImage: string | null;
  progress: number;
  theme: any;
}

export default function BookHero({
  title,
  author,
  coverImage,
  progress,
  theme,
}: BookHeroProps) {
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
          <View
            style={[styles.progressBar, { backgroundColor: theme.surface }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {Math.round(progress * 100)}% completed
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
