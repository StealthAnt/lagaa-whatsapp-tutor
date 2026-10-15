# Lagaa — Ghana Curriculum Tutor for WhatsApp

An Eve agent for Ghana Senior High School Year 1–3 learners. Lagaa supports the full subject menu listed across the Ministry's Year 1–3 curriculum pages, with short explanations, hints, worked examples, practice questions, and safe project ideas. Its WhatsApp channel uses the official Eve Chat SDK adapter for WhatsApp Business Cloud.

## What is in this first build

- A curriculum-aware tutor personality and teaching approach.
- A grouped subject menu covering languages, mathematics and science, technology and engineering, arts, business and humanities, and practical and health subjects.
- A WhatsApp Business Cloud channel at `/eve/v1/whatsapp`.
- A curriculum source map for Ministry of Education Year 1–3 pages, Teacher Resource System materials, Professional Development resources, and optional Class CrunchLabs activities.
- Clear distinction between official Ghana curriculum resources and supplementary Class CrunchLabs inspiration.
- WASSCE practice links for school-candidate and private-candidate sessions, including November/December, with examiner guidance, source attribution, and safeguards against presenting generated questions as past questions.
- Tutor instructions specify an objective-quiz cap of 40, randomized multiple-choice options, and answer explanations. These are model-guided rules, not yet independently enforced by quiz-state code.
- Privacy-first tutoring instructions: Lagaa does not ask learners for personal details; they can choose a subject and optionally an SHS year. WhatsApp, the AI provider, and hosting provider still process messages and routing metadata, so the service is not anonymous.

The source map helps the tutor point learners to official resources. It does not mean the linked PDFs have all been imported or indexed; the tutor should not claim exact alignment to a document it has not read.

## Detailed setup

### 1. What you need

- Node.js 24 and npm.
- A Vercel account for hosting and a Meta for Developers account for WhatsApp Business Cloud.
- A WhatsApp Business phone number for the live bot. You can start with Meta's test number and an allow-listed recipient.
- A Google AI Studio API key for Gemini's limited free tier. You do not need to add a payment card for free-tier API use. Free-tier limits apply, and Google may use free-tier prompts and responses to improve its products; do not send private learner information.

### 2. Run Lagaa locally

Open PowerShell in this project folder and run:

```powershell
Copy-Item .env.example .env.local
npm install
```

Open [Google AI Studio](https://aistudio.google.com/app/apikey), sign in with a Google account, and create an API key. Copy the key. Open `.env.local` in a text editor and replace the sample value after `GOOGLE_GENERATIVE_AI_API_KEY=` with your key. Keep the key private and do not share a screenshot of it. This uses Gemini 3.5 Flash-Lite through Google's Interactions API directly, so you do not need a Vercel AI Gateway key or a payment card for the free tier. Free usage has model and rate limits that can change.

The four WhatsApp fields must be non-empty for the adapter to initialize. Until you have Meta credentials, keep the `local-placeholder` values copied from `.env.example`; they allow local agent development only and will not connect to or send messages through WhatsApp. Replace them with real Meta credentials before webhook testing or deployment. Then start the agent:

```powershell
npx eve dev
```

Use the development terminal to ask Lagaa a simple question. Confirm it introduces itself, offers the full subject list, and answers a subject question. To test messages through Meta, Lagaa must be reachable on a public HTTPS URL; the easiest first path is deploying a preview or staging instance below.

### 3. Create a WhatsApp Cloud API app

1. Go to [Meta for Developers](https://developers.facebook.com/apps/) and create a **Business** app, or select an existing one.
2. Add the **WhatsApp** product and open **WhatsApp > API Setup**.
3. Start with the Meta-provided test number. Add your own WhatsApp number as an allowed recipient and use the dashboard's test message to verify the number works.
4. Record the **Phone Number ID** and temporary **Access Token** shown in API Setup. Also note the WhatsApp Business Account (WABA) ID for account setup.
5. Find the app's **App Secret** under **App settings > Basic**. Keep all credentials private.
6. For a live launch, finish Meta's business verification and phone-number registration steps. Create a production System User access token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions, and complete any app review Meta requires for your use. The API Setup token is temporary and is for initial testing.

### 4. Deploy the agent to Vercel

1. From the project folder, link the project to Vercel:

   ```powershell
   npx eve link
   ```

   Follow the prompts to sign in and select or create a Vercel project.

2. In the Vercel dashboard, open the project and go to **Settings > Environment Variables**. Add these values for the environment you are deploying (Preview for testing, Production for launch):

   | Variable | Value |
   |---|---|
   | `GOOGLE_GENERATIVE_AI_API_KEY` | Your Google AI Studio key (use only the free-tier model configured in Lagaa) |
   | `WHATSAPP_ACCESS_TOKEN` | The Meta access token |
   | `WHATSAPP_APP_SECRET` | The App Secret from Meta App Settings |
   | `WHATSAPP_PHONE_NUMBER_ID` | The Phone Number ID from WhatsApp API Setup |
   | `WHATSAPP_VERIFY_TOKEN` | A private random string you create; you will enter the same value in Meta |

   Keep `.env.local` and these values out of source control. `.env.local` is ignored by Git.

3. Deploy from the project folder:

   ```powershell
   npx eve deploy
   ```

   Confirm the production deployment if prompted. Copy the resulting HTTPS domain, for example `https://your-project.vercel.app`.

4. Check the deployment health endpoint in a browser:

   ```text
   https://YOUR-DOMAIN/eve/v1/health
   ```

   Replace `YOUR-DOMAIN` with the domain Vercel gave you. A successful health response confirms that the Eve service is reachable.

### 5. Connect Meta's webhook to Lagaa

1. In Meta for Developers, open the app's **WhatsApp > Configuration** page.
2. Set **Callback URL** to `https://YOUR-DOMAIN/eve/v1/whatsapp`.
3. Enter the exact same random value you set as `WHATSAPP_VERIFY_TOKEN` in the **Verify Token** field.
4. Choose **Verify and Save**. If verification fails, check that the deployment is live, the path is exactly `/eve/v1/whatsapp`, and the two verify-token values match.
5. Subscribe to the `messages` webhook field so incoming WhatsApp messages reach Lagaa. Also subscribe to `user_id_update` if available, to help preserve a learner's conversation identity if Meta changes its user identifier.
6. If you added or changed environment variables after deploying, redeploy so the new deployment receives them.

### 6. Send a full test conversation

From the allowed recipient number, message the Meta test number (or the live Lagaa number) and verify:

1. “Hi” receives a reply identifying the tutor as Lagaa and offering the subjects.
2. Choosing a subject and Year 1, 2, or 3 gets a relevant explanation.
3. “Quiz me with 3 questions on Physics” starts a quiz with randomized choices and explanations after responses.
4. A request for WASSCE Nov/Dec practice points to the private-candidate resources in the source map.

Check Vercel's deployment logs and Meta's webhook delivery view if messages do not arrive. Confirm the access token is valid, the phone number ID is correct, and `messages` is subscribed. For signature errors, recheck `WHATSAPP_APP_SECRET`.

### 7. Prepare for a real learner pilot

Lagaa is configured not to ask for learner names, ages, school names, locations, contact details, IDs, or other personal information. It asks only for academic context such as subject, topic, and optionally SHS year. WhatsApp still processes the sender's phone number to route messages, so do not describe the service as anonymous. Tell learners not to post personal details, and avoid collecting or retaining them in any added analytics or storage.

The current WhatsApp channel uses in-memory state, which is suitable for a prototype but loses subscriptions and conversation continuity when the process restarts. The 40-question cap, privacy rules, source labeling, and safety behavior are currently prompt-level instructions; they are not hard-enforced by separate runtime validators or moderation. Do not treat this prototype as production-ready for minors until those controls, provider data handling, consent, retention, support/escalation, and applicable Ghanaian requirements have been reviewed. WhatsApp requires approved message templates for business-initiated messages outside its customer-service window; the current tutor flow is designed to reply to learner-initiated messages.

## Curriculum sources

See [`agent/skills/ghana-steam-curriculum/references/subjects.md`](agent/skills/ghana-steam-curriculum/references/subjects.md) for the full subject menu and [`agent/skills/ghana-steam-curriculum/references/source-map.md`](agent/skills/ghana-steam-curriculum/references/source-map.md) for the source list and use guidance. NaCCA's official SHS curricula are the subject-alignment source of truth. The Ministry microsite links learner and teacher materials. Class CrunchLabs offers optional, US standards-based science activities that can inspire supplementary examples.

## Next development steps

1. Confirm one or two priority subjects for the first learner pilot.
2. Confirm permissions for any corpus use; then map approved NaCCA curriculum metadata by year, subject, topic, and indicator, linking to official PDFs rather than redistributing substantial source text.
3. Add a browser demo and short example conversations for review.
4. Replace in-memory Chat SDK state with a persistent adapter and set production privacy, retention, and learner-support policies.
5. Configure the real Meta app and run end-to-end message trials.
