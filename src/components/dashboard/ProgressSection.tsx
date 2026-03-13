const subjects = [
  { name: '証券分析', pct: 42, color: 'bg-blue-500' },
  { name: '財務諸表分析', pct: 28, color: 'bg-orange-400' },
  { name: 'コーポレートファイナンス', pct: 61, color: 'bg-green-500' },
  { name: '経済', pct: 15, color: 'bg-red-400' },
]

const stats = [
  { label: '累計学習', value: '34h' },
  { label: '連続日数', value: '8日' },
  { label: '正答率', value: '67%' },
  { label: '残り日数', value: '87日' },
]

export default function ProgressSection() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">科目別進捗</h2>
        <div className="space-y-3">
          {subjects.map(s => (
            <div key={s.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{s.name}</span>
                <span className="font-medium text-gray-700">{s.pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.color}`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}