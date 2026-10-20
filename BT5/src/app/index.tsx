import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "https://6ad6de81f71f154ac4873c20.mockapi.io/courses";

type Course = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  instructor: string;
  price: number;
  duration: number;
  thumbnail?: string;
  trailerUrl?: string;
  createdAt?: string;
};

export default function HomeScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchCourses = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Lỗi HTTP ${response.status}`);
      }

      const data: Course[] = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu API không đúng định dạng.");
      }

      setCourses(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách khóa học.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const formatPrice = (price: number) =>
    `${Number(price || 0).toLocaleString("vi-VN")} đ`;

  const renderCourse = ({ item }: { item: Course }) => (
    <View style={styles.card}>
      {item.thumbnail ? (
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>📚</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.courseTitle}>{item.title}</Text>

        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        <Text style={styles.instructor}>
          Giảng viên: {item.instructor || "Chưa cập nhật"}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.duration}>⏱ {item.duration || 0} phút</Text>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>

        <TouchableOpacity
          style={styles.detailButton}
          onPress={() =>
            router.push({
              pathname: "/detail",
              params: { id: item.id },
            })
          }
        >
          <Text style={styles.detailButtonText}>Xem chi tiết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>COURSE MANAGEMENT</Text>
        <Text style={styles.headerTitle}>Khóa học của tôi</Text>
        <Text style={styles.headerDescription}>
          Khám phá và quản lý các khóa học
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.statusText}>Đang tải khóa học...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Không tải được dữ liệu</Text>
          <Text style={styles.statusText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchCourses();
            }}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourse}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchCourses();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.statusText}>Chưa có khóa học nào.</Text>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Danh sách khóa học</Text>
              <Text style={styles.count}>{courses.length} khóa học</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 10,
  },
  headerDescription: {
    color: "#DBEAFE",
    fontSize: 14,
    marginTop: 6,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  count: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  thumbnail: {
    width: "100%",
    height: 170,
    backgroundColor: "#E2E8F0",
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 42,
  },
  cardContent: {
    padding: 16,
  },
  courseTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  instructor: {
    color: "#475569",
    fontSize: 13,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  duration: {
    color: "#64748B",
    fontSize: 13,
  },
  price: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "800",
  },
  detailButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginTop: 16,
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  statusText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 18,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
