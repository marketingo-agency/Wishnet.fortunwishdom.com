-- Delete empty Muse brain section since Osha already has its own
DELETE FROM brain_sections WHERE agent_id = 'muse' AND id = 'fc1208d8-8fb1-4b4d-9ffc-4f46511f83ae';