import { Section as SectionType, useReader } from "@epubjs-react-native/core";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  searchTerm: string;
  isCurrentSection: boolean;
  section: SectionType;
  onPress: (section: SectionType) => void;
  theme: any;
}

function Section({
  searchTerm,
  isCurrentSection,
  section,
  onPress,
  theme,
}: Props) {
  const { isLightMode } = useTheme();
  const regex = new RegExp(`(${searchTerm})`, "gi");
  const parts = section?.label.split(regex);

  // Always use light text in dark mode for better readability in table of contents
  const textColor = isLightMode
    ? isCurrentSection
      ? theme.primary
      : theme.text
    : "#FFFFFF";

  return (
    <TouchableOpacity
      key={section.id}
      style={[
        styles.container,
        isCurrentSection && { backgroundColor: theme.primary + "20" },
      ]}
      onPress={() => onPress(section)}
      activeOpacity={0.6}
    >
      <View style={styles.contentContainer}>
        <View style={styles.icon}>
          <Ionicons
            name={isCurrentSection ? "bookmark" : "bookmark-outline"}
            size={18}
            color={
              isCurrentSection
                ? theme.primary
                : isLightMode
                ? theme.textSecondary
                : "#DDDDDD"
            }
          />
        </View>

        <View style={styles.textContainer}>
          {!searchTerm && (
            <Text style={[styles.title, { color: textColor }]}>
              {section?.label}
            </Text>
          )}

          {searchTerm && (
            <Text style={[styles.title, { color: textColor }]}>
              {parts.filter(String).map((part, index) => {
                return regex.test(part) ? (
                  <Text
                    style={[styles.highlight, { color: theme.text }]}
                    key={`${index}-part-highlight`}
                  >
                    {part}
                  </Text>
                ) : (
                  <Text key={`${index}-part`}>{part}</Text>
                );
              })}
            </Text>
          )}
        </View>
      </View>

      {isCurrentSection && (
        <View
          style={[styles.activeIndicator, { backgroundColor: theme.primary }]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    position: "relative",
  },
  contentContainer: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
  },
  icon: {
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    flexShrink: 1,
    lineHeight: 20,
  },
  highlight: {
    backgroundColor: "rgba(255, 230, 0, 0.4)",
    borderRadius: 2,
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default Section;
