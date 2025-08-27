# FileDrop - AI-Powered File Management

A modern file management application with AI-powered organization, built with React, Node.js, and Supabase authentication.

## Features

- 🔐 **User Authentication** - Secure login/signup with Supabase Auth
- 📁 **File Upload** - Drag & drop file upload with AI analysis
- 🤖 **AI Organization** - Automatic file naming, tagging, and categorization
- 📊 **File Management** - Download, rename, share, and delete files
- 🎨 **Modern UI** - Beautiful, responsive interface with Tailwind CSS
- 🔒 **User Isolation** - Each user can only access their own files

## Tech Stack

- **Frontend**: React, Tailwind CSS, React Dropzone, React Hot Toast
- **Backend**: Node.js, Express, Multer
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **AI**: Google Gemini AI

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Google AI API key

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project dashboard
3. Navigate to **SQL Editor** and run the following SQL:

```sql
-- Create the files table
CREATE TABLE public.files (
  id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  size bigint NULL,
  tags text[] NULL,
  categories text[] NULL,
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_name_key UNIQUE (name)
);

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
```

4. Create a storage bucket named `uploads` and make it public
5. Get your Supabase URL and anon key from **Settings > API**

### 2. Environment Configuration

#### Backend (.env)
Create a `.env` file in the `backend` directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
GOOGLE_API_KEY=your_google_ai_api_key
BUCKET_NAME=uploads
```

#### Frontend (.env)
Create a `.env` file in the `frontend` directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 4. Run the Application

#### Backend
```bash
cd backend
npm start
```

The backend will run on `http://localhost:3000`

#### Frontend
```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3001`

## API Endpoints

All endpoints require authentication via Bearer token.

- `POST /analyze-file` - Analyze file with AI
- `POST /upload` - Upload file with metadata
- `GET /files` - Get user's files
- `DELETE /files/:filename` - Delete file
- `PUT /files/:filename` - Rename file

## Authentication Flow

1. Users sign up/sign in through the Auth component
2. Supabase handles authentication and provides JWT tokens
3. Frontend includes the token in API requests via Authorization header
4. Backend validates tokens using Supabase Auth
5. Users can only access their own files through RLS policies

## File Upload Process

1. User drags/drops a file
2. File is analyzed by Google Gemini AI
3. AI generates descriptive filename, tags, and categories
4. User can modify the AI suggestions
5. File is uploaded to Supabase Storage
6. Metadata is saved to the database with user association

## Security Features

- JWT-based authentication
- Row Level Security (RLS) in database
- User isolation - users can only access their own files
- File type validation
- File size limits (5MB)
- Secure file storage in Supabase

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 