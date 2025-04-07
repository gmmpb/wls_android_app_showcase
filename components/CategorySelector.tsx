import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CategoryItem {
  id: string;
  label: string;
}

interface CategorySelectorProps {
  categories: CategoryItem[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  theme: any;
}

const CategorySelector = ({
  categories,
  selectedCategories,
  onToggleCategory,
  theme,
}: CategorySelectorProps) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>
        Categories
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
      >
        {categories
          .filter((cat) => cat.id !== "all")
          .map((category) => {
            const isSelected = selectedCategories.includes(category.id);

            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? theme.primary + "20"
                      : theme.surface,
                    borderColor: isSelected
                      ? theme.primary
                      : theme.border || "#E0E0E0",
                  },
                ]}
                onPress={() => onToggleCategory(category.id)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.primary}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: isSelected ? theme.primary : theme.text },
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    fontFamily: "Poppins-Medium",
  },
  categoriesScrollContent: {
    paddingRight: 16,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
  },
  checkIcon: {
    marginRight: 5,
  },
});

export default CategorySelector;
