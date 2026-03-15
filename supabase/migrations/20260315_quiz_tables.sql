-- Quiz questions table (問題マスター)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  field text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all users read questions" ON quiz_questions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated can manage questions" ON quiz_questions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Quiz sessions table (学習時間記録)
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  field text,
  is_weak_mode boolean DEFAULT false,
  total_questions integer NOT NULL,
  correct_count integer NOT NULL,
  duration_seconds integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own sessions" ON quiz_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Quiz answers table (回答履歴)
CREATE TABLE IF NOT EXISTS quiz_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  selected_answer integer NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own answers" ON quiz_answers
  FOR ALL USING (
    session_id IN (SELECT id FROM quiz_sessions WHERE user_id = auth.uid())
  );

-- Quiz weak questions table (苦手フラグ)
CREATE TABLE IF NOT EXISTS quiz_weak_questions (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  PRIMARY KEY (user_id, question_key)
);
ALTER TABLE quiz_weak_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own weak questions" ON quiz_weak_questions
  FOR ALL USING (auth.uid() = user_id);
