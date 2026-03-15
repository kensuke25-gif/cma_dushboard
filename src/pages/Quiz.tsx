import { useState, useRef, useEffect } from 'react'
import QuizSetup, { type QuizConfig } from '../components/quiz/QuizSetup'
import QuizQuestion from '../components/quiz/QuizQuestion'
import QuizResult from '../components/quiz/QuizResult'
import { useQuizStore, type QuizQuestion as Question } from '../stores/quizStore'

type AnswerRecord = {
  question: Question
  selectedOriginalIndex: number
  isCorrect: boolean
}

type Phase = 'setup' | 'answering' | 'result'

export default function Quiz() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [config, setConfig] = useState<QuizConfig | null>(null)
  const [questionList, setQuestionList] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [answered, setAnswered] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)

  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { questions, weakQuestionIds } = useQuizStore()

  function startTimer() {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 1000)
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (startTimeRef.current !== null) {
      setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
      startTimeRef.current = null
    }
  }

  // cleanup on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function handleStart(cfg: QuizConfig) {
    setConfig(cfg)

    let pool = cfg.weakMode
      ? questions.filter(q => weakQuestionIds.has(q.id))
      : questions

    // シャッフルして出題数分取得
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, cfg.count)

    setQuestionList(selected)
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

  function handleRestart() {
    setPhase('setup')
    setConfig(null)
    setQuestionList([])
    setCurrentIndex(0)
    setAnswers([])
    setAnswered(false)
    setDurationSeconds(0)
  }

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#1a1a2e]">
      {phase === 'setup' && (
        <QuizSetup onStart={handleStart} />
      )}

      {phase === 'answering' && questionList.length > 0 && (
        <div>
          <QuizQuestion
            question={questionList[currentIndex]}
            questionIndex={currentIndex}
            totalQuestions={questionList.length}
            onAnswer={handleAnswer}
          />
          {/* 次へ / 終了ボタン */}
          {answered && (
            <div className="max-w-2xl mx-auto px-4 pb-8">
              <button
                onClick={handleNext}
                className="w-full py-4 rounded-xl bg-[#7c4dff] text-white font-semibold text-base hover:bg-[#6a3de8] active:scale-95 transition-all"
              >
                {currentIndex + 1 >= questionList.length ? '結果を見る' : '次の問題'}
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
        />
      )}
    </div>
  )
}
