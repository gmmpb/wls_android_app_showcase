import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import CategorySelector from "../CategorySelector";

// Define categories (should ideally be centralized)
const categories = [
  { id: "currently-reading", label: "Currently Reading" },
  { id: "favorites", label: "Favorites" },
  { id: "to-read", label: "To Read" },
  { id: "completed", label: "Completed" },
  { id: "fiction", label: "Fiction" },
  { id: "non-fiction", label: "Non-Fiction" },
];

interface BookCategoriesProps {
  selectedCategories: string[];
  onToggleCategory: (categoryId: string) => void;
  onSaveCategories: () => void;
  isSaving: boolean;
  theme: any;
}

export default function BookCategories({
  selectedCategories,
  onToggleCategory,
  onSaveCategories,
  isSaving,
  theme,
}: BookCategoriesProps) {
  return (
    <View style={[styles.categoriesCard, { backgroundColor: theme.surface }]}>
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
          onPress={onSaveCategories}
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
        onToggleCategory={onToggleCategory}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    fontFamily: "Poppins-SemiBold",
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
});
