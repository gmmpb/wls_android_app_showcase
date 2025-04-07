import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { BookItemProps } from "@/types/types";

const fallbackImage = "https://via.placeholder.com/300x500?text=No+Image";

const BookItem: React.FC<BookItemProps> = ({ book, index }) => {
  const [imageUri, setImageUri] = useState(book.coverImage);

  const handleImageError = () => {
    setImageUri(fallbackImage); // Use fallback image if the original fails
  };

  const isCompleted = book.progress === 1;

  const handlePress = () => {
    router.push({
      pathname: "/book/[id]",
      params: { id: book.id },
    });
  };

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.bookCover}
          resizeMode="cover" // Ensure the image covers the container
          onError={handleImageError} // Set fallback image on error
        />
        {isCompleted ? (
          <View style={styles.completedBadge}>
            <Text style={styles.progressText}>✔</Text>
          </View>
        ) : (
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>
              {Math.round(book.progress * 100)}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${book.progress * 100}%`, backgroundColor: "#4CAF50" },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    margin: 4,
    width: (Dimensions.get("window").width - 32) / 2,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    backgroundColor: "#fff",
  },
  coverContainer: {
    position: "relative",
    aspectRatio: 0.7, // Maintain the aspect ratio for the cover image
  },
  bookCover: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0", // Add a fallback background color
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
  },
  completedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#4CAF50",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bookInfo: {
    padding: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    width: "100%",
    overflow: "hidden",
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
    marginBottom: 6,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  listCover: {
    width: 80,
    height: "100%",
    backgroundColor: "#f0f0f0", // Add a fallback background color
  },
  listDetails: {
    flex: 1,
    padding: 14,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },
  ratingText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  listMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  genreContainer: {
    flexDirection: "row",
  },
  genre: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  progressSection: {
    marginTop: 4,
  },
  lastReadContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  lastRead: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
});

export default BookItem;
