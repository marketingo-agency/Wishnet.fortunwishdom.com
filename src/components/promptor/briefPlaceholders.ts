type PlaceholderMap = Record<string, Record<string, string>>;

// ─── Brief Placeholders (Create tab — "Your Brief") ───────────────────────────

const BRIEF_PLACEHOLDERS: PlaceholderMap = {
  text: {
    general: `Tell Promptor what you need to write — a campaign idea, a brand story, a product narrative. Fortun Wishnet transforms every brief into words that carry wonder.\n\nExample: 'We're launching a new collection of memory-keepers — plush companions that hold childhood wishes. Write something that makes parents feel the magic before they even see the toy.'`,
    ad_copy: `Describe the ad campaign — the product, the audience, the feeling you want to spark. Fortun Wishnet ads don't just sell; they invite people into a world of wonder.\n\nExample: 'A limited-edition plush for grandparents to gift. Target: 60+ gift-givers. Emotion: nostalgia and warmth. CTA: gift it before it's gone.'`,
    landing_page: `Describe your landing page — what it's for, who lands on it, and what action you want them to take. Every Fortun Wishnet page is a doorway into the world of wishes.\n\nExample: 'Landing page for our Wish Vault subscription box. Audience: millennial parents. Goal: sign-up. Tone: magical, trustworthy, slightly playful.'`,
    email: `Describe the email — its purpose, its recipients, and the one thing you want them to feel or do. Fortun Wishnet emails are not newsletters; they're messages from a world that remembers.\n\nExample: 'A re-engagement email for lapsed subscribers. Tone: warm, personal, a little wistful. CTA: come back and see what's new in the Wish Collection.'`,
    blog_outline: `Describe the blog post — its topic, its audience, and the idea you want to leave them with. Fortun Wishnet content invites readers to pause, reflect, and believe in the power of small moments.\n\nExample: 'A post about why childhood toys matter for emotional development. Audience: millennial parents. Angle: science meets wonder. Link back to our Wish Companion collection.'`,
    product_description: `Describe the product — what it is, what it does, and most importantly, what it means. Fortun Wishnet product descriptions don't list features; they tell the story of a wish fulfilled.\n\nExample: 'A limited plush bear that comes with a keepsake wish card. For children aged 3–8. Soft, washable, sustainably made. The wish card is the heart of it.'`,
  },
  image: {
    general_scene: `Describe the scene you want to generate — the mood, the setting, the light. Fortun Wishnet visuals live at the intersection of wonder and warmth.\n\nExample: 'A softly lit room at golden hour. A child unwrapping a plush companion surrounded by floating wish lanterns. Painterly style, dreamlike depth of field, warm amber palette.'`,
    character_portrait: `Describe the character — their age, emotion, the story written on their face. Fortun Wishnet characters carry wonder in their eyes and warmth in every detail.\n\nExample: 'A young girl, 7 years old, holding a plush fox against her chest. Eyes wide with the kind of joy that happens in private moments. Soft studio lighting, pastel tones, painterly realism.'`,
    product_hero: `Describe the product and the story it should tell in a single image. Fortun Wishnet product heroes are more than photography — they're windows into a world where the product belongs.\n\nExample: 'Our Wish Companion plush on a weathered wooden shelf beside a small candle and an open journal. Morning light. Quiet, intimate, meaningful. Style: editorial product photography.'`,
    social_square: `Describe what this square image needs to communicate — the product, the emotion, or the moment. Fortun Wishnet social visuals stop thumbs and spark feelings in under a second.\n\nExample: 'A 1:1 image for Instagram. Feature our new plush line. Bright but not loud — think soft natural light, a child's hands, and one small wish written on paper.'`,
  },
  social_image: {
    announcement: `What are you announcing? Describe the news, the platform, and the emotion you want to lead with. Fortun Wishnet announcements feel like an invitation to something wonderful.\n\nExample: 'Announcing the Wish Vault Collection drop on Instagram. Audience: existing community. Tone: exciting but warm. No discount messaging — pure anticipation and wonder.'`,
    quote_card: `Share the quote or message and tell Promptor who it's for and where it lives. Fortun Wishnet quote cards are not posters — they're small windows into the world of wonder we build together.\n\nExample: '"A wish remembered is never lost." — Share this for International Children's Day. Platform: Instagram Stories. Background: soft gradient, sand and blush tones.'`,
    carousel_slide: `Describe the carousel — its topic, how many slides, and the story arc from first to last. Fortun Wishnet carousels guide audiences through a journey, not just a list.\n\nExample: '5-slide carousel on how to choose the right Wish Companion for your child. Slide 1: hook. Slides 2–4: one insight each. Slide 5: soft CTA to explore the collection. Warm, editorial.'`,
  },
  social_copy: {
    hook_variants: `What's the content about and what feeling should the first line spark? Fortun Wishnet hooks don't chase attention — they invite it with wonder and warmth.\n\nExample: 'Hooks for a post about our new Wish Vault box. Platform: Instagram. Audience: millennial parents. Tone: curious, warm, slightly mysterious. 3 variants please.'`,
    caption_variants: `Describe the post — what's in the image, what's the message, and what you want the audience to feel. Fortun Wishnet captions are the whisper behind the wonder.\n\nExample: '3 caption variants for an image of a child holding our new plush. Platform: Instagram. Keep them short — under 150 characters. Warm, personal, no hard sell.'`,
    cta_variants: `Describe the action you want your audience to take and the context around the post. Fortun Wishnet CTAs feel like an open hand, not a sales push.\n\nExample: '3 CTA variants for our Wish Vault pre-order. Platform: Instagram bio link. Tone: warm and curious. Avoid words like "buy" or "shop" — use discovery-led language.'`,
  },
  video: {
    short_reel: `Describe the reel — the product or moment, the platform, the one emotion you want the audience to feel in 15–30 seconds. Fortun Wishnet reels capture wishes in motion.\n\nExample: 'A 20-second reel for Instagram. A child receiving their Wish Companion for the first time. No text overlay. Music: soft, wonder-filled. End on their face. Raw and real.'`,
    cinematic_trailer: `Describe the trailer — what world it reveals, who it's for, and the emotional journey from first frame to last. Fortun Wishnet trailers are invitations into a world of wonder.\n\nExample: 'A 60-second cinematic trailer for the Wish Vault launch. Opens on a quiet bedroom at night. Builds through intimate wish moments. Ends with the Fortun Wishnet logo on a soft fade. Score: orchestral, warm.'`,
    explainer_storyboard: `Describe what needs explaining — the product, the concept, or the journey — and who needs to understand it. Fortun Wishnet explainers make the magical feel accessible.\n\nExample: 'A storyboard for a 90-second explainer on how the Wish Vault subscription works. Audience: first-time visitors. Style: soft illustration with motion. Tone: warm, clear, no jargon.'`,
  },
};

// ─── Existing Prompt Placeholders (Optimize tab) ──────────────────────────────

const EXISTING_PROMPT_PLACEHOLDERS: PlaceholderMap = {
  text: {
    general: `Paste the text copy you'd like to improve — an ad, an email, a product description. Promptor will align it with Fortun's brand voice and Heart rules.`,
    ad_copy: `Paste the ad copy you want to improve. Promptor will check it against Fortun's Heart rules and sharpen every word for emotional impact and brand alignment.`,
    landing_page: `Paste your current landing page copy. Promptor will restructure it for conversion while keeping the soul of Fortun's wonder-first brand language.`,
    email: `Paste the email you want to optimize. Promptor will realign the subject line, body, and CTA with Fortun's voice and Heart compliance guidelines.`,
    blog_outline: `Paste your existing blog outline or draft. Promptor will sharpen its structure, inject Fortun's storytelling cadence, and check for brand alignment.`,
    product_description: `Paste the current product description. Promptor will rewrite it with Fortun's wonder-first voice — leading with feeling, grounding with detail, closing with belonging.`,
  },
  image: {
    general_scene: `Paste your existing image generation prompt. Promptor will enrich it with Fortun's visual language — cinematic lighting, emotional resonance, and brand-consistent atmosphere.`,
    character_portrait: `Paste your character portrait prompt. Promptor will refine the emotional cues, lighting direction, and style descriptors to match Fortun's warm, wonder-first visual identity.`,
    product_hero: `Paste your current product hero prompt. Promptor will elevate it with precise styling cues, atmospheric depth, and Fortun's signature blend of the handcrafted and the magical.`,
    social_square: `Paste your current social square image prompt. Promptor will sharpen the composition, lighting, and visual hierarchy for maximum impact in a crowded feed — Fortun style.`,
  },
  social_image: {
    announcement: `Paste your announcement image brief or prompt. Promptor will redesign the visual storytelling to match Fortun's announcement style — bold feeling, restrained language, maximum pull.`,
    quote_card: `Paste your existing quote card prompt or design brief. Promptor will refine the typography hierarchy, background treatment, and brand signature placement for emotional impact.`,
    carousel_slide: `Paste your carousel slide prompt or storyboard. Promptor will improve visual consistency, slide-to-slide storytelling flow, and alignment with Fortun's warm editorial aesthetic.`,
  },
  social_copy: {
    hook_variants: `Paste your existing opening lines or hook. Promptor will rewrite variants that align with Fortun's voice — drawing readers in with emotion before they even see the product.`,
    caption_variants: `Paste your existing caption. Promptor will rewrite it with Fortun's signature warmth, tighten the language, and ensure it passes Heart compliance before any CTA is added.`,
    cta_variants: `Paste your existing CTA text. Promptor will rewrite variants that feel aligned with Fortun's "invite, don't push" philosophy — compelling without pressure.`,
  },
  video: {
    short_reel: `Paste your existing reel brief or script. Promptor will sharpen the shot sequence, pacing, and emotional arc to match Fortun's signature — authentic moments, cinematic warmth.`,
    cinematic_trailer: `Paste your existing trailer script or visual treatment. Promptor will elevate the narrative arc, scene transitions, and brand voice alignment for a cinematic Fortun-worthy result.`,
    explainer_storyboard: `Paste your existing explainer script or storyboard. Promptor will restructure the flow, simplify the language, and align the visual narrative with Fortun's warm illustration style.`,
  },
};

// ─── Optimization Goal Placeholders (Optimize tab) ────────────────────────────

const OPTIMIZATION_GOAL_PLACEHOLDERS: PlaceholderMap = {
  text: {
    general: `What needs to change? e.g. 'Add more warmth, tone down the sales pressure, and align the CTA with Fortun's "wish, play, remember" brand promise.'`,
    ad_copy: `What do you want the ad to do better? e.g. 'The hook is weak — it needs to grab attention in 2 seconds. Keep the warmth but add urgency to the CTA.'`,
    landing_page: `What's underperforming? e.g. 'The hero headline feels generic. The benefit section is too long. The CTA button text needs to feel like an invitation, not a command.'`,
    email: `What should Promptor fix? e.g. 'Subject line has low open rates. Body is too long. The sign-off feels corporate — make it feel like it's from a friend, not a brand.'`,
    blog_outline: `What needs work? e.g. 'The intro is dry. Section 3 goes off-brand. The conclusion needs a stronger emotional payoff and a soft CTA to the Wish Collection.'`,
    product_description: `What's missing? e.g. 'Too clinical — focus on the emotional hook first. The materials section needs simplifying. The closing line should make the parent feel like the hero of the gift.'`,
  },
  image: {
    general_scene: `What needs improving? e.g. 'The prompt is too vague on lighting and mood. Add more sensory detail and push the dreamlike quality without losing realism.'`,
    character_portrait: `What should change? e.g. 'The emotional description is too generic. Be more specific about the micro-expression and the way the light falls to amplify intimacy and warmth.'`,
    product_hero: `What's weak? e.g. 'The environment feels generic. Push for more storytelling — the product should look like it belongs to someone's most treasured corner of the world.'`,
    social_square: `What should it do better? e.g. 'Too busy. Simplify the scene to one hero element. The colour palette needs to feel more on-brand — warmer and more muted.'`,
  },
  social_image: {
    announcement: `What's not landing? e.g. 'The visual hierarchy is off — the announcement itself gets lost. Lead with the emotional payoff, then the product name, then the date.'`,
    quote_card: `What needs work? e.g. 'The font pairing feels too modern and cold. Soften it. The background needs texture — something that feels like parchment or soft linen, not flat colour.'`,
    carousel_slide: `What's broken? e.g. 'Slides 3 and 4 feel disconnected from the rest. The CTA slide is too aggressive — make it feel like a natural next step, not a hard sell.'`,
  },
  social_copy: {
    hook_variants: `What's missing from the hook? e.g. 'Too generic — anyone could have written this. Add a specific sensory detail or an unexpected angle that only Fortun Wishnet could use.'`,
    caption_variants: `What should change? e.g. 'Too corporate. Cut the hashtag cluster from the body. The last sentence needs to feel like a gentle invitation, not a product pitch.'`,
    cta_variants: `What's wrong with the CTA? e.g. 'It feels too transactional. Soften the language — the action should feel like the natural next step in a journey, not an interruption.'`,
  },
  video: {
    short_reel: `What needs improving? e.g. 'The pacing is too slow in the first 3 seconds — hooks need to hit faster on Reels. Keep the warmth but open stronger and cut tighter.'`,
    cinematic_trailer: `What's not working? e.g. 'The opening is too slow and the brand reveal comes too late. Restructure the arc — tease wonder early, deliver belonging mid-way, close on brand.'`,
    explainer_storyboard: `What's confusing? e.g. 'Step 3 of the process is unclear — viewers drop off there. Simplify the visual metaphor and add a moment of delight to re-engage before the CTA.'`,
  },
};

// ─── Getter functions ─────────────────────────────────────────────────────────

export function getBriefPlaceholder(outputType: string, blueprint: string): string {
  return BRIEF_PLACEHOLDERS[outputType]?.[blueprint] ?? BRIEF_PLACEHOLDERS.text.general;
}

export function getExistingPromptPlaceholder(outputType: string, blueprint: string): string {
  return EXISTING_PROMPT_PLACEHOLDERS[outputType]?.[blueprint] ?? EXISTING_PROMPT_PLACEHOLDERS.text.general;
}

export function getOptimizationGoalPlaceholder(outputType: string, blueprint: string): string {
  return OPTIMIZATION_GOAL_PLACEHOLDERS[outputType]?.[blueprint] ?? OPTIMIZATION_GOAL_PLACEHOLDERS.text.general;
}
