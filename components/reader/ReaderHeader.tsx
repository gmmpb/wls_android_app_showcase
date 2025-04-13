import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

interface ReaderHeaderProps {
  title: string;
  onBack: () => void;
  progress: number;
  onOpenTOC: () => void;
}

export default function ReaderHeader({
  title,
  onBack,
  progress,
  onOpenTOC,
}: ReaderHeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={onOpenTOC} style={styles.tocButton}>
          <Ionicons name="list-outline" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {progress}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  tocButton: {
    padding: 8,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
});
