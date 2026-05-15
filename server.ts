import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ 
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

app.post('/api/ai/recommendation', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API Key not configured on server' });
    }

    const { item } = req.body;
    if (!item) {
      return res.status(400).json({ error: 'Item data is required' });
    }
    
    const prompt = `Você é um especialista em logística e gestão de estoque. 
    Analise o seguinte item e forneça uma recomendação estratégica curta (máximo 150 caracteres) para o gestor.
    
    Item: ${item.desc}
    Código: ${item.cod}
    Curva ABC: ${item.curva}
    Saldo Atual: ${item.saldo}
    Média Mensal: ${item.media}
    Cobertura: ${item.cobertura} meses
    Status: ${item.statusSignal}
    
    Seja direto e prático. Use o idioma Português (Brasil).`;

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    res.json({ recommendation: result.text?.replace(/"/g, '').trim() || 'Sem recomendação disponível.' });
  } catch (error: any) {
    console.error('AI Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In dev, handle API and show instructions for Vite
  app.get('/', (req, res) => {
    res.send('Server is running. In development, use Vite for the frontend (port 3001) and this server for API (port 3000).');
  });
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
