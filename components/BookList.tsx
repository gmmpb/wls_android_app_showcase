import React from "react";
import { FlatList, Animated, StyleSheet, RefreshControl } from "react-native";
import BookItem from "./BookItem";

export default function BookList({
  books,
  viewMode,
  scrollY,
  onRefresh,
  refreshing,
}: {
  books: any[];
  viewMode: string;
  scrollY: Animated.Value;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <Animated.View style={{ flex: 1 }}>
      <FlatList
        data={books}
        renderItem={({ item, index }) => <BookItem book={item} index={index} />}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5D5FEF" // Match with your theme primary color
            colors={["#5D5FEF"]}
          />
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 80, // Add extra padding at the bottom for better scrolling experience
  },
});
