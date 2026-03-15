const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3502;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const couples = new Map();
const linkCodes = new Map();

const FREE_QUESTIONS = {
  conversation: [
    { id: 1, text: "What's your favorite memory of us together?", category: 'conversation' },
    { id: 2, text: "If we could travel anywhere tomorrow, where would you want to go?", category: 'conversation' },
    { id: 3, text: "What's something I do that always makes you smile?", category: 'conversation' },
    { id: 4, text: "What's one thing you'd like us to try together this year?", category: 'conversation' },
    { id: 5, text: "What made you fall in love with me?", category: 'conversation' }
  ],
  fun: [
    { id: 6, text: "Do your best impression of me!", category: 'fun', type: 'dare' },
    { id: 7, text: "Share the most embarrassing thing that happened to you before we met.", category: 'fun' },
    { id: 8, text: "Give your partner a 1-minute massage.", category: 'fun', type: 'dare' },
    { id: 9, text: "What's my most annoying habit? (Be honest!)", category: 'fun' },
    { id: 10, text: "Serenade your partner with their favorite song!", category: 'fun', type: 'dare' }
  ],
  deep: [
    { id: 11, text: "What's one fear you've never told me about?", category: 'deep' },
    { id: 12, text: "How do you feel most loved - words, touch, time, gifts, or acts?", category: 'deep' },
    { id: 13, text: "What's one thing you wish we did more of together?", category: 'deep' },
    { id: 14, text: "What's your biggest dream for our future?", category: 'deep' },
    { id: 15, text: "How can I better support you during stressful times?", category: 'deep' }
  ]
};

const PREMIUM_QUESTIONS = {
  intimate: [
    { id: 100, text: "What's your favorite way I show you affection?", category: 'intimate' },
    { id: 101, text: "Describe your ideal romantic evening with me.", category: 'intimate' },
    { id: 102, text: "What's one new thing you'd like to try together?", category: 'intimate' },
    { id: 103, text: "Where's the most romantic place you'd like us to visit?", category: 'intimate' },
    { id: 104, text: "What outfit do you think I look best in?", category: 'intimate' },
    { id: 105, text: "Plan a surprise date for next week right now.", category: 'intimate', type: 'dare' },
    { id: 106, text: "What's something I do that really turns you on?", category: 'intimate' },
    { id: 107, text: "Give your partner a slow, sensual kiss.", category: 'intimate', type: 'dare' },
    { id: 108, text: "What song reminds you of our relationship?", category: 'intimate' },
    { id: 109, text: "Write a short love note to your partner right now.", category: 'intimate', type: 'dare' }
  ],
  adventure: [
    { id: 200, text: "What's the craziest thing you'd do for love?", category: 'adventure' },
    { id: 201, text: "If we started a business together, what would it be?", category: 'adventure' },
    { id: 202, text: "Plan our dream vacation in detail - money no object!", category: 'adventure' },
    { id: 203, text: "What's something neither of us has tried but should?", category: 'adventure' },
    { id: 204, text: "Dance together to the next song that plays!", category: 'adventure', type: 'dare' },
    { id: 205, text: "Create a bucket list item we can do together this month.", category: 'adventure', type: 'dare' }
  ],
  growth: [
    { id: 300, text: "What's one area where you think we've grown as a couple?", category: 'growth' },
    { id: 301, text: "How do you think we handle conflict? What could improve?", category: 'growth' },
    { id: 302, text: "What life lesson have you learned from our relationship?", category: 'growth' },
    { id: 303, text: "What's one compromise you're grateful we made?", category: 'growth' },
    { id: 304, text: "Share one thing you admire about how your partner handles challenges.", category: 'growth' },
    { id: 305, text: "Set one relationship goal together for the next month.", category: 'growth', type: 'dare' }
  ]
};

function getCouple(coupleId) {
  if (!couples.has(coupleId)) {
    couples.set(coupleId, {
      id: coupleId,
      isPro: false,
      partner1: null,
      partner2: null,
      gamesPlayed: 0
    });
  }
  return couples.get(coupleId);
}

function generateLinkCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.post('/api/init', (req, res) => {
  const { name, partnerId } = req.body;
  const coupleId = partnerId || 'couple_' + Math.random().toString(36).substr(2, 9);
  const couple = getCouple(coupleId);
  const code = generateLinkCode();
  linkCodes.set(code, coupleId);
  if (!couple.partner1) couple.partner1 = name;
  res.json({
    coupleId,
    linkCode: code,
    isPro: couple.isPro,
    partner1: couple.partner1,
    partner2: couple.partner2
  });
});

app.post('/api/link', (req, res) => {
  const { code, name } = req.body;
  if (!linkCodes.has(code.toUpperCase())) {
    return res.status(404).json({ error: 'Invalid link code' });
  }
  const coupleId = linkCodes.get(code.toUpperCase());
  const couple = getCouple(coupleId);
  couple.partner2 = name;
  res.json({
    coupleId,
    partner1: couple.partner1,
    partner2: couple.partner2,
    isPro: couple.isPro
  });
});

app.get('/api/packs', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const couple = coupleId ? getCouple(coupleId) : { isPro: false };
  const packs = [
    { id: 'conversation', name: 'Conversation Starters', icon: '💬', count: 5, free: true },
    { id: 'fun', name: 'Fun & Playful', icon: '🎉', count: 5, free: true },
    { id: 'deep', name: 'Deep Connection', icon: '💖', count: 5, free: true },
    { id: 'intimate', name: 'Intimate Moments', icon: '🔥', count: 10, free: false },
    { id: 'adventure', name: 'Adventure & Dreams', icon: '✨', count: 6, free: false },
    { id: 'growth', name: 'Growth Together', icon: '🌱', count: 6, free: false }
  ];
  res.json({ packs, isPro: couple.isPro });
});

app.get('/api/questions/:packId', (req, res) => {
  const { packId } = req.params;
  const coupleId = req.headers['x-couple-id'];
  const couple = coupleId ? getCouple(coupleId) : { isPro: false };
  let questions = FREE_QUESTIONS[packId];
  if (!questions) {
    if (!couple.isPro) {
      return res.status(403).json({ error: 'Premium pack - upgrade to Pro!' });
    }
    questions = PREMIUM_QUESTIONS[packId];
  }
  if (!questions) {
    return res.status(404).json({ error: 'Pack not found' });
  }
  res.json({ questions });
});

app.get('/api/random-question', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const couple = coupleId ? getCouple(coupleId) : { isPro: false };
  let allQuestions = [
    ...FREE_QUESTIONS.conversation,
    ...FREE_QUESTIONS.fun,
    ...FREE_QUESTIONS.deep
  ];
  if (couple.isPro) {
    allQuestions = [
      ...allQuestions,
      ...PREMIUM_QUESTIONS.intimate,
      ...PREMIUM_QUESTIONS.adventure,
      ...PREMIUM_QUESTIONS.growth
    ];
  }
  const randomQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];
  res.json({ question: randomQ });
});

app.post('/api/game-played', (req, res) => {
  const { coupleId } = req.body;
  const couple = getCouple(coupleId);
  couple.gamesPlayed++;
  res.json({ gamesPlayed: couple.gamesPlayed });
});

app.post('/api/create-subscription', async (req, res) => {
  const { coupleId, origin } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Couples Game Pro',
            description: 'Monthly subscription - Premium packs, unlimited games',
          },
          unit_amount: 499,
          recurring: { interval: 'month' }
        },
        quantity: 1,
      }],
      success_url: `${origin}?success=true&couple_id=${coupleId}`,
      cancel_url: `${origin}?canceled=true`,
      metadata: { coupleId }
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

app.post('/api/activate-pro', (req, res) => {
  const { coupleId } = req.body;
  const couple = getCouple(coupleId);
  couple.isPro = true;
  res.json({ success: true, isPro: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', app: 'Couples Game', version: '1.0.0' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Couples Game running on port ${PORT}`);
});
