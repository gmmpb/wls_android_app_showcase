import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface BookDescriptionProps {
  description: string;
  theme: any;
}

export default function BookDescription({
  description,
  theme,
}: BookDescriptionProps) {
  if (!description) return null;

  return (
    <View style={[styles.descriptionCard, { backgroundColor: theme.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Description
      </Text>
      <Text style={[styles.descriptionText, { color: theme.text }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  descriptionCard: {
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
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
  },
});
