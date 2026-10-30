import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import questions from './data/questions.json';

const REVIEW_AFTER = 7;
const BLOCK_SIZE = 50;
// Giữ key V3 để nếu bạn đã học dở ở bản trước thì bản mới vẫn đọc lại tiến trình cũ.
const STORAGE_KEY = '@MLN122_QUIZ_PROGRESS_V1';
const DEFAULT_STATS = { correct: 0, wrong: 0, reviewed: 0, reviewWrong: 0 };

const THEMES = {
  light: {
    name: 'Sáng',
    statusBar: 'dark-content',
    page: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceSoft: '#F2F4F7',
    card: '#FFFFFF',
    text: '#101828',
    title: '#17233C',
    muted: '#667085',
    border: '#D0D5DD',
    borderSoft: '#E6EAF2',
    primary: '#465FFF',
    primaryDark: '#17233C',
    primarySoft: '#EEF2FF',
    primaryText: '#3443A8',
    successBg: '#ECFDF3',
    successBorder: '#ABEFC6',
    successText: '#067647',
    dangerBg: '#FEF3F2',
    dangerBorder: '#FECDCA',
    dangerText: '#B42318',
    warningBg: '#FFF8E6',
    warningBorder: '#FAD77B',
    warningText: '#7A4B00',
    overlay: 'rgba(16, 24, 40, 0.55)',
    shadow: '#101828',
    star: '#F79009',
  },
  dark: {
    name: 'Tối',
    statusBar: 'light-content',
    page: '#0B1220',
    surface: '#111827',
    surfaceSoft: '#1F2937',
    card: '#121A2B',
    text: '#F8FAFC',
    title: '#F8FAFC',
    muted: '#CBD5E1',
    border: '#334155',
    borderSoft: '#1E293B',
    primary: '#7C8CFF',
    primaryDark: '#25304A',
    primarySoft: '#1E2A5A',
    primaryText: '#DDE3FF',
    successBg: '#063D2E',
    successBorder: '#138A5B',
    successText: '#A7F3D0',
    dangerBg: '#431916',
    dangerBorder: '#A33A32',
    dangerText: '#FECACA',
    warningBg: '#3B2A0A',
    warningBorder: '#A66A00',
    warningText: '#FDE68A',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000000',
    star: '#FBBF24',
  },
};

function sameAnswerSet(a, b) {
  const aa = [...a].sort().join('');
  const bb = [...b].sort().join('');
  return aa === bb;
}

function renderNoteSegments(text, highlightStyle) {
  const parts = text.split(/(Đáp án đúng: [A-F]+)/g);
  return parts.map((part, idx) =>
    part.startsWith('Đáp án đúng: ')
      ? <Text key={idx} style={highlightStyle}>{part}</Text>
      : part
  );
}

function getAnswerText(question) {
  const answerKeys = question.answer || [];
  const optionMap = new Map(question.options.map((op) => [op.key, op.text]));
  return answerKeys.map((key) => `${key}. ${optionMap.get(key) || ''}`).join('; ');
}

function getBlockInfo(index) {
  const start = Math.floor(index / BLOCK_SIZE) * BLOCK_SIZE;
  const end = Math.min(start + BLOCK_SIZE - 1, questions.length - 1);
  return { start, end };
}

function normalizeIndexArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((x) => Number.isInteger(x) && x >= 0 && x < questions.length))].sort((a, b) => a - b);
}

function normalizeReviewQueue(value) {
  if (!Array.isArray(value)) return [];
  const map = new Map();

  value.forEach((item) => {
    if (!item || !Number.isInteger(item.index) || item.index < 0 || item.index >= questions.length) return;
    const existed = map.get(item.index);
    const clean = {
      index: item.index,
      dueAt: Number.isInteger(item.dueAt) ? item.dueAt : item.index + REVIEW_AFTER,
      attempts: Number.isInteger(item.attempts) && item.attempts > 0 ? item.attempts : 1,
    };

    if (!existed || clean.dueAt < existed.dueAt) {
      map.set(item.index, clean);
    }
  });

  return [...map.values()].sort((a, b) => a.dueAt - b.dueAt || a.index - b.index);
}

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState('normal'); // normal | review | starred
  const [reviewIndex, setReviewIndex] = useState(null);
  const [reviewSession, setReviewSession] = useState([]);
  const [reviewPosition, setReviewPosition] = useState(0);
  const [pendingIndex, setPendingIndex] = useState(null); // câu sẽ học tiếp sau khi ôn xong batch câu sai
  const [reviewQueue, setReviewQueue] = useState([]); // { index, dueAt, attempts }
  const [starredQuestions, setStarredQuestions] = useState([]);
  const [starredSession, setStarredSession] = useState([]);
  const [starredPosition, setStarredPosition] = useState(0);
  const [starModalVisible, setStarModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [colorMode, setColorMode] = useState('light');
  const [selected, setSelected] = useState([]);
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(null);
  const [blockModal, setBlockModal] = useState(null);
  const [stats, setStats] = useState(DEFAULT_STATS);

  const theme = THEMES[colorMode] || THEMES.light;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const activeIndex = mode === 'review'
    ? reviewIndex
    : mode === 'starred'
      ? (starredSession[starredPosition] ?? currentIndex)
      : currentIndex;
  const question = questions[activeIndex];
  const answerKeys = question?.answer || [];
  const isMultiAnswer = answerKeys.length > 1;
  const blockInfo = getBlockInfo(currentIndex);
  const isStarred = starredQuestions.includes(activeIndex);
  const reviewAttempts = mode === 'review'
    ? reviewQueue.find((item) => item.index === reviewIndex)?.attempts || 1
    : 0;

  useEffect(() => {
    let mounted = true;

    async function loadProgress() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const saved = JSON.parse(raw);
        const safeCurrentIndex = Number.isInteger(saved.currentIndex)
          ? Math.max(0, Math.min(saved.currentIndex, questions.length - 1))
          : 0;

        if (!mounted) return;

        const validReviewIndex = Number.isInteger(saved.reviewIndex) && saved.reviewIndex >= 0 && saved.reviewIndex < questions.length
          ? saved.reviewIndex
          : null;
        const savedReviewSession = normalizeIndexArray(saved.reviewSession);
        const shouldRestoreReview = saved.mode === 'review' && (savedReviewSession.length > 0 || validReviewIndex !== null);

        const savedStarredSession = normalizeIndexArray(saved.starredSession);
        const shouldRestoreStarred = saved.mode === 'starred' && savedStarredSession.length > 0;

        setCurrentIndex(safeCurrentIndex);
        setReviewQueue(normalizeReviewQueue(saved.reviewQueue));
        setStarredQuestions(normalizeIndexArray(saved.starredQuestions));
        setColorMode(saved.colorMode === 'dark' ? 'dark' : 'light');
        setSelected(Array.isArray(saved.selected) ? saved.selected : []);
        setChecked(Boolean(saved.checked));
        setWasCorrect(typeof saved.wasCorrect === 'boolean' ? saved.wasCorrect : null);
        setBlockModal(saved.blockModal || null);
        setStats(saved.stats || DEFAULT_STATS);
        setPendingIndex(Number.isInteger(saved.pendingIndex) ? Math.max(0, Math.min(saved.pendingIndex, questions.length - 1)) : null);

        if (shouldRestoreReview) {
          const restoredSession = savedReviewSession.length > 0 ? savedReviewSession : [validReviewIndex];
          const restoredPosition = Number.isInteger(saved.reviewPosition)
            ? Math.max(0, Math.min(saved.reviewPosition, restoredSession.length - 1))
            : 0;
          setMode('review');
          setReviewSession(restoredSession);
          setReviewPosition(restoredPosition);
          setReviewIndex(restoredSession[restoredPosition]);
          setStarredSession([]);
          setStarredPosition(0);
        } else if (shouldRestoreStarred) {
          const restoredPosition = Number.isInteger(saved.starredPosition)
            ? Math.max(0, Math.min(saved.starredPosition, savedStarredSession.length - 1))
            : 0;
          setMode('starred');
          setStarredSession(savedStarredSession);
          setStarredPosition(restoredPosition);
          setReviewSession([]);
          setReviewPosition(0);
          setReviewIndex(null);
        } else {
          setMode('normal');
          setReviewSession([]);
          setReviewPosition(0);
          setReviewIndex(null);
          setStarredSession([]);
          setStarredPosition(0);
        }
      } catch (error) {
        console.log('Không đọc được tiến trình đã lưu:', error);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    loadProgress();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const progress = {
      currentIndex,
      mode,
      reviewIndex,
      reviewSession,
      reviewPosition,
      pendingIndex,
      reviewQueue,
      starredQuestions,
      starredSession,
      starredPosition,
      colorMode,
      selected,
      checked,
      wasCorrect,
      blockModal,
      stats,
      savedAt: new Date().toISOString(),
    };

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch((error) => {
      console.log('Không lưu được tiến trình:', error);
    });
  }, [
    isLoaded,
    currentIndex,
    mode,
    reviewIndex,
    reviewSession,
    reviewPosition,
    pendingIndex,
    reviewQueue,
    starredQuestions,
    starredSession,
    starredPosition,
    colorMode,
    selected,
    checked,
    wasCorrect,
    blockModal,
    stats,
  ]);

  const progressText = useMemo(() => {
    const blockStart = blockInfo.start + 1;
    const blockEnd = blockInfo.end + 1;
    if (mode === 'review') {
      return `Ôn lại câu sai ${reviewPosition + 1}/${reviewSession.length} • Câu gốc ${activeIndex + 1}`;
    }
    if (mode === 'starred') {
      return `Ôn câu đã sao ${starredPosition + 1}/${starredSession.length} • Câu gốc ${activeIndex + 1}`;
    }
    return `Câu ${currentIndex + 1}/${questions.length} • Chuỗi ${blockStart}-${blockEnd}`;
  }, [activeIndex, blockInfo.end, blockInfo.start, currentIndex, mode, reviewPosition, reviewSession.length, starredPosition, starredSession.length]);

  function resetAnswerState() {
    setSelected([]);
    setChecked(false);
    setWasCorrect(null);
  }

  function toggleOption(key) {
    if (checked) return;

    if (isMultiAnswer) {
      setSelected((prev) =>
        prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
      );
    } else {
      setSelected([key]);
    }
  }

  function scheduleWrongQuestion(questionIndex, baseIndex) {
    setReviewQueue((prev) => {
      const existed = prev.find((item) => item.index === questionIndex);
      if (existed) {
        return prev
          .map((item) =>
            item.index === questionIndex
              ? {
                  ...item,
                  dueAt: baseIndex + REVIEW_AFTER,
                  attempts: item.attempts + 1,
                }
              : item
          )
          .sort((a, b) => a.dueAt - b.dueAt || a.index - b.index);
      }

      return [
        ...prev,
        {
          index: questionIndex,
          dueAt: baseIndex + REVIEW_AFTER,
          attempts: 1,
        },
      ].sort((a, b) => a.dueAt - b.dueAt || a.index - b.index);
    });
  }

  function checkAnswer() {
    if (selected.length === 0) {
      Alert.alert('Chưa chọn đáp án', 'Bạn chọn ít nhất 1 đáp án rồi bấm kiểm tra nhé.');
      return;
    }

    const correct = sameAnswerSet(selected, answerKeys);
    setChecked(true);
    setWasCorrect(correct);

    if (mode === 'normal') {
      setStats((prev) => ({
        ...prev,
        correct: prev.correct + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
      }));
      if (!correct) scheduleWrongQuestion(currentIndex, currentIndex);
    } else if (mode === 'review') {
      if (correct) {
        setStats((prev) => ({ ...prev, reviewed: prev.reviewed + 1 }));
        setReviewQueue((prev) => prev.filter((item) => item.index !== reviewIndex));
      } else {
        // Nếu ôn lại mà vẫn sai, câu này KHÔNG bị xoá khỏi hàng chờ.
        // Nó sẽ quay lại ở batch ôn sai sau, cứ lặp đến khi user trả lời đúng.
        const baseIndex = pendingIndex ?? currentIndex;
        setStats((prev) => ({ ...prev, reviewWrong: prev.reviewWrong + 1 }));
        scheduleWrongQuestion(reviewIndex, baseIndex);
      }
    }
  }

  function goToPosition(nextIndex, options = {}) {
    resetAnswerState();

    if (nextIndex >= questions.length) {
      Alert.alert(
        'Hoàn thành',
        'Bạn đã học hết toàn bộ câu hỏi. App sẽ quay lại câu đầu tiên.',
        [{ text: 'OK', onPress: () => setCurrentIndex(0) }]
      );
      return;
    }

    const shouldAskBlock =
      !options.skipBlockPrompt &&
      nextIndex > 0 &&
      nextIndex % BLOCK_SIZE === 0 &&
      nextIndex < questions.length;

    if (shouldAskBlock) {
      setBlockModal({
        start: nextIndex - BLOCK_SIZE,
        end: nextIndex - 1,
        next: nextIndex,
      });
      return;
    }

    const hasDueItem = reviewQueue.some((item) => item.dueAt <= nextIndex);

    if (hasDueItem && mode !== 'review') {
      // Điểm sửa quan trọng: khi đến lúc ôn sai, app gom TOÀN BỘ câu đang nằm trong hàng chờ,
      // không chỉ lấy đúng 1 câu đầu tiên. Ví dụ sai câu 1-6 thì app sẽ ôn liền câu 1-6,
      // rồi mới quay lại câu mới.
      const session = normalizeIndexArray(reviewQueue.map((item) => item.index));
      if (session.length > 0) {
        setPendingIndex(nextIndex);
        setMode('review');
        setReviewSession(session);
        setReviewPosition(0);
        setReviewIndex(session[0]);
        return;
      }
    }

    setMode('normal');
    setReviewIndex(null);
    setReviewSession([]);
    setReviewPosition(0);
    setCurrentIndex(nextIndex);
  }

  function nextQuestion() {
    if (!checked) {
      Alert.alert('Bạn chưa kiểm tra', 'Bạn bấm “Kiểm tra” trước rồi hãy sang câu tiếp theo nhé.');
      return;
    }

    if (mode === 'review') {
      const nextReviewPosition = reviewPosition + 1;
      if (nextReviewPosition < reviewSession.length) {
        resetAnswerState();
        setReviewPosition(nextReviewPosition);
        setReviewIndex(reviewSession[nextReviewPosition]);
        return;
      }

      const nextIndex = pendingIndex ?? currentIndex;
      resetAnswerState();
      setMode('normal');
      setReviewIndex(null);
      setReviewSession([]);
      setReviewPosition(0);
      setPendingIndex(null);
      goToPosition(nextIndex, { skipBlockPrompt: true });
      return;
    }

    if (mode === 'starred') {
      const nextStarredPosition = starredPosition + 1;
      if (nextStarredPosition < starredSession.length) {
        resetAnswerState();
        setStarredPosition(nextStarredPosition);
        return;
      }

      resetAnswerState();
      setMode('normal');
      setStarredSession([]);
      setStarredPosition(0);
      Alert.alert('Đã ôn xong', 'Bạn đã ôn xong danh sách câu đã sao. App sẽ quay lại câu đang học dở.');
      return;
    }

    goToPosition(currentIndex + 1);
  }

  function restartCurrentBlock() {
    const start = blockModal.start;
    const end = blockModal.end;
    setReviewQueue((prev) => prev.filter((item) => item.index < start || item.index > end));
    setPendingIndex(null);
    setBlockModal(null);
    setMode('normal');
    setReviewIndex(null);
    setReviewSession([]);
    setReviewPosition(0);
    setStarredSession([]);
    setStarredPosition(0);
    setCurrentIndex(start);
    resetAnswerState();
  }

  function continueNextBlock() {
    const next = blockModal.next;
    setBlockModal(null);
    setMode('normal');
    setReviewIndex(null);
    setReviewSession([]);
    setReviewPosition(0);
    setStarredSession([]);
    setStarredPosition(0);
    setPendingIndex(null);
    goToPosition(next, { skipBlockPrompt: true });
  }

  function toggleTheme() {
    setColorMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function toggleStar(questionIndex = activeIndex) {
    if (!Number.isInteger(questionIndex)) return;
    setStarredQuestions((prev) => {
      if (prev.includes(questionIndex)) {
        return prev.filter((x) => x !== questionIndex);
      }
      return [...prev, questionIndex].sort((a, b) => a - b);
    });
  }

  function startStarredStudy(indices) {
    const session = normalizeIndexArray(indices);
    if (session.length === 0) {
      Alert.alert('Chưa có câu đã sao', 'Bạn bấm sao ở những câu muốn học lại sau nhé.');
      return;
    }

    setStarModalVisible(false);
    resetAnswerState();
    setMode('starred');
    setStarredSession(session);
    setStarredPosition(0);
    setReviewIndex(null);
    setReviewSession([]);
    setReviewPosition(0);
    setPendingIndex(null);
  }

  function resetAll() {
    // Trên Expo Web, Alert.alert đôi khi chỉ hiện hộp thoại OK và không chạy onPress của nút xác nhận.
    // Vì vậy dùng modal riêng để Reset hoạt động ổn định trên cả web, emulator và điện thoại.
    setResetModalVisible(true);
  }

  async function confirmResetAll() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.log('Không xoá được tiến trình đã lưu:', error);
    }

    setCurrentIndex(0);
    setMode('normal');
    setReviewIndex(null);
    setReviewSession([]);
    setReviewPosition(0);
    setPendingIndex(null);
    setReviewQueue([]);
    setStarredQuestions([]);
    setStarredSession([]);
    setStarredPosition(0);
    setStarModalVisible(false);
    setResetModalVisible(false);
    setBlockModal(null);
    setStats(DEFAULT_STATS);
    resetAnswerState();
  }

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={theme.statusBar} />
        <Text style={styles.emptyText}>Đang tải tiến trình học...</Text>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={theme.statusBar} />
        <Text style={styles.emptyText}>Không có dữ liệu câu hỏi.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} />

      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>MLN122 Quiz</Text>
          <Text style={styles.progress}>{progressText}</Text>
          <Text style={styles.savedText}>Tự động lưu tiến trình</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={toggleTheme}>
            <Text style={styles.headerButtonText}>{colorMode === 'dark' ? '☀️ Sáng' : '🌙 Tối'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => setStarModalVisible(true)}>
            <Text style={styles.headerButtonText}>★ Sao: {starredQuestions.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>Đúng: {stats.correct}</Text>
        <Text style={styles.statsText}>Sai: {stats.wrong}</Text>
        <Text style={styles.statsText}>Ôn đúng: {stats.reviewed}</Text>
        <Text style={styles.statsText}>Ôn sai: {stats.reviewWrong}</Text>
        <Text style={styles.statsText}>Chờ ôn: {reviewQueue.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {mode === 'review' && (
          <View style={styles.reviewBanner}>
            <Text style={styles.reviewBannerText}>
              Đang ôn lại toàn bộ câu sai trong hàng chờ. Nếu câu nào vẫn sai, app sẽ giữ lại và cho lặp tiếp ở batch ôn sau, đến khi bạn làm đúng mới xoá khỏi hàng chờ.
            </Text>
          </View>
        )}

        {mode === 'starred' && (
          <View style={styles.starBanner}>
            <Text style={styles.starBannerText}>
              Đang học danh sách câu đã sao. Danh sách này không làm mất tiến trình câu chính của bạn.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.questionTopRow}>
            <Text style={styles.questionNumber}>Câu {activeIndex + 1}</Text>
            <TouchableOpacity style={[styles.starButton, isStarred && styles.starButtonActive]} onPress={() => toggleStar(activeIndex)}>
              <Text style={[styles.starButtonText, isStarred && styles.starButtonTextActive]}>
                {isStarred ? '★ Đã sao' : '☆ Gắn sao'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.questionText}>{question.question}</Text>

          <View style={[styles.answerTypeBox, isMultiAnswer ? styles.answerTypeMulti : styles.answerTypeSingle]}>
            <Text style={styles.answerTypeText}>
              {isMultiAnswer
                ? `Loại câu: Chọn nhiều đáp án • Có ${answerKeys.length} đáp án đúng`
                : 'Loại câu: Chọn 1 đáp án'}
            </Text>
            <Text style={styles.answerTypeHint}>
              {isMultiAnswer
                ? 'Bạn cần tick đủ tất cả đáp án đúng rồi mới bấm Kiểm tra.'
                : 'Bạn chỉ chọn một đáp án rồi bấm Kiểm tra.'}
            </Text>
          </View>

          <View style={styles.optionsWrap}>
            {question.options.map((option) => {
              const isSelected = selected.includes(option.key);
              const isCorrectOption = answerKeys.includes(option.key);
              const showCorrect = checked && isCorrectOption;
              const showWrong = checked && isSelected && !isCorrectOption;
              const marker = isMultiAnswer
                ? (isSelected ? '☑' : '☐')
                : (isSelected ? '◉' : '○');

              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                    showCorrect && styles.optionCorrect,
                    showWrong && styles.optionWrong,
                  ]}
                  onPress={() => toggleOption(option.key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.optionInner}>
                    <Text
                      style={[
                        styles.optionMarker,
                        isSelected && styles.optionMarkerSelected,
                        showCorrect && styles.optionMarkerCorrect,
                        showWrong && styles.optionMarkerWrong,
                      ]}
                    >
                      {marker}
                    </Text>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        (showCorrect || showWrong) && styles.optionTextAfterCheck,
                      ]}
                    >
                      <Text style={styles.optionKey}>{option.key}. </Text>
                      {option.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {checked && (
            <View style={[styles.feedbackBox, wasCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
              <Text style={styles.feedbackTitle}>{wasCorrect ? 'Đúng rồi!' : 'Sai rồi!'}</Text>
              {!wasCorrect && (
                <>
                  <Text style={styles.feedbackText}>Đáp án đúng: {getAnswerText(question)}</Text>
                  {mode === 'normal' && (
                    <Text style={styles.repeatInfoText}>Câu này đã được đưa vào hàng chờ ôn lại.</Text>
                  )}
                  {mode === 'review' && (
                    <Text style={styles.repeatInfoText}>
                      Câu này vẫn được giữ trong hàng chờ. Khi bạn trả lời đúng ở lần ôn sau, app mới xoá khỏi danh sách ôn lại.
                    </Text>
                  )}
                  {mode === 'starred' && (
                    <Text style={styles.repeatInfoText}>Câu này vẫn nằm trong danh sách sao để bạn học lại sau.</Text>
                  )}
                </>
              )}
              {question.notes?.length > 0 && (
                <Text style={styles.noteText}>
                  Ghi chú: {renderNoteSegments(question.notes.join(' '), styles.noteAnswerHighlight)}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.checkButton, checked && styles.disabledButton]} onPress={checkAnswer} disabled={checked}>
          <Text style={styles.checkButtonText}>{checked ? 'Đã kiểm tra' : 'Kiểm tra'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
          <Text style={styles.nextButtonText}>
            {mode === 'review'
              ? reviewPosition + 1 < reviewSession.length
                ? 'Ôn câu sai tiếp theo'
                : 'Xong batch ôn, học tiếp'
              : mode === 'starred'
                ? starredPosition + 1 < starredSession.length
                  ? 'Câu đã sao tiếp theo'
                  : 'Xong danh sách sao'
                : 'Câu tiếp theo'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!blockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hoàn thành một chuỗi 50 câu</Text>
            <Text style={styles.modalText}>
              Bạn vừa học xong câu {blockModal?.start + 1} đến câu {blockModal?.end + 1}. Bạn muốn học lại chuỗi này từ đầu hay tiếp tục chuỗi tiếp theo?
            </Text>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={restartCurrentBlock}>
              <Text style={styles.modalPrimaryText}>Học lại từ câu {blockModal?.start + 1}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={continueNextBlock}>
              <Text style={styles.modalSecondaryText}>Tiếp tục từ câu {blockModal?.next + 1}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={resetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Làm lại từ đầu?</Text>
            <Text style={styles.modalText}>
              App sẽ xoá tiến trình hiện tại, danh sách câu sai đang chờ ôn và danh sách câu đã sao. Sau đó bạn sẽ quay lại câu 1.
            </Text>
            <TouchableOpacity style={styles.modalDangerButton} onPress={confirmResetAll}>
              <Text style={styles.modalDangerText}>Xác nhận Reset về câu 1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setResetModalVisible(false)}>
              <Text style={styles.modalSecondaryText}>Hủy, tiếp tục học</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={starModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.starModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Danh sách câu đã sao</Text>
                <Text style={styles.modalSubText}>{starredQuestions.length} câu đang được lưu để học lại sau.</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setStarModalVisible(false)}>
                <Text style={styles.closeButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>

            {starredQuestions.length > 0 ? (
              <>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => startStarredStudy(starredQuestions)}>
                  <Text style={styles.modalPrimaryText}>Ôn toàn bộ danh sách sao</Text>
                </TouchableOpacity>
                <ScrollView style={styles.starList} contentContainerStyle={styles.starListContent}>
                  {starredQuestions.map((index) => (
                    <View key={index} style={styles.starItem}>
                      <View style={styles.starItemTextWrap}>
                        <Text style={styles.starItemTitle}>Câu {index + 1}</Text>
                        <Text style={styles.starItemQuestion} numberOfLines={2}>{questions[index]?.question}</Text>
                      </View>
                      <View style={styles.starItemActions}>
                        <TouchableOpacity style={styles.smallPrimaryButton} onPress={() => startStarredStudy([index])}>
                          <Text style={styles.smallPrimaryText}>Học</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.smallSecondaryButton} onPress={() => toggleStar(index)}>
                          <Text style={styles.smallSecondaryText}>Bỏ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={styles.emptyStarBox}>
                <Text style={styles.emptyStarText}>Chưa có câu nào được gắn sao. Khi gặp câu khó, bấm “☆ Gắn sao” ở câu đó để lưu vào danh sách học lại.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(t) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.page,
    },
    header: {
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 12,
      backgroundColor: t.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: t.borderSoft,
      gap: 12,
    },
    headerTitleWrap: {
      flex: 1,
      minWidth: 220,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: t.title,
    },
    progress: {
      marginTop: 4,
      fontSize: 13,
      color: t.muted,
    },
    savedText: {
      marginTop: 3,
      fontSize: 12,
      color: t.successText,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'flex-end',
    },
    headerButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: t.primarySoft,
      borderWidth: 1,
      borderColor: t.borderSoft,
    },
    headerButtonText: {
      color: t.primaryText,
      fontWeight: '800',
    },
    resetButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: t.primarySoft,
      borderWidth: 1,
      borderColor: t.borderSoft,
    },
    resetButtonText: {
      color: t.primaryText,
      fontWeight: '800',
    },
    statsBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: t.surface,
    },
    statsText: {
      fontSize: 13,
      color: t.text,
      backgroundColor: t.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    content: {
      padding: 18,
      paddingBottom: 110,
    },
    reviewBanner: {
      backgroundColor: t.warningBg,
      borderColor: t.warningBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },
    reviewBannerText: {
      color: t.warningText,
      fontWeight: '800',
      lineHeight: 21,
    },
    starBanner: {
      backgroundColor: t.primarySoft,
      borderColor: t.borderSoft,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },
    starBannerText: {
      color: t.primaryText,
      fontWeight: '800',
      lineHeight: 21,
    },
    card: {
      backgroundColor: t.card,
      borderRadius: 22,
      padding: 18,
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 3,
      borderWidth: 1,
      borderColor: t.borderSoft,
    },
    questionTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 8,
    },
    questionNumber: {
      fontSize: 13,
      color: t.muted,
      fontWeight: '800',
    },
    starButton: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: t.surfaceSoft,
      borderWidth: 1,
      borderColor: t.border,
    },
    starButtonActive: {
      backgroundColor: t.warningBg,
      borderColor: t.warningBorder,
    },
    starButtonText: {
      color: t.muted,
      fontWeight: '900',
    },
    starButtonTextActive: {
      color: t.star,
    },
    questionText: {
      fontSize: 20,
      lineHeight: 29,
      color: t.text,
      fontWeight: '800',
    },
    answerTypeBox: {
      marginTop: 14,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      gap: 4,
    },
    answerTypeSingle: {
      backgroundColor: t.primarySoft,
      borderColor: t.borderSoft,
    },
    answerTypeMulti: {
      backgroundColor: t.warningBg,
      borderColor: t.warningBorder,
    },
    answerTypeText: {
      fontSize: 14,
      color: t.text,
      fontWeight: '900',
    },
    answerTypeHint: {
      fontSize: 13,
      lineHeight: 19,
      color: t.muted,
      fontWeight: '700',
    },
    optionsWrap: {
      marginTop: 18,
      gap: 12,
    },
    option: {
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.card,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    optionInner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    optionMarker: {
      width: 28,
      marginTop: 1,
      fontSize: 22,
      lineHeight: 25,
      color: t.muted,
      fontWeight: '900',
      textAlign: 'center',
    },
    optionMarkerSelected: {
      color: t.primary,
    },
    optionMarkerCorrect: {
      color: t.successText,
    },
    optionMarkerWrong: {
      color: t.dangerText,
    },
    optionSelected: {
      borderColor: t.primary,
      backgroundColor: t.primarySoft,
    },
    optionCorrect: {
      borderColor: t.successBorder,
      backgroundColor: t.successBg,
    },
    optionWrong: {
      borderColor: t.dangerBorder,
      backgroundColor: t.dangerBg,
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      lineHeight: 23,
      color: t.text,
    },
    optionTextSelected: {
      color: t.title,
      fontWeight: '700',
    },
    optionTextAfterCheck: {
      fontWeight: '800',
    },
    optionKey: {
      fontWeight: '900',
    },
    feedbackBox: {
      marginTop: 18,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
    },
    feedbackCorrect: {
      backgroundColor: t.successBg,
      borderColor: t.successBorder,
    },
    feedbackWrong: {
      backgroundColor: t.dangerBg,
      borderColor: t.dangerBorder,
    },
    feedbackTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: t.text,
      marginBottom: 6,
    },
    feedbackText: {
      fontSize: 15,
      lineHeight: 22,
      color: t.text,
      fontWeight: '700',
    },
    repeatInfoText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: t.warningText,
      fontWeight: '700',
    },
    noteText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: t.muted,
    },
    noteAnswerHighlight: {
      fontWeight: '700',
      color: t.successText,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 14,
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.borderSoft,
      flexDirection: 'row',
      gap: 12,
    },
    checkButton: {
      flex: 1,
      backgroundColor: t.primaryDark,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
    },
    disabledButton: {
      opacity: 0.72,
    },
    checkButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    nextButton: {
      flex: 1,
      backgroundColor: t.primary,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
    },
    nextButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: t.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
    },
    modalCard: {
      width: '100%',
      maxWidth: 720,
      backgroundColor: t.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: t.borderSoft,
    },
    starModalCard: {
      width: '100%',
      maxWidth: 900,
      maxHeight: '88%',
      backgroundColor: t.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: t.borderSoft,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: t.text,
      marginBottom: 8,
    },
    modalText: {
      fontSize: 16,
      lineHeight: 24,
      color: t.muted,
      marginBottom: 18,
    },
    modalSubText: {
      color: t.muted,
      fontWeight: '700',
    },
    modalPrimaryButton: {
      backgroundColor: t.primaryDark,
      paddingVertical: 15,
      borderRadius: 16,
      alignItems: 'center',
      marginBottom: 10,
    },
    modalPrimaryText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 16,
    },
    modalSecondaryButton: {
      backgroundColor: t.primarySoft,
      paddingVertical: 15,
      borderRadius: 16,
      alignItems: 'center',
    },
    modalSecondaryText: {
      color: t.primaryText,
      fontWeight: '900',
      fontSize: 16,
    },
    modalDangerButton: {
      backgroundColor: t.dangerText,
      paddingVertical: 15,
      borderRadius: 16,
      alignItems: 'center',
      marginBottom: 10,
    },
    modalDangerText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 16,
    },
    closeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: t.surfaceSoft,
      borderWidth: 1,
      borderColor: t.border,
    },
    closeButtonText: {
      color: t.text,
      fontWeight: '900',
    },
    starList: {
      marginTop: 6,
    },
    starListContent: {
      gap: 10,
      paddingBottom: 4,
    },
    starItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.borderSoft,
      backgroundColor: t.surface,
    },
    starItemTextWrap: {
      flex: 1,
    },
    starItemTitle: {
      color: t.star,
      fontWeight: '900',
      marginBottom: 4,
    },
    starItemQuestion: {
      color: t.text,
      fontWeight: '700',
      lineHeight: 20,
    },
    starItemActions: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    smallPrimaryButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: t.primary,
    },
    smallPrimaryText: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
    smallSecondaryButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: t.surfaceSoft,
      borderWidth: 1,
      borderColor: t.border,
    },
    smallSecondaryText: {
      color: t.text,
      fontWeight: '900',
    },
    emptyStarBox: {
      marginTop: 6,
      borderRadius: 16,
      padding: 18,
      backgroundColor: t.surfaceSoft,
      borderWidth: 1,
      borderColor: t.borderSoft,
    },
    emptyStarText: {
      color: t.muted,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '700',
    },
    emptyText: {
      marginTop: 100,
      textAlign: 'center',
      fontSize: 18,
      color: t.muted,
    },
  });
}
