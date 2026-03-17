const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://bhuvikastudio.com',
    'https://www.bhuvikastudio.com',
    'https://bhuvikastudio.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default corsOptions;
