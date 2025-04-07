/* eslint-disable react/no-unused-prop-types */

/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { forwardRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Toc,
  Section as SectionType,
  useReader,
} from "@epubjs-react-native/core";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Button, Text } from "react-native-paper";
import Section from "./Section";
import { useTheme as usePaperTheme } from "react-native-paper";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  onPressSection: (section: SectionType) => void;
  onClose: () => void;
}
export type Ref = BottomSheetModalMethods;

export const TableOfContents = forwardRef<Ref, Props>(
  ({ onPressSection, onClose }, ref) => {
    const { toc, section, theme: readerTheme } = useReader();
    const paperTheme = usePaperTheme();
    const { theme: appTheme } = useTheme();

    // Create a safe theme object to avoid undefined errors
    const safeTheme = {
      background:
        appTheme?.background || paperTheme.colors.background || "#FFFFFF",
      text: appTheme?.text || paperTheme.colors.onBackground || "#000000",
      primary: appTheme?.primary || paperTheme.colors.primary || "#6200ee",
      surface: appTheme?.surface || paperTheme.colors.surface || "#F6F6F6",
      border: "#E0E0E0",
      textSecondary: appTheme?.textSecondary || "#71717A",
    };

    const [searchTerm, setSearchTerm] = useState("");
    const [data, setData] = useState<Toc>(toc);

    const snapPoints = React.useMemo(() => ["50%", "90%"], []);

    const renderItem = React.useCallback(
      ({ item }: { item: SectionType }) => (
        <Section
          searchTerm={searchTerm}
          isCurrentSection={section?.id === item?.id}
          section={item}
          onPress={(_section) => {
            onPressSection(_section);
          }}
          theme={safeTheme}
        />
      ),
      [onPressSection, searchTerm, section?.id, safeTheme]
    );

    const header = React.useCallback(
      () => (
        <View
          style={[
            styles.headerContainer,
            { backgroundColor: safeTheme.background },
          ]}
        >
          <View style={styles.titleContainer}>
            <Text
              variant="titleLarge"
              style={{
                color: safeTheme.text,
                fontFamily: "Poppins-SemiBold",
                fontSize: 20,
              }}
            >
              Table of Contents
            </Text>

            <Button
              mode="text"
              textColor={safeTheme.primary}
              onPress={onClose}
              labelStyle={{ fontFamily: "Poppins-Medium" }}
            >
              Close
            </Button>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={safeTheme.textSecondary}
              style={styles.searchIcon}
            />
            <BottomSheetTextInput
              inputMode="search"
              returnKeyType="search"
              returnKeyLabel="Search"
              autoCorrect={false}
              autoCapitalize="none"
              defaultValue={searchTerm}
              style={[styles.input, { color: safeTheme.text }]}
              placeholder="Search chapters..."
              placeholderTextColor={safeTheme.textSecondary}
              onSubmitEditing={(event) => {
                event.persist();

                setSearchTerm(event.nativeEvent?.text);
                setData(
                  toc.filter((elem) =>
                    new RegExp(event.nativeEvent?.text, "gi").test(elem?.label)
                  )
                );
              }}
            />
          </View>

          {searchTerm ? (
            <View style={styles.resultsHeader}>
              <Text
                style={[styles.resultsText, { color: safeTheme.textSecondary }]}
              >
                {data.length} {data.length === 1 ? "result" : "results"} for "
                {searchTerm}"
              </Text>
            </View>
          ) : (
            <View style={styles.divider} />
          )}
        </View>
      ),
      [onClose, searchTerm, safeTheme, toc, data.length]
    );

    const emptyComponent = React.useCallback(
      () => (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="book-outline"
            size={40}
            color={safeTheme.textSecondary}
          />
          <Text style={[styles.emptyText, { color: safeTheme.text }]}>
            No chapters found
          </Text>
          <Text
            style={[styles.emptySubtext, { color: safeTheme.textSecondary }]}
          >
            Try a different search term
          </Text>
        </View>
      ),
      [safeTheme]
    );

    React.useEffect(() => {
      setData(toc);
    }, [toc]);

    return (
      <BottomSheetModalProvider>
        <BottomSheetModal
          ref={ref}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose
          style={{
            ...styles.container,
            backgroundColor: safeTheme.background,
          }}
          handleStyle={{
            backgroundColor: safeTheme.background,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
          backgroundStyle={{
            backgroundColor: safeTheme.background,
          }}
          handleIndicatorStyle={{
            backgroundColor: safeTheme.textSecondary,
            width: 40,
            height: 4,
          }}
          onDismiss={() => setSearchTerm("")}
        >
          <BottomSheetFlatList
            data={data}
            showsVerticalScrollIndicator={true}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={header}
            ListEmptyComponent={emptyComponent}
            style={[styles.list, { backgroundColor: safeTheme.background }]}
            contentContainerStyle={styles.listContent}
            maxToRenderPerBatch={20}
            initialNumToRender={15}
          />
        </BottomSheetModal>
      </BottomSheetModalProvider>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  titleContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(151, 151, 151, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    padding: 10,
    fontFamily: "Poppins-Regular",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 8,
  },
  resultsHeader: {
    marginVertical: 8,
    paddingVertical: 4,
  },
  resultsText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
  },
  list: {
    width: "100%",
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginTop: 4,
  },
});
