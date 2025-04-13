import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

interface ErrorDisplayProps {
  message: string;
  onBack: () => void;
}

export default function ErrorDisplay({ message, onBack }: ErrorDisplayProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <Ionicons name="alert-circle-outline" size={50} color={"#ff4444"} />
      <Text style={[styles.errorText, { color: theme.text }]}>{message}</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={onBack}
      >
        <Text style={styles.buttonText}>Back to Library</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
});
