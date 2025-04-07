import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function Categories({
  categories,
  selectedCategory,
  setSelectedCategory,
}: {
  categories: { id: string | number; label: string }[];
  selectedCategory: string | number;
  setSelectedCategory: (id: string | number) => void;
}) {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesContainer}
      style={styles.container}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            {
              backgroundColor:
                selectedCategory === category.id
                  ? theme.primary
                  : theme.surface,
            },
          ]}
          onPress={() => setSelectedCategory(category.id)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.categoryLabel,
              {
                color:
                  selectedCategory === category.id
                    ? "#FFF"
                    : theme.textSecondary,
              },
            ]}
          >
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  categoriesContainer: {
    paddingHorizontal: 8, // Reduced horizontal padding for tighter alignment
    paddingVertical: 2, // Reduced vertical padding to minimize height
    alignItems: "center", // Ensure the chips are vertically centered
  },
  container: {
    maxHeight: 40, // Set a maximum height for the category bar
  },
  categoryChip: {
    paddingHorizontal: 10, // Slightly increased horizontal padding for better spacing
    paddingVertical: 2, // Reduced vertical padding for compactness
    borderRadius: 16, // Slightly larger border radius for a smoother look
    marginRight: 8, // Adjusted margin for better spacing between chips
    minWidth: 70, // Increased minimum width for better readability
    alignItems: "center",
    justifyContent: "center", // Ensure text is vertically centered
    height: 26, // Reduced height for a more compact design
  },
  categoryLabel: {
    fontSize: 11, // Slightly increased font size for better readability
    fontFamily: "Poppins-Medium",
  },
});
