import { useState, useRef, useEffect } from 'react'
import { Brain, UploadCloud } from 'lucide-react'
import QuizSetup, { type QuizConfig } from '../components/quiz/QuizSetup'
import QuizQuestion from '../components/quiz/QuizQuestion'
import QuizResult from '../components/quiz/QuizResult'
import QuizUpload from '../components/quiz/QuizUpload'
import QuizHistory from '../components/quiz/QuizHistory'
import { useQuizStore, type QuizQuestion as Question } from '../stores/quizStore'
import { useAuthStore } from '../stores/authStore'

type AnswerRecord = {
  question: Question
  selectedOriginalIndex: number
  isCorrect: boolean
}

type Phase = 'setup' | 'answering' | 'result'
type Tab = 'quiz' | 'manage'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined

export default function Quiz() {
  const user = useAuthStore(s => s.user)
  const isAdmin = !!ADMIN_EMAIL && user?.email === ADMIN_EMAIL

  const [tab, setTab] = useState<Tab>('quiz')
  const [phase, setPhase] = useState<Phase>('setup')
  const [config, setConfig] = useState<QuizConfig | null>(null)
  const [questionList, setQuestionList] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [answered, setAnswered] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)

  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedMsRef = useRef(0)
  const hiddenAtRef = useRef<number | null>(null)

  const { questions, weakQuestionIds } = useQuizStore()

  function startTimer() {
    pausedMsRef.current = 0
    hiddenAtRef.current = null
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const totalPaused = pausedMsRef.current +
          (hiddenAtRef.current !== null ? Date.now() - hiddenAtRef.current : 0)
        setDurationSeconds(Math.max(0, Math.floor((Date.now() - startTimeRef.current - totalPaused) / 1000)))
      }
    }, 1000)
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (startTimeRef.current !== null) {
      const totalPaused = pausedMsRef.current +
        (hiddenAtRef.current !== null ? Date.now() - hiddenAtRef.current : 0)
      setDurationSeconds(Math.max(0, Math.floor((Date.now() - startTimeRef.current - totalPaused) / 1000)))
      startTimeRef.current = null
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // 画面非表示中は学習時間を一時停止（ポモドーロは継続）
  useEffect(() => {
    if (phase !== 'answering') return
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      } else if (hiddenAtRef.current !== null) {
        pausedMsRef.current += Date.now() - hiddenAtRef.current
        hiddenAtRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [phase])

  function handleStart(cfg: QuizConfig) {
    setConfig(cfg)
    const pool = cfg.weakMode
      ? questions.filter(q => weakQuestionIds.has(q.id))
      : questions
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setQuestionList(shuffled.slice(0, cfg.count))
    setCurrentIndex(0)
    setAnswers([])
    setAnswered(false)
    setDurationSeconds(0)
    setPhase('answering')
    startTimer()
  }

  function handleAnswer(selectedOriginalIndex: number, isCorrect: boolean) {
    setAnswered(true)
    setAnswers(prev => [...prev, {
      question: questionList[currentIndex],
      selectedOriginalIndex,
      isCorrect,
    }])
  }

  function handleNext() {
    const nextIndex = currentIndex + 1
    if (nextIndex >= questionList.length) {
      stopTimer()
      setPhase('result')
    } else {
      setCurrentIndex(nextIndex)
      setAnswered(false)
    }
  }

  function handleAbandon() {
    stopTimer()
    setPhase('result')
  }

  function handleRetry() {
    if (!config) return
    const pool = config.weakMode
      ? questions.filter(q => weakQuestionIds.has(q.id))
      : questions
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setQuestionList(shuffled.slice(0, config.count))
    setCurrentIndex(0)
    setAnswers([])
    setAnswered(false)
    setDurationSeconds(0)
    setPhase('answering')
    startTimer()
  }

  function handleRestart() {
    setPhase('setup')
    setConfig(null)
    setQuestionList([])
    setCurrentIndex(0)
    setAnswers([])
    setAnswered(false)
    setDurationSeconds(0)
  }

  // クイズ中はタブを非表示
  const showTabs = isAdmin && phase === 'setup'

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#1a1a2e]">
      {/* 管理者タブ（setup フェーズのみ表示） */}
      {showTabs && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="flex gap-1 p-1 bg-[#111125] rounded-xl border border-[#2a2a4a]">
            <button
              onClick={() => setTab('quiz')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'quiz'
                  ? 'bg-[#7c4dff] text-white'
                  : 'text-[#8888aa] hover:text-[#c8c8e8]'
              }`}
            >
              <Brain className="w-4 h-4" />
              クイズを受ける
            </button>
            <button
              onClick={() => setTab('manage')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'manage'
                  ? 'bg-[#7c4dff] text-white'
                  : 'text-[#8888aa] hover:text-[#c8c8e8]'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              問題を管理
            </button>
          </div>
        </div>
      )}

      {/* クイズタブ */}
      {(tab === 'quiz' || !isAdmin) && (
        <>
          {phase === 'setup' && <QuizSetup onStart={handleStart} />}
          {phase === 'setup' && <QuizHistory />}

          {phase === 'answering' && questionList.length > 0 && (
            <div>
              <QuizQuestion
                key={currentIndex}
                question={questionList[currentIndex]}
                questionIndex={currentIndex}
                totalQuestions={questionList.length}
                onAnswer={handleAnswer}
              />
              {answered && (
                <div className="max-w-2xl mx-auto px-4 pb-4">
                  <button
                    onClick={handleNext}
                    className="w-full py-4 rounded-xl bg-[#7c4dff] text-white font-semibold text-base hover:bg-[#6a3de8] active:scale-95 transition-all"
                  >
                    {currentIndex + 1 >= questionList.length ? '結果を見る' : '次の問題'}
                  </button>
                </div>
              )}
              {answers.length > 0 && !answered && (
                <div className="max-w-2xl mx-auto px-4 pb-8">
                  <button
                    onClick={handleAbandon}
                    className="w-full py-3 rounded-xl border border-[#2a2a4a] text-[#8888aa] hover:border-red-500/50 hover:text-red-400 transition-all text-sm"
                  >
                    中断して結果を見る
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'result' && config && (
            <QuizResult
              subject={config.subject}
              field={config.field}
              weakMode={config.weakMode}
              answers={answers}
              durationSeconds={durationSeconds}
              onRestart={handleRestart}
              onRetry={handleRetry}
            />
          )}
        </>
      )}

      {/* 管理タブ（管理者のみ） */}
      {tab === 'manage' && isAdmin && phase === 'setup' && (
        <QuizUpload />
      )}
    </div>
  )
}
