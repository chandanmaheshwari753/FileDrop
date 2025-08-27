-- Update the files table to include user_id column for authentication
ALTER TABLE public.files 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add an index for better performance when querying by user_id
CREATE INDEX idx_files_user_id ON public.files(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own files
CREATE POLICY "Users can view own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own files
CREATE POLICY "Users can insert own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own files
CREATE POLICY "Users can update own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id); 