
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

const API_URL =
  'https://6ad6de81f71f154ac4873c20.mockapi.io/courses';

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

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCourse() {
      try {
        setLoading(true);
        setError('');

        if (!id) {
          throw new Error('Không tìm thấy mã khóa học.');
        }

        const response = await fetch(
          `${API_URL}/${encodeURIComponent(id)}`
        );

        if (!response.ok) {
          throw new Error('Không tìm thấy khóa học.');
        }

        const data: Course = await response.json();

        if (active) {
          setCourse(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không tải được thông tin khóa học.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCourse();

    return () => {
      active = false;
    };
  }, [id]);

  const player = useVideoPlayer(
    course?.trailerUrl || null,
    (videoPlayer) => {
      videoPlayer.loop = false;
    }
  );

  const formatPrice = (price: number) =>
    `${Number(price || 0).toLocaleString('vi-VN')} đ`;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Thanh điều hướng */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.brand}>
          LEARN<Text style={styles.brandAccent}>+</Text>
        </Text>

        <View style={styles.navBadge}>
          <Text style={styles.navBadgeText}>KHÓA HỌC</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            Đang tải thông tin khóa học...
          </Text>
        </View>
      ) : error || !course ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>
            Không tải được khóa học
          </Text>
          <Text style={styles.errorText}>
            {error || 'Không tìm thấy khóa học.'}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              Quay lại danh sách
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Phần giới thiệu */}
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                LỘ TRÌNH HỌC TẬP
              </Text>
            </View>

            <Text style={styles.eyebrow}>
              HỌC TẬP · PHÁT TRIỂN · BỨT PHÁ
            </Text>

            <Text style={styles.title}>{course.title}</Text>

            <Text style={styles.description}>
              {course.description || 'Chưa có mô tả cho khóa học này.'}
            </Text>

            <View style={styles.heroDivider} />

            <View style={styles.heroMetaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👨‍🏫</Text>
                <View style={styles.metaTextContainer}>
                  <Text style={styles.metaLabel}>Giảng viên</Text>
                  <Text style={styles.metaValue}>
                    {course.instructor || 'Đang cập nhật'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱️</Text>
                <View style={styles.metaTextContainer}>
                  <Text style={styles.metaLabel}>Thời lượng</Text>
                  <Text style={styles.metaValue}>
                    {course.duration || 0} phút
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Thông tin khóa học */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.headingBar} />
              <View>
                <Text style={styles.sectionTitle}>
                  Thông tin khóa học
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Những thông tin cần biết trước khi học
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Text style={styles.infoIcon}>👨‍🏫</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Giảng viên</Text>
                  <Text style={styles.infoValue}>
                    {course.instructor || 'Chưa cập nhật'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Text style={styles.infoIcon}>⏰</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Thời lượng học</Text>
                  <Text style={styles.infoValue}>
                    {course.duration || 0} phút
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Text style={styles.infoIcon}>📚</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Mã danh mục</Text>
                  <Text style={styles.infoValue}>
                    {course.categoryId || 'Chưa phân loại'}
                  </Text>
                </View>
              </View>

              <View style={styles.priceCard}>
                <View style={styles.priceInfo}>
                  <Text style={styles.priceLabel}>
                    HỌC PHÍ KHÓA HỌC
                  </Text>
                  <Text style={styles.price}>
                    {formatPrice(course.price)}
                  </Text>
                  <Text style={styles.priceNote}>
                    Chi phí cho khóa học này
                  </Text>
                </View>

                <View style={styles.priceIconBox}>
                  <Text style={styles.priceIcon}>🎓</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Video giới thiệu */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.headingBar} />
              <View>
                <Text style={styles.sectionTitle}>
                  Video giới thiệu
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Khám phá nội dung khóa học
                </Text>
              </View>
            </View>

            {course.trailerUrl ? (
              <View style={styles.videoCard}>
                <VideoView
                  player={player}
                  style={styles.video}
                  nativeControls
                  contentFit="contain"
                />
                <View style={styles.videoFooter}>
                  <View style={styles.videoStatusDot} />
                  <Text style={styles.videoFooterText}>
                    Video giới thiệu khóa học
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noVideoBox}>
                <View style={styles.noVideoIconBox}>
                  <Text style={styles.noVideoIcon}>▶</Text>
                </View>
                <Text style={styles.noVideoTitle}>
                  Chưa có video giới thiệu
                </Text>
                <Text style={styles.noVideoText}>
                  Video của khóa học sẽ được cập nhật sau.
                </Text>
              </View>
            )}
          </View>

          {/* Chân trang */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>
              LEARN<Text style={styles.brandAccent}>+</Text>
            </Text>
            <Text style={styles.footerText}>
              Bắt đầu hành trình học tập của bạn.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },

  navbar: {
    minHeight: 76,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    color: '#2563EB',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
  },

  brand: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#172554',
  },

  brandAccent: {
    color: '#3B82F6',
  },

  navBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  navBadgeText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  container: {
    flex: 1,
  },

  content: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 48,
  },

  hero: {
    backgroundColor: '#1D4ED8',
    borderRadius: 26,
    padding: 30,
    marginBottom: 34,
    overflow: 'hidden',
  },

  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginBottom: 24,
  },

  heroBadgeText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  eyebrow: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 14,
  },

  title: {
    fontSize: 34,
    lineHeight: 43,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },

  description: {
    fontSize: 16,
    lineHeight: 27,
    color: '#DBEAFE',
  },

  heroDivider: {
    height: 1,
    backgroundColor: '#60A5FA',
    marginVertical: 24,
  },

  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 180,
  },

  metaIcon: {
    fontSize: 25,
  },

  metaTextContainer: {
    flexShrink: 1,
  },

  metaLabel: {
    fontSize: 12,
    color: '#BFDBFE',
    marginBottom: 5,
  },

  metaValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  section: {
    marginBottom: 34,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 13,
  },

  headingBar: {
    width: 5,
    height: 44,
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#172554',
    marginBottom: 5,
  },

  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E7ECF4',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 15,
  },

  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoIcon: {
    fontSize: 22,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 5,
  },

  infoValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
  },

  infoDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginVertical: 4,
  },

  priceCard: {
    marginTop: 22,
    padding: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  priceInfo: {
    flex: 1,
  },

  priceLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  price: {
    color: '#2563EB',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },

  priceNote: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },

  priceIconBox: {
    width: 62,
    height: 62,
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  priceIcon: {
    fontSize: 32,
  },

  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E7ECF4',
    overflow: 'hidden',
  },

  video: {
    width: '100%',
    height: 420,
    backgroundColor: '#0F172A',
    borderRadius: 15,
  },

  videoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 15,
    gap: 9,
  },

  videoStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },

  videoFooterText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },

  noVideoBox: {
    minHeight: 220,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7ECF4',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  noVideoIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  noVideoIcon: {
    color: '#2563EB',
    fontSize: 28,
  },

  noVideoTitle: {
    color: '#172554',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },

  noVideoText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingText: {
    color: '#64748B',
    fontSize: 15,
    marginTop: 12,
  },

  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 60,
    overflow: 'hidden',
    marginBottom: 20,
  },

  errorTitle: {
    color: '#172554',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },

  errorText: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 22,
  },

  primaryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  footerBrand: {
    fontSize: 22,
    fontWeight: '900',
    color: '#172554',
    marginBottom: 8,
  },

  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
