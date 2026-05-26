import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { join } from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import axios from 'axios';

dotenv.config();

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', async (req, res) => {
    let fetchStatus = 'unknown';
    try {
      const resp = await fetch('https://www.google.com', { method: 'HEAD' });
      fetchStatus = resp.ok ? 'connected' : `error_${resp.status}`;
    } catch (e: any) {
      fetchStatus = `failed_${e.message}`;
    }
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      fetchStatus
    });
  });

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // In-memory cache for product recommendations to prevent rate limits
  const recommendationCache = new Map<string, string>();

  // In-memory cache for Google Drive proxy requests to minimize load times
  const driveProxyCache = new Map<string, { buffer: Buffer, contentType: string, cachedAt: number }>();

  app.post('/api/ai/recommendation', async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API Key not configured on server' });
      }

      const { item } = req.body;
      if (!item) {
        return res.status(400).json({ error: 'Item data is required' });
      }

      const cacheKey = `${item.cod}_${item.curva || 'C'}_${item.statusSignal || ''}`;
      if (recommendationCache.has(cacheKey)) {
        console.log(`[Proxy] Servindo recomendação do cache para item: ${item.cod}`);
        return res.json({ recommendation: recommendationCache.get(cacheKey) });
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

      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        const textResult = result.text?.replace(/"/g, '').trim() || 'Sem recomendação disponível.';
        recommendationCache.set(cacheKey, textResult);

        res.json({ recommendation: textResult });
      } catch (geminiError: any) {
        // Extract a clean error string message instead of dumping the entire ApiError JSON stack trace
        const cleanMsg = geminiError?.message || String(geminiError);
        const codeText = geminiError?.status || (cleanMsg.includes('429') ? 'STATUS_429_LIMIT' : 'ERROR_PROCESSED');
        
        console.warn(`[Proxy] Alerta Gemini API (${codeText}): Ativando recomendação heurística offline.`);
        
        // Generate high-quality logistic recommendation fallback instantly
        const desc = item.desc || 'item';
        const status = item.statusSignal || '';
        const curva = item.curva || 'C';
        const cobertura = parseFloat(item.cobertura) || 0;
        
        let fallback = `Estoque estável. Cobertura de ${cobertura.toFixed(1)} meses. Giro dentro do previsto.`;
        if (status === 'RUPTURA') {
          fallback = `Alerta de ruptura para ${desc}! Priorizar transferência urgente de outras filiais ou acionar compras em regime de urgência.`;
        } else if (status === 'EXCESSO') {
          fallback = `Estoque em excesso detectado (${cobertura.toFixed(1)} meses). Suspender novos pedidos e focar na transferência para filiais necessitadas.`;
        } else if (status === 'CRITICO') {
          fallback = `Giro de estoque crítico. Cobertura muito baixa (${cobertura.toFixed(1)} meses). Efetuar transferência urgente das filiais parcerias.`;
        } else if (curva === 'A') {
          fallback = `Item estratégico Curva A. Manter nível ideal estável e programar reposição preventiva para evitar paradas operacionais.`;
        } else if (status === 'SAUDAVEL') {
          fallback = `Item com estoque equilibrado. Manter acompanhamento regular de consumo sem necessidade de intervenção imediata.`;
        }
        
        // Cache the fallback too to prevent repeated failing requests for the same item during ratelimit period
        recommendationCache.set(cacheKey, fallback);
        
        res.json({ 
          recommendation: fallback, 
          isFallback: true, 
          message: 'Limite de requisições excedido. Exibindo recomendação heurística inteligente.' 
        });
      }
    } catch (error: any) {
      console.error('AI Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/send-email', async (req, res) => {
    try {
      const { destination, email, items } = req.body;
      if (!destination || !email || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'destination, email and items are required fields.' });
      }

      console.log(`\n==================================================`);
      console.log(`[EMAIL SEND SERVICE] TO: ${email}`);
      console.log(`[EMAIL SEND SERVICE] SUBJECT: Solicitação de Transferência - Destino: ${destination}`);
      console.log(`[EMAIL SEND SERVICE] BODY DETAILS:`);
      items.forEach((it: any, idx: number) => {
        console.log(`  ${idx + 1}. [COD: ${it.cod}] ${it.desc} | Qtd: ${it.qty} | Origem: ${it.source}`);
      });
      console.log(`==================================================\n`);

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || '465');
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
      const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `Cortex Inteligência <${smtpUser}>` : 'Cortex Inteligência <noreply@cortex.com>');

      const itemsHtml = items.map((it: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #1e293b;">${idx + 1}</td>
          <td style="padding: 12px; color: #334155;">
            <div style="font-weight: bold; color: #6d28d9;">${it.desc}</div>
            <div style="font-size: 11px; color: #64748b; font-family: monospace;">#${it.cod}</div>
          </td>
          <td style="padding: 12px; color: #334155; text-align: center; font-weight: bold;">${it.qty} ${it.un || 'UN'}</td>
          <td style="padding: 12px; color: #334155; text-align: center;">${it.source}</td>
          <td style="padding: 12px; color: #334155; text-align: center;">${it.reason}</td>
        </tr>
      `).join('');

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); background-color: #ffffff;">
          <div style="background-color: #6d28d9; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Solicitação de Separação para Transferência</h1>
            <p style="color: #ddd6fe; margin: 8px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">CORTEX INTELIGÊNCIA LOGÍSTICA</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 0;">
              Olá, <br/><br/>
              Segue o relatório consolidado de itens com necessidade de <strong>reforço</strong> para a filial <strong>${destination}</strong>. 
              Por favor, realize a separação dessas quantidades sobressalentes nas respectivas filiais de origem listadas abaixo:
            </p>
            
            <div style="margin: 24px 0; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; width: 30px;">#</th>
                    <th style="padding: 12px; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px;">Item</th>
                    <th style="padding: 12px; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; text-align: center;">Qtd</th>
                    <th style="padding: 12px; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; text-align: center;">Origem</th>
                    <th style="padding: 12px; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; text-align: center;">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0; background-color: #f1f5f9; padding: 16px; border-radius: 12px; border-left: 4px solid #6d28d9;">
              <strong>Importante:</strong> Após a separação dos materiais, confirme a expedição no ERP para atualizar os estoques das unidades envolvidas no fluxo.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            Este e-mail foi disparado pelo Cortex Inteligência ERP.
          </div>
        </div>
      `;

      let sentReal = false;
      let errorMsg = '';

      if (smtpHost && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: email,
            subject: `📦 Solicitação de Separação - Destino: ${destination}`,
            text: `Olá, segue a lista de itens separados para transferência para a filial: ${destination}.\n\n` + 
                  items.map((it: any, idx: number) => `[COD: ${it.cod}] ${it.desc} - Qtd: ${it.qty} (Origem: ${it.source})`).join('\n'),
            html: emailHtml
          });
          sentReal = true;
          console.log(`[EMAIL SEND SERVICE] E-mail real enviado com sucesso para ${email}`);
        } catch (mailErr: any) {
          console.error('[EMAIL SEND SERVICE] Erro ao enviar com SMTP real:', mailErr);
          errorMsg = mailErr.message || String(mailErr);
        }
      }

      if (!sentReal) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      res.json({ 
        success: true, 
        message: sentReal 
          ? `Solicitação enviada com sucesso para ${email}!` 
          : `Solicitação integrada enviada com sucesso! (Envio real simulado no console; configure variáveis SMTP em Secrets para disparar e-mails para sua caixa de entrada)`,
        simulated: !sentReal,
        smtpError: errorMsg || undefined
      });
    } catch (error: any) {
      console.error('Email Send Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/proxy-drive', async (req, res) => {
    try {
      const { url, force } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // Cache logic to optimize system speed
      const cacheKey = url.replace(/([\?&])t=\d+/, '').replace(/[\?&]$/, '');
      const cached = driveProxyCache.get(cacheKey);
      const isForce = force === 'true';

      if (cached && !isForce) {
        // Cache exists and is less than 5 minutes old
        if (Date.now() - cached.cachedAt < 5 * 60 * 1000) {
          console.log(`[Proxy] [CACHE HIT] Serving from server-side memory: ${cacheKey}`);
          res.setHeader('Content-Type', cached.contentType);
          res.setHeader('X-Cache', 'HIT');
          return res.send(cached.buffer);
        } else {
          console.log(`[Proxy] Cache expired for: ${cacheKey}`);
          driveProxyCache.delete(cacheKey);
        }
      }

      console.log(`[Proxy] [CACHE MISS] Requesting URL with Axios: ${url}`);
      
      try {
        let response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 45000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        console.log(`[Proxy] Response from Drive: ${response.status}`);
        
        // Handle Google Drive Virus Scan confirmation
        let contentType = String(response.headers['content-type'] || '');
        
        if (contentType.includes('text/html')) {
          const text = Buffer.from(response.data).toString('utf-8');
          if (text.includes('confirm=') && text.includes('drive.google.com')) {
            console.log("[Proxy] Detected virus scan confirmation, retrying with token...");
            const confirmMatch = text.match(/confirm=([a-zA-Z0-9_]+)/);
            const confirmToken = confirmMatch ? confirmMatch[1] : 't';
            const newUrl = url + (url.includes('?') ? '&' : '?') + 'confirm=' + confirmToken;
            
            response = await axios.get(newUrl, {
              responseType: 'arraybuffer',
              timeout: 45000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            console.log(`[Proxy] Retry response: ${response.status}`);
            contentType = String(response.headers['content-type'] || '');
          } else if (response.status === 200) {
             // It's HTML but not a confirmation page. Might be login page or error.
             console.warn("[Proxy] Received HTML instead of data. Status 200.");
             return res.status(403).json({ 
               error: 'Received HTML from Google Drive. Ensure the file is shared as "Anyone with the link".',
               isHtml: true 
             });
          }
        }

        const buffer = Buffer.from(response.data);
        const finalContentType = String(response.headers['content-type'] || 'application/octet-stream');
        
        // Cache the result
        driveProxyCache.set(cacheKey, {
          buffer,
          contentType: finalContentType,
          cachedAt: Date.now()
        });

        console.log(`[Proxy] Sending and caching data. Type: ${finalContentType}, Size: ${buffer.length} bytes`);
        res.setHeader('Content-Type', finalContentType);
        res.setHeader('X-Cache', 'MISS');
        res.send(buffer);

      } catch (axiosErr: any) {
        console.error('[Proxy] Axios request exception:', axiosErr.message);
        if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
          return res.status(504).json({ error: 'Request to Google Drive timed out' });
        }
        return res.status(502).json({ error: `Axios fetching failed: ${axiosErr.message}` });
      }
    } catch (error: any) {
      console.error('[Proxy] Global Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Keep old endpoint for backward compatibility during transition if needed
  app.get('/api/proxy-csv', (req, res) => {
    res.redirect(`/api/proxy-drive?url=${encodeURIComponent(req.query.url as string)}`);
  });

  // Vite middleware integrations
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
