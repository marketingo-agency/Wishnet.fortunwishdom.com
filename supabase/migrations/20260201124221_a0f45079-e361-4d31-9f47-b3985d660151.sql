-- Add is_pinned column to brain_documents table
ALTER TABLE public.brain_documents
ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;