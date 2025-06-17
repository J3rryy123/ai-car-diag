// pages/api/history.js - Server-seitige Historie-Verwaltung
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

// Verzeichnis für Historie-Dateien
const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

// Stelle sicher, dass das Verzeichnis existiert
async function ensureHistoryDir() {
  try {
    await mkdir(HISTORY_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Fehler beim Erstellen des Historie-Verzeichnisses:', error);
    }
  }
}

// Benutzer-ID generieren (einfache Session-basierte Lösung)
function generateUserId(req) {
  // In Produktion sollte hier ein echtes Session-Management verwendet werden
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  // Einfacher Hash für Demo-Zwecke
  const hash = Buffer.from(`${ip}-${userAgent}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  return `user_${hash}`;
}

// Historie für Benutzer laden
async function loadUserHistory(userId) {
  try {
    await ensureHistoryDir();
    const filePath = path.join(HISTORY_DIR, `${userId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const data = await readFile(filePath, 'utf8');
    const history = JSON.parse(data);
    
    // Validierung und Bereinigung
    return Array.isArray(history) ? history.slice(0, 50) : []; // Max 50 Einträge
  } catch (error) {
    console.error('Fehler beim Laden der Historie:', error);
    return [];
  }
}

// Historie für Benutzer speichern
async function saveUserHistory(userId, history) {
  try {
    await ensureHistoryDir();
    const filePath = path.join(HISTORY_DIR, `${userId}.json`);
    
    // Validierung
    if (!Array.isArray(history)) {
      throw new Error('Historie muss ein Array sein');
    }
    
    // Begrenze auf 50 Einträge und entferne alte
    const limitedHistory = history.slice(0, 50);
    
    // Bereinige sensible Daten (falls vorhanden)
    const cleanedHistory = limitedHistory.map(item => ({
      ...item,
      // Entferne potentiell sensible Debug-Informationen
      debugInfo: item.debugInfo ? {
        mode: item.debugInfo.mode,
        modelUsed: item.debugInfo.modelUsed
      } : null
    }));
    
    await writeFile(filePath, JSON.stringify(cleanedHistory, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Historie:', error);
    return false;
  }
}

// Statistiken für Admin-Zwecke
async function getHistoryStats() {
  try {
    await ensureHistoryDir();
    const files = fs.readdirSync(HISTORY_DIR);
    
    let totalEntries = 0;
    let totalUsers = files.length;
    let recentActivity = 0;
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(HISTORY_DIR, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          totalEntries += data.length;
          
          // Zähle aktuelle Aktivität
          const hasRecentActivity = data.some(entry => 
            new Date(entry.timestamp).getTime() > oneWeekAgo
          );
          if (hasRecentActivity) recentActivity++;
        } catch (fileError) {
          console.error(`Fehler beim Lesen der Datei ${file}:`, fileError);
        }
      }
    }
    
    return {
      totalUsers,
      totalEntries,
      recentActivity,
      averageEntriesPerUser: totalUsers > 0 ? Math.round(totalEntries / totalUsers) : 0
    };
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // CORS-Header für lokale Entwicklung
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = generateUserId(req);
  
  try {
    switch (req.method) {
      case 'GET':
        // Historie laden
        if (req.query.stats === 'true') {
          // Admin-Statistiken (optional)
          const stats = await getHistoryStats();
          return res.status(200).json({ stats });
        }
        
        const history = await loadUserHistory(userId);
        return res.status(200).json({ 
          history,
          userId: userId.substring(0, 8) + '...', // Gekürzte ID für Debugging
          count: history.length 
        });

      case 'POST':
        // Historie speichern
        const { history: newHistory } = req.body;
        
        if (!newHistory) {
          return res.status(400).json({ 
            error: 'Historie-Daten fehlen',
            message: 'Bitte geben Sie ein "history" Array im Request Body an'
          });
        }
        
        const success = await saveUserHistory(userId, newHistory);
        
        if (success) {
          return res.status(200).json({ 
            success: true,
            message: 'Historie erfolgreich gespeichert',
            count: newHistory.length 
          });
        } else {
          return res.status(500).json({ 
            error: 'Fehler beim Speichern der Historie'
          });
        }

      case 'DELETE':
        // Historie löschen
        try {
          await ensureHistoryDir();
          const filePath = path.join(HISTORY_DIR, `${userId}.json`);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return res.status(200).json({ 
              success: true, 
              message: 'Historie erfolgreich gelöscht' 
            });
          } else {
            return res.status(404).json({ 
              error: 'Keine Historie gefunden' 
            });
          }
        } catch (error) {
          console.error('Fehler beim Löschen der Historie:', error);
          return res.status(500).json({ 
            error: 'Fehler beim Löschen der Historie' 
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ 
          error: 'Methode nicht erlaubt',
          allowed: ['GET', 'POST', 'DELETE']
        });
    }
  } catch (error) {
    console.error('Allgemeiner API-Fehler:', error);
    return res.status(500).json({ 
      error: 'Interner Server-Fehler',
      message: 'Bitte versuchen Sie es später erneut'
    });
  }
}