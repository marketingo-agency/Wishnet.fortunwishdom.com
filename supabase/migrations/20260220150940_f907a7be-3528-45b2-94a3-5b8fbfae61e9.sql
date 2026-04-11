
-- Add angle_prompts jsonb column to wishpedia_settings with detailed defaults
ALTER TABLE public.wishpedia_settings
ADD COLUMN IF NOT EXISTS angle_prompts jsonb NOT NULL DEFAULT '{
  "front": "Generate a front-facing view of {name}. The character should face the camera directly, showing the full frontal design. Maintain exact visual consistency with the reference image(s) — same proportions, colors, details, and style.",
  "back": "Generate a rear/back view of {name}. Show the character from directly behind, revealing the back of the head, any rear details of the outfit, accessories, or features not visible from the front. Maintain exact visual consistency with the reference image(s).",
  "left": "Generate a left-side profile view of {name}. The character should face to the right of frame, showing the left side of their body/face. Maintain exact visual consistency with the reference image(s) — same proportions, colors, details, and style.",
  "right": "Generate a right-side profile view of {name}. The character should face to the left of frame, showing the right side of their body/face. Maintain exact visual consistency with the reference image(s) — same proportions, colors, details, and style.",
  "top": "Generate a top-down bird''s-eye view of {name}. Show the character as seen from directly above, revealing the top of the head, shoulders, and any top-facing details. Maintain exact visual consistency with the reference image(s).",
  "bottom": "Generate a bottom-up worm''s-eye view of {name}. Show the character as seen from directly below, looking upward. Maintain exact visual consistency with the reference image(s)."
}'::jsonb;
