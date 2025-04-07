import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Book } from "@/types/types";

interface BookMetadataProps {
  book: Book;
  theme: any;
}

export default function BookMetadata({ book, theme }: BookMetadataProps) {
  return (
    <View style={[styles.detailsCard, { backgroundColor: theme.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Book Details
      </Text>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
          Added to Library
        </Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {new Date(book.dateAdded).toLocaleDateString()}
        </Text>
      </View>

      {book.lastRead && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
            Last Read
          </Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {new Date(book.lastRead).toLocaleDateString()}
          </Text>
        </View>
      )}

      {book.publisher && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
            Publisher
          </Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {book.publisher}
          </Text>
        </View>
      )}

      {book.language && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
            Language
          </Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {book.language.toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
          File Size
        </Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {(book.fileSize / (1024 * 1024)).toFixed(2)} MB
        </Text>
      </View>

      {book.rights && (
        <View
          style={[styles.descriptionContainer, { borderTopColor: "#E0E0E0" }]}
        >
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
            Copyright
          </Text>
          <Text style={[styles.descriptionText, { color: theme.text }]}>
            {book.rights}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
