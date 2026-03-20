const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://bhuvikastudio.com',
      'https://www.bhuvikastudio.com',
      'https://bhuvikastudio.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Allow Vercel preview URLs
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now to debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default corsOptions;
