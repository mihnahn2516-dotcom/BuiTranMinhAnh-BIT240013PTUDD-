
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { getLocales } from 'expo-localization';

type Student = {
  id: string;
  name: string;
  code: string;
  email: string;
  avatar: string;
};

type ConfirmDialog = {
  type: 'edit' | 'delete';
  student: Student;
  next?: Student[];
};

type Screen = 'list' | 'detail' | 'form';

const STORAGE_KEY = '@MBAPP_students_v1';
const isVi = getLocales()[0]?.languageCode === 'vi';

const t = {
  app: isVi ? 'Quản lý sinh viên' : 'Student Manager',
  list: isVi ? 'Danh sách sinh viên' : 'Student List',
  detail: isVi ? 'Chi tiết sinh viên' : 'Student Details',
  add: isVi ? 'Thêm sinh viên' : 'Add Student',
  edit: isVi ? 'Sửa thông tin' : 'Edit Student',
  delete: isVi ? 'Xóa sinh viên' : 'Delete Student',
  name: isVi ? 'Họ tên sinh viên' : 'Full name',
  code: isVi ? 'Mã số sinh viên' : 'Student ID',
  email: 'Email',
  url: isVi ? 'Link ảnh (nếu có)' : 'Image URL (optional)',
  pick: isVi ? 'Chọn ảnh từ thiết bị' : 'Choose photo',
  save: isVi ? 'Lưu thông tin' : 'Save',
  cancel: isVi ? 'Hủy' : 'Cancel',
  back: isVi ? 'Quay lại' : 'Back',
  empty: isVi ? 'Chưa có sinh viên nào.' : 'No students yet.',
  loading: isVi ? 'Đang tải dữ liệu...' : 'Loading...',
  confirm: isVi ? 'Xác nhận' : 'Confirmation',
  yes: isVi ? 'Có' : 'Yes',
  no: isVi ? 'Không' : 'No',
  confirmEdit: isVi
    ? 'Bạn có muốn sửa thông tin SV không?'
    : 'Do you want to edit this student?',
  confirmDelete: isVi
    ? 'Bạn có muốn xóa thông tin SV không?'
    : 'Do you want to delete this student?',
  required: isVi
    ? 'Vui lòng nhập họ tên, mã SV và email.'
    : 'Please enter name, student ID and email.',
  invalidEmail: isVi ? 'Email không hợp lệ.' : 'Invalid email.',
  duplicate: isVi
    ? 'Mã sinh viên đã tồn tại.'
    : 'Student ID already exists.',
  error: isVi ? 'Lỗi' : 'Error',
  saveError: isVi ? 'Không thể lưu dữ liệu.' : 'Could not save data.',
  saved: isVi ? 'Đã lưu thành công.' : 'Saved successfully.',
  deleted: isVi ? 'Đã xóa sinh viên.' : 'Student deleted.',
  namePlaceholder: isVi ? 'Nguyễn Văn A' : 'John Smith',
  avatarHint: isVi
    ? 'Chọn ảnh hoặc nhập link ảnh bên dưới.'
    : 'Choose a photo or enter an image URL below.',
  permission: isVi
    ? 'Vui lòng cấp quyền truy cập thư viện ảnh.'
    : 'Please allow photo library access.',
  imageError: isVi ? 'Không thể chọn ảnh.' : 'Could not select photo.',
};

export default function Index() {
  const [students, setStudents] = useState<Student[]>([]);
  const [screen, setScreen] = useState<Screen>('list');
  const [selected, setSelected] = useState<Student | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] =
    useState<ConfirmDialog | null>(null);

  useEffect(() => {
    void loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setStudents(JSON.parse(raw) as Student[]);
      }
    } catch {
      Alert.alert(t.error, t.saveError);
    } finally {
      setLoading(false);
    }
  }

  async function persist(next: Student[]) {
    // Lưu dữ liệu trước, chỉ cập nhật state khi lưu thành công.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStudents(next);
  }

  function resetForm() {
    setName('');
    setCode('');
    setEmail('');
    setAvatar('');
  }

  function openAdd() {
    setSelected(null);
    resetForm();
    setScreen('form');
  }

  function openEdit(student: Student) {
    setSelected(student);
    setName(student.name);
    setCode(student.code);
    setEmail(student.email);
    setAvatar(student.avatar);
    setScreen('form');
  }

  async function chooseImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(t.error, t.permission);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];

        if (photo.base64) {
          setAvatar(
            `data:${photo.mimeType || 'image/jpeg'};base64,${photo.base64}`
          );
        } else {
          setAvatar(photo.uri);
        }
      }
    } catch {
      Alert.alert(t.error, t.imageError);
    }
  }

  async function saveStudent() {
    if (saving) return;

    const cleanName = name.trim();
    const cleanCode = code.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanCode || !cleanEmail) {
      Alert.alert(t.error, t.required);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert(t.error, t.invalidEmail);
      return;
    }

    const duplicated = students.some(
      student =>
        student.code.toLowerCase() === cleanCode.toLowerCase() &&
        student.id !== selected?.id
    );

    if (duplicated) {
      Alert.alert(t.error, t.duplicate);
      return;
    }

    const student: Student = {
      id: selected?.id ?? `${Date.now()}-${Math.random()}`,
      name: cleanName,
      code: cleanCode,
      email: cleanEmail,
      avatar: avatar.trim(),
    };

    const next = selected
      ? students.map(item =>
          item.id === selected.id ? student : item
        )
      : [...students, student];

    if (selected) {
      // Khi sửa, yêu cầu xác nhận trước khi lưu.
      setConfirmDialog({
        type: 'edit',
        student,
        next,
      });
    } else {
      // Khi thêm mới, lưu xong sẽ tự quay về danh sách.
      await commitSave(next);
    }
  }

  async function commitSave(next: Student[]) {
    if (saving) return;

    setSaving(true);

    try {
      await persist(next);

      // Đóng hộp thoại và xóa form.
      setConfirmDialog(null);
      setSelected(null);
      resetForm();

      // FIX: chuyển về màn hình chính sau khi lưu thành công.
      setScreen('list');
    } catch {
      Alert.alert(t.error, t.saveError);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(student: Student) {
    setConfirmDialog({
      type: 'delete',
      student,
    });
  }

  async function handleConfirm() {
    if (!confirmDialog || saving) return;

    const action = confirmDialog;
    setSaving(true);

    try {
      if (action.type === 'edit' && action.next) {
        await persist(action.next);

        setSelected(null);
        resetForm();
        setConfirmDialog(null);

        // Sửa thành công cũng quay về danh sách.
        setScreen('list');
      } else if (action.type === 'delete') {
        const next = students.filter(
          item => item.id !== action.student.id
        );

        await persist(next);

        setSelected(null);
        resetForm();
        setConfirmDialog(null);
        setScreen('list');

        Alert.alert(t.app, t.deleted);
      }
    } catch {
      Alert.alert(t.error, t.saveError);
    } finally {
      setSaving(false);
    }
  }

  function Button({
    title,
    onPress,
    danger = false,
    secondary = false,
    disabled = false,
  }: {
    title: string;
    onPress: () => void;
    danger?: boolean;
    secondary?: boolean;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.button,
          danger && styles.dangerButton,
          secondary && styles.secondaryButton,
          disabled && styles.disabledButton,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            secondary && styles.secondaryButtonText,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    );
  }

  function Avatar({
    uri,
    large = false,
  }: {
    uri: string;
    large?: boolean;
  }) {
    const size = large ? 112 : 58;

    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#E2E8F0',
          }}
        />
      );
    }

    return (
      <View
        style={[
          styles.placeholderAvatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={{ fontSize: large ? 40 : 24 }}>👤</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎓 {t.app}</Text>
        <Text style={styles.headerSubtitle}>
          {screen === 'list'
            ? t.list
            : screen === 'detail'
              ? t.detail
              : selected
                ? t.edit
                : t.add}
        </Text>
      </View>

      {/* SCREEN 1: STUDENT LIST */}
      {screen === 'list' && (
        <View style={styles.listScreen}>
          {loading ? (
            <Text style={styles.empty}>{t.loading}</Text>
          ) : (
            <FlatList
              style={styles.studentList}
              data={students}
              keyExtractor={student => student.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.empty}>{t.empty}</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={styles.studentCard}
                  onPress={() => {
                    setSelected(item);
                    setScreen('detail');
                  }}
                >
                  <Avatar uri={item.avatar} />

                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.muted}>{item.code}</Text>
                    <Text style={styles.muted}>{item.email}</Text>
                  </View>

                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              )}
            />
          )}

          <View style={styles.bottomButton}>
            <Button
              title={`＋ ${t.add}`}
              onPress={openAdd}
              disabled={loading}
            />
          </View>
        </View>
      )}

      {/* SCREEN 2: STUDENT DETAILS */}
      {screen === 'detail' && selected && (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.detailCard}>
            <Avatar uri={selected.avatar} large />

            <Text style={styles.detailName}>{selected.name}</Text>

            <View style={styles.detailRow}>
              <Text style={styles.label}>{t.code}</Text>
              <Text style={styles.detailValue}>{selected.code}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>{t.email}</Text>
              <Text style={styles.detailValue}>{selected.email}</Text>
            </View>
          </View>

          <Button
            title={`✎ ${t.edit}`}
            onPress={() => openEdit(selected)}
          />

          <Button
            title={`⌫ ${t.delete}`}
            danger
            onPress={() => confirmDelete(selected)}
          />

          <Button
            title={t.back}
            secondary
            onPress={() => setScreen('list')}
          />
        </ScrollView>
      )}

      {/* SCREEN 3: ADD / EDIT STUDENT */}
      {screen === 'form' && (
        <KeyboardAvoidingView
          style={styles.formScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.avatarBox}>
              <Avatar uri={avatar} large />

              <Button
                title={t.pick}
                secondary
                onPress={() => void chooseImage()}
              />

              <Text style={styles.muted}>{t.avatarHint}</Text>
            </View>

            <Text style={styles.label}>{t.name}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t.namePlaceholder}
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>{t.code}</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="SV001"
              autoCapitalize="none"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>{t.email}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="student@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>{t.url}</Text>
            <TextInput
              style={styles.input}
              value={avatar.startsWith('data:') ? '' : avatar}
              onChangeText={setAvatar}
              placeholder="https://example.com/avatar.jpg"
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor="#94A3B8"
            />

            <Button
              title={t.save}
              onPress={() => void saveStudent()}
              disabled={saving}
            />

            <Button
              title={t.cancel}
              secondary
              onPress={() => {
                if (selected) {
                  resetForm();
                  setScreen('detail');
                } else {
                  resetForm();
                  setScreen('list');
                }
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* CONFIRMATION DIALOG */}
      <Modal
        visible={confirmDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) setConfirmDialog(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.confirm}</Text>

            <Text style={styles.modalMessage}>
              {confirmDialog?.type === 'edit'
                ? t.confirmEdit
                : t.confirmDelete}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.secondaryButton,
                ]}
                disabled={saving}
                onPress={() => setConfirmDialog(null)}
              >
                <Text style={styles.secondaryButtonText}>{t.no}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  confirmDialog?.type === 'delete' &&
                    styles.dangerButton,
                  saving && styles.disabledButton,
                ]}
                disabled={saving}
                onPress={() => void handleConfirm()}
              >
                <Text style={styles.buttonText}>
                  {saving ? '...' : t.yes}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F1F5FB',
  },
  header: {
    backgroundColor: '#2457C5',
    paddingHorizontal: 25,
    paddingTop: 22,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    color: '#DCE8FF',
    fontSize: 16,
    marginTop: 10,
  },
  container: {
    padding: 20,
    paddingBottom: 30,
  },
  listScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 12,
  },
  studentList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
    flexGrow: 1,
  },
  bottomButton: {
    paddingTop: 12,
  },
  button: {
    backgroundColor: '#2457C5',
    paddingVertical: 17,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#E4ECFC',
  },
  secondaryButtonText: {
    color: '#2457C5',
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: '#DC3545',
  },
  disabledButton: {
    opacity: 0.55,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderAvatar: {
    backgroundColor: '#DFE9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 13,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 4,
  },
  muted: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
  },
  arrow: {
    fontSize: 28,
    color: '#2457C5',
    marginLeft: 8,
  },
  empty: {
    textAlign: 'center',
    marginTop: 35,
    color: '#64748B',
    fontSize: 15,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172033',
    marginTop: 15,
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
    paddingBottom: 8,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 7,
  },
  detailValue: {
    fontSize: 16,
    color: '#172033',
    marginTop: 5,
  },
  avatarBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3EF',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 15,
    color: '#172033',
    marginBottom: 16,
  },
  formScreen: {
    flex: 1,
  },
  formContent: {
    paddingBottom: 35,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#2457C5',
  },
});
