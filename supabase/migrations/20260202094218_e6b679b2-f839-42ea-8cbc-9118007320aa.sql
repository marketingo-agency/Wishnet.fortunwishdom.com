-- Clean up orphaned file record from files table
-- This file was left behind when the brain document was deleted
DELETE FROM files 
WHERE id = 'e55ee91a-dc04-4087-9c29-33d0a6666400';