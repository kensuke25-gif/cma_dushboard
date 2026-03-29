import PomodoroTimer from '../components/dashboard/PomodoroTimer'

export default function PomodoroPage() {
  return (
    <div className="bg-[#1a1a2e] min-h-screen px-4 sm:px-6 py-4">
      <div className="max-w-sm mx-auto">
        <PomodoroTimer />
      </div>
    </div>
  )
}
