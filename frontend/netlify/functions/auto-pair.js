exports.handler = async () => {
  const api = process.env.API_BASE_URL || process.env.VITE_API_URL || '';
  if (!api) {
    return { statusCode: 200, body: 'Set API_BASE_URL in Netlify to enable auto-pairing.' };
  }
  const target = `/?api=${encodeURIComponent(api)}`;
  return {
    statusCode: 302,
    headers: { Location: target }
  };
};


