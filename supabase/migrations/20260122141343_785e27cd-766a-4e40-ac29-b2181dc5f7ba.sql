-- Create console_messages table for persistent chat history
CREATE TABLE public.console_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_image BOOLEAN DEFAULT false,
  image_url TEXT,
  provider TEXT,
  model TEXT,
  mode TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient user queries
CREATE INDEX idx_console_messages_user_id ON console_messages(user_id);
CREATE INDEX idx_console_messages_created_at ON console_messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE console_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access their own messages
CREATE POLICY "Users can view own messages" ON console_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON console_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON console_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Function to keep only last 50 messages per user
CREATE OR REPLACE FUNCTION trim_console_messages()
RETURNS trigger AS $$
BEGIN
  DELETE FROM console_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM console_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trim_console_messages_trigger
AFTER INSERT ON console_messages
FOR EACH ROW EXECUTE FUNCTION trim_console_messages();

-- Create quick_prompts table
CREATE TABLE public.quick_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('text', 'image', 'research')),
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default prompts
INSERT INTO quick_prompts (label, prompt, mode, icon, is_default, sort_order) VALUES
-- Text prompts
('Creative Writing', 'Write a short, engaging story about a robot discovering emotions for the first time.', 'text', 'Lightbulb', true, 1),
('Summarization', 'Summarize the key benefits of artificial intelligence in healthcare in 3 bullet points.', 'text', 'FileText', true, 2),
('Translation', 'Translate "Hello, how are you today?" into Spanish, French, and German.', 'text', 'Languages', true, 3),
('Code Generation', 'Write a TypeScript function that validates an email address using regex.', 'text', 'Code', true, 4),
-- Image prompts
('Portrait', 'A professional portrait of a futuristic AI assistant, soft lighting, minimal background', 'image', 'Sparkles', true, 5),
('Landscape', 'A serene mountain landscape at golden hour with a crystal clear lake reflection', 'image', 'Mountain', true, 6),
('Abstract Art', 'Abstract geometric patterns in emerald and gold, modern art style, high resolution', 'image', 'Palette', true, 7),
-- Research prompts
('Market Analysis', 'Research the current state of the AI industry in 2026, including key players, market trends, and growth projections.', 'research', 'TrendingUp', true, 8),
('Competitor Analysis', 'Conduct a deep analysis of the top 5 cloud computing providers, comparing their services, pricing, and market positioning.', 'research', 'Users', true, 9),
('Tech Review', 'Research the latest developments in quantum computing, including recent breakthroughs, practical applications, and timeline predictions.', 'research', 'Cpu', true, 10);

-- Enable RLS
ALTER TABLE quick_prompts ENABLE ROW LEVEL SECURITY;

-- Everyone can read quick prompts
CREATE POLICY "Anyone can view quick prompts" ON quick_prompts
  FOR SELECT USING (true);

-- Only admins can modify quick prompts
CREATE POLICY "Admins can insert quick prompts" ON quick_prompts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update quick prompts" ON quick_prompts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete quick prompts" ON quick_prompts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );