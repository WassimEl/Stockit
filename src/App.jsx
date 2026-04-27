import { useState, useEffect, useRef } from 'react';

const RAWG_KEY = '346adb8ac9fc444989a53b8b7256a277';
const APP_VERSION = '2.6.0';

// Thèmes
const THEMES = {
  blue: { name: 'Bleu', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#3b82f6', accentHover: '#2563eb', border: 'rgba(255,255,255,0.1)' },
  purple: { name: 'Violet', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#a855f7', accentHover: '#9333ea', border: 'rgba(255,255,255,0.1)' },
  green: { name: 'Vert', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#22c55e', accentHover: '#16a34a', border: 'rgba(255,255,255,0.1)' },
  orange: { name: 'Orange', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#f97316', accentHover: '#ea580c', border: 'rgba(255,255,255,0.1)' },
  rose: { name: 'Rose', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#f43f5e', accentHover: '#e11d48', border: 'rgba(255,255,255,0.1)' },
  cyan: { name: 'Cyan', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#06b6d4', accentHover: '#0891b2', border: 'rgba(255,255,255,0.1)' },
  emerald: { name: 'Émeraude', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#10b981', accentHover: '#059669', border: 'rgba(255,255,255,0.1)' },
  yellow: { name: 'Jaune', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#eab308', accentHover: '#ca8a04', border: 'rgba(255,255,255,0.1)' },
  pink: { name: 'Pink', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#ec4899', accentHover: '#db2777', border: 'rgba(255,255,255,0.1)' },
  indigo: { name: 'Indigo', bg: '#0a0a0f', card: 'rgba(255,255,255,0.05)', accent: '#6366f1', accentHover: '#4f46e5', border: 'rgba(255,255,255,0.1)' }
};

// Catégories
const CATEGORIES = [
  { id: 'trending', name: '🔥 Tendance', endpoint: '&ordering=-added&dates=2024-01-01,2026-12-31' },
  { id: 'action', name: '💥 Action', endpoint: '&genres=action' },
  { id: 'horror', name: '👻 Horreur', endpoint: '&genres=horror' },
  { id: 'rpg', name: '⚔️ RPG', endpoint: '&genres=rpg' },
  { id: 'indie', name: '🎮 Indé', endpoint: '&genres=indie' },
  { id: 'strategy', name: '♟️ Stratégie', endpoint: '&genres=strategy' },
  { id: 'adventure', name: '🗺️ Aventure', endpoint: '&genres=adventure' },
  { id: 'puzzle', name: '🧩 Puzzle', endpoint: '&genres=puzzle' },
  { id: 'shooter', name: '🔫 FPS', endpoint: '&genres=shooter' },
  { id: 'racing', name: '🏎️ Course', endpoint: '&genres=racing' }
];

// Statuts
const GAME_STATUS = [
  { id: 'backlog', emoji: '📦', label: 'À faire' },
  { id: 'playing', emoji: '🔄', label: 'En cours' },
  { id: 'completed', emoji: '✅', label: 'Fini' },
  { id: 'abandoned', emoji: '❌', label: 'Abandonné' }
];

const keyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// Base de données IndexedDB
const DB_NAME = 'GameTrackerDB';
const DB_VERSION = 6;
const STORE_NAME = 'userData';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
  });
}

async function saveUserData(userId, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ userId, ...data });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadUserData(userId) {
  const db = await openDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(userId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function getAllUsers() {
  const db = await openDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const users = request.result || [];
      resolve(users.map(u => ({ id: u.userId, name: u.name, avatar: u.avatar, avatarColor: u.avatarColor, theme: u.theme })));
    };
    request.onerror = () => resolve([]);
  });
}

async function deleteUser(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(userId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// API RAWG
async function searchGames(query, page = 1) {
  try {
    const res = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=40&page=${page}`
    );
    const data = await res.json();
    return {
      games: (data.results || []).map((game) => ({
        id: game.id,
        name: game.name,
        image: game.background_image,
        rating: game.rating,
        released: game.released,
        genres: game.genres?.map(g => g.name) || []
      })),
      nextPage: data.next ? page + 1 : null
    };
  } catch (e) {
    console.error(e);
    return { games: [], nextPage: null };
  }
}

async function getGamesByCategory(categoryId, page = 1) {
  try {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return { games: [], nextPage: null };
    
    let url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&page_size=40&page=${page}`;
    if (category.endpoint) {
      url += category.endpoint;
    }
    
    const res = await fetch(url);
    const data = await res.json();
    const hasMore = data.next !== null;
    
    return {
      games: (data.results || []).map((game) => ({
        id: game.id,
        name: game.name,
        image: game.background_image,
        rating: game.rating,
        released: game.released,
        genres: game.genres?.map(g => g.name) || []
      })),
      nextPage: hasMore ? page + 1 : null
    };
  } catch (e) {
    console.error(`Erreur pour catégorie ${categoryId}:`, e);
    return { games: [], nextPage: null };
  }
}

async function getUpcomingGames() {
  const today = new Date();
  const threeMonths = new Date();
  threeMonths.setMonth(today.getMonth() + 3);
  const fromDate = today.toISOString().split('T')[0];
  const toDate = threeMonths.toISOString().split('T')[0];
  const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&dates=${fromDate},${toDate}&ordering=released&page_size=40`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || []).map((game) => ({
      id: game.id,
      name: game.name,
      image: game.background_image,
      rating: game.rating,
      released: game.released,
      genres: game.genres?.map(g => g.name) || []
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function getRandomGame() {
  try {
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&page_size=40&page=${randomPage}&ordering=-rating`;
    
    const res = await fetch(url);
    const data = await res.json();
    const games = data.results || [];
    if (games.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * games.length);
    const game = games[randomIndex];
    
    const detailRes = await fetch(`https://api.rawg.io/api/games/${game.id}?key=${RAWG_KEY}`);
    const detailData = await detailRes.json();
    
    return {
      id: game.id,
      name: game.name,
      image: game.background_image,
      rating: game.rating,
      released: game.released,
      description: detailData.description_raw || game.description_raw || "Pas de description disponible.",
      genres: game.genres?.map(g => g.name) || []
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Timer
function Timer({ initialTime = 0, onTimeChange }) {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => {
          const newTime = prev + 1;
          onTimeChange?.(newTime);
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, onTimeChange]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return parseInt(timeStr) || 0;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {isEditing ? (
        <>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="HH:MM:SS"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid #3b82f6',
              borderRadius: 8,
              padding: '4px 8px',
              color: 'white',
              fontSize: 12,
              width: 90
            }}
          />
          <button onClick={() => { setTime(parseTime(editValue)); onTimeChange?.(parseTime(editValue)); setIsEditing(false); }} style={{ background: '#22c55e', border: 'none', padding: '4px 8px', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 11 }}>✓</button>
          <button onClick={() => setIsEditing(false)} style={{ background: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 11 }}>✕</button>
        </>
      ) : (
        <>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => { setIsEditing(true); setEditValue(formatTime(time)); }}>
            ⏱️ {formatTime(time)}
          </span>
          <button onClick={() => setIsRunning(!isRunning)} style={{
            background: isRunning ? '#ef4444' : '#22c55e',
            border: 'none',
            padding: '4px 12px',
            borderRadius: 20,
            color: 'white',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600
          }}>
            {isRunning ? '⏸' : '▶'}
          </button>
        </>
      )}
    </div>
  );
}

// Étoiles
function StarRating({ rating, onRatingChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => onRatingChange(star)}
          style={{
            cursor: 'pointer',
            fontSize: 16,
            color: star <= rating ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            transition: '0.1s'
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// Carte de jeu
function GameCard({ game, onClick, currentTheme, showStatus = false, status = null }) {
  const statusInfo = GAME_STATUS.find(s => s.id === status);
  
  return (
    <div
      onClick={() => onClick(game)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 200,
        minWidth: 200,
        background: currentTheme.card,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: `1px solid ${currentTheme.border}`,
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 10px 20px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {showStatus && statusInfo && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 20,
          padding: '4px 8px',
          fontSize: 12,
          zIndex: 2
        }}>
          {statusInfo.emoji}
        </div>
      )}
      <div style={{ flexShrink: 0 }}>
        {game.image ? (
          <img src={game.image} alt={game.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: 120, background: currentTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎮</div>
        )}
      </div>
      <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</div>
        <div style={{ color: currentTheme.muted, fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
          <span>{game.released?.split('-')[0] || '?'}</span>
          <span>⭐ {game.rating?.toFixed(1) || '?'}</span>
        </div>
        {game.genres && game.genres.length > 0 && (
          <div style={{ color: currentTheme.accent, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {game.genres.slice(0, 2).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

// Page Accueil
function HomePage({ onGameClick, currentTheme, backlog }) {
  const [categoryGames, setCategoryGames] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryAllGames, setCategoryAllGames] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryHasMore, setCategoryHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [loadingSearchMore, setLoadingSearchMore] = useState(false);

  // Gestion touche ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showCategoryModal) setShowCategoryModal(false);
        if (showSearchModal) setShowSearchModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCategoryModal, showSearchModal]);

  // Chargement initial des catégories
  useEffect(() => {
    const loadAllCategories = async () => {
      for (const cat of CATEGORIES) {
        setLoading(prev => ({ ...prev, [cat.id]: true }));
        const { games } = await getGamesByCategory(cat.id, 1);
        setCategoryGames(prev => ({ ...prev, [cat.id]: games.slice(0, 12) }));
        setLoading(prev => ({ ...prev, [cat.id]: false }));
      }
    };
    loadAllCategories();
  }, []);

  // Recherche
  const handleSearch = async (query, page = 1) => {
    if (!query.trim()) return;
    setSearching(true);
    const { games, nextPage } = await searchGames(query, page);
    if (page === 1) {
      setSearchResults(games);
    } else {
      setSearchResults(prev => [...prev, ...games]);
    }
    setSearchHasMore(nextPage !== null);
    setSearchPage(nextPage || 1);
    setSearching(false);
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    await handleSearch(searchQuery, 1);
    setShowSearchModal(true);
  };

  const loadMoreSearch = async () => {
    if (loadingSearchMore || !searchHasMore) return;
    setLoadingSearchMore(true);
    const { games, nextPage } = await searchGames(searchQuery, searchPage);
    setSearchResults(prev => [...prev, ...games]);
    setSearchHasMore(nextPage !== null);
    setSearchPage(nextPage || searchPage);
    setLoadingSearchMore(false);
  };

  const openCategoryModal = async (cat) => {
    setSelectedCategory(cat);
    setShowCategoryModal(true);
    setCategoryPage(1);
    setLoadingMore(true);
    const { games, nextPage } = await getGamesByCategory(cat.id, 1);
    setCategoryAllGames(games);
    setCategoryHasMore(nextPage !== null);
    setLoadingMore(false);
  };

  const loadMoreCategory = async () => {
    if (loadingMore || !categoryHasMore || !selectedCategory) return;
    setLoadingMore(true);
    const { games, nextPage } = await getGamesByCategory(selectedCategory.id, categoryPage + 1);
    setCategoryAllGames(prev => [...prev, ...games]);
    setCategoryHasMore(nextPage !== null);
    setCategoryPage(prev => prev + 1);
    setLoadingMore(false);
  };

  const getGameStatus = (gameId) => {
    const game = backlog.find(g => g.id === gameId);
    return game ? game.status : null;
  };

  // Modal catégorie
  if (showCategoryModal && selectedCategory) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <h2 style={{ fontSize: 28, color: currentTheme.accent }}>{selectedCategory.name}</h2>
            <button onClick={() => setShowCategoryModal(false)} style={{
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 12,
              padding: '10px 24px',
              cursor: 'pointer',
              color: currentTheme.text,
              fontSize: 14
            }}>✕ Fermer</button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {categoryAllGames.map(game => (
              <GameCard 
                key={game.id} 
                game={game} 
                onClick={onGameClick} 
                currentTheme={currentTheme}
                showStatus={true}
                status={getGameStatus(game.id)}
              />
            ))}
          </div>
          
          {categoryHasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <button
                onClick={loadMoreCategory}
                disabled={loadingMore}
                style={{
                  background: currentTheme.card,
                  border: `1px solid ${currentTheme.accent}`,
                  borderRadius: 50,
                  padding: '12px 32px',
                  cursor: loadingMore ? 'wait' : 'pointer',
                  color: currentTheme.text,
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                {loadingMore ? 'Chargement...' : '+ Charger plus de jeux'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modal recherche
  if (showSearchModal) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, overflow: 'auto', padding: 20 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <h2 style={{ fontSize: 28, color: currentTheme.accent }}>🔍 Résultats pour "{searchQuery}"</h2>
            <button onClick={() => setShowSearchModal(false)} style={{
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 12,
              padding: '10px 24px',
              cursor: 'pointer',
              color: currentTheme.text,
              fontSize: 14
            }}>✕ Fermer</button>
          </div>
          
          {searching && searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>Recherche en cours...</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                {searchResults.map(game => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    onClick={onGameClick} 
                    currentTheme={currentTheme}
                    showStatus={true}
                    status={getGameStatus(game.id)}
                  />
                ))}
              </div>
              
              {searchHasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                  <button
                    onClick={loadMoreSearch}
                    disabled={loadingSearchMore}
                    style={{
                      background: currentTheme.card,
                      border: `1px solid ${currentTheme.accent}`,
                      borderRadius: 50,
                      padding: '12px 32px',
                      cursor: loadingSearchMore ? 'wait' : 'pointer',
                      color: currentTheme.text,
                      fontSize: 14,
                      fontWeight: 500
                    }}
                  >
                    {loadingSearchMore ? 'Chargement...' : '+ Charger plus de résultats'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Barre de recherche */}
      <div style={{ marginBottom: 32, display: 'flex', gap: 12 }}>
        <input
          type="text"
          placeholder="🔍 Rechercher un jeu (Titre, genre...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: 50,
            border: `2px solid ${currentTheme.border}`,
            background: currentTheme.card,
            color: currentTheme.text,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = currentTheme.accent}
          onBlur={(e) => e.target.style.borderColor = currentTheme.border}
        />
        <button
          onClick={handleSearchSubmit}
          style={{
            background: currentTheme.accent,
            border: 'none',
            borderRadius: 50,
            padding: '0 24px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14
          }}
        >
          Chercher
        </button>
      </div>

      {/* Catégories en défilement horizontal */}
      {CATEGORIES.map((cat) => {
        const games = categoryGames[cat.id] || [];
        
        if (games.length === 0 && loading[cat.id]) {
          return (
            <div key={cat.id} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, marginBottom: 16, color: currentTheme.accent }}>{cat.name}</h2>
              <div style={{ textAlign: 'center', padding: 40, color: currentTheme.muted }}>Chargement...</div>
            </div>
          );
        }
        
        if (games.length === 0) return null;
        
        return (
          <div key={cat.id} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, color: currentTheme.accent }}>{cat.name}</h2>
              <button
                onClick={() => openCategoryModal(cat)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 50,
                  padding: '8px 20px',
                  cursor: 'pointer',
                  color: currentTheme.text,
                  fontSize: 13,
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Voir tout →
              </button>
            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              overflowX: 'auto', 
              gap: 16, 
              paddingBottom: 16,
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch'
            }}>
              {games.map(game => (
                <GameCard 
                  key={game.id} 
                  game={game} 
                  onClick={onGameClick} 
                  currentTheme={currentTheme}
                  showStatus={true}
                  status={getGameStatus(game.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Page Sorties
function UpcomingPage({ onGameClick, currentTheme, backlog }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUpcomingGames().then(games => {
      setGames(games);
      setLoading(false);
    });
  }, []);

  const getGameStatus = (gameId) => {
    const game = backlog.find(g => g.id === gameId);
    return game ? game.status : null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date inconnue';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22 }}>📅 Prochaines sorties (3 mois)</h2>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>Chargement...</div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: currentTheme.muted }}>Aucune sortie prévue</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          {games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onClick={onGameClick}
              currentTheme={currentTheme}
              showStatus={true}
              status={getGameStatus(game.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Page Bibliothèque
function LibraryPage({ backlog, onUpdateRating, onUpdateTime, onUpdateStatus, currentTheme }) {
  const [filter, setFilter] = useState('all');

  const filteredGames = filter === 'all' ? backlog : backlog.filter(g => g.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{ background: filter === 'all' ? currentTheme.accent : 'transparent', border: `1px solid ${currentTheme.border}`, borderRadius: 50, padding: '8px 20px', cursor: 'pointer', color: filter === 'all' ? 'white' : currentTheme.text, fontSize: 13 }}>📦 Tous ({backlog.length})</button>
        {GAME_STATUS.map(status => (
          <button key={status.id} onClick={() => setFilter(status.id)} style={{ background: filter === status.id ? currentTheme.accent : 'transparent', border: `1px solid ${currentTheme.border}`, borderRadius: 50, padding: '8px 20px', cursor: 'pointer', color: filter === status.id ? 'white' : currentTheme.text, fontSize: 13 }}>
            {status.emoji} {status.label} ({backlog.filter(g => g.status === status.id).length})
          </button>
        ))}
      </div>

      {filteredGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: currentTheme.muted, background: currentTheme.card, borderRadius: 20 }}>
          🎮 Aucun jeu dans cette catégorie
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredGames.map((game) => (
            <div key={game.id} style={{
              background: currentTheme.card,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${currentTheme.border}`,
              animation: 'fadeIn 0.3s ease-out'
            }}>
              {game.image ? (
                <img src={game.image} alt={game.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: 160, background: currentTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎮</div>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{game.name}</div>
                    {game.genres && (
                      <div style={{ color: currentTheme.muted, fontSize: 11, marginTop: 2 }}>{game.genres.slice(0, 2).join(', ')}</div>
                    )}
                  </div>
                  <select
                    value={game.status || 'backlog'}
                    onChange={(e) => onUpdateStatus(game.id, e.target.value)}
                    style={{
                      background: currentTheme.bg,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: 20,
                      padding: '6px 12px',
                      fontSize: 12,
                      color: currentTheme.text,
                      cursor: 'pointer'
                    }}
                  >
                    {GAME_STATUS.map(s => (
                      <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                    ))}
                  </select>
                </div>
                <StarRating rating={game.userRating || 0} onRatingChange={(rating) => onUpdateRating(game.id, rating)} />
                <div style={{ marginTop: 12 }}>
                  <Timer initialTime={game.time || 0} onTimeChange={(newTime) => onUpdateTime(game.id, newTime)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Page Random
function RandomPage({ onGameClick, currentTheme }) {
  const [randomGame, setRandomGame] = useState(null);
  const [loading, setLoading] = useState(false);

  const getRandomGameHandler = async () => {
    setLoading(true);
    const game = await getRandomGame();
    setRandomGame(game);
    setLoading(false);
  };

  useEffect(() => {
    getRandomGameHandler();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22 }}>🎲 Surprise moi !</h2>
      
      <div style={{ marginBottom: 24 }}>
        <button 
          onClick={getRandomGameHandler} 
          disabled={loading}
          style={{
            background: currentTheme.accent,
            border: 'none',
            borderRadius: 50,
            padding: '12px 32px',
            color: 'white',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
            fontSize: 16,
            transition: '0.2s'
          }}
        >
          🎲 {loading ? 'Recherche...' : 'Nouvelle suggestion'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ 
            width: 60, 
            height: 60, 
            border: `3px solid ${currentTheme.border}`,
            borderTopColor: currentTheme.accent,
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: currentTheme.muted }}>Je cherche un jeu pour toi...</div>
        </div>
      ) : randomGame ? (
        <div style={{
          background: currentTheme.card,
          borderRadius: 20,
          overflow: 'hidden',
          border: `2px solid ${currentTheme.accent}`,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {randomGame.image && (
              <img src={randomGame.image} alt={randomGame.name} style={{ width: '100%', maxWidth: 400, height: 'auto', objectFit: 'cover' }} />
            )}
            <div style={{ flex: 1, padding: 24 }}>
              <h2 style={{ fontSize: 28, marginBottom: 12 }}>{randomGame.name}</h2>
              <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                <span>⭐ {randomGame.rating?.toFixed(1) || '?'}/5</span>
                <span>📅 {randomGame.released?.split('-')[0] || 'Date inconnue'}</span>
                <span>🎮 {randomGame.genres?.join(', ') || 'Genre inconnu'}</span>
              </div>
              <p style={{ color: currentTheme.muted, lineHeight: 1.6, fontSize: 14 }}>{randomGame.description?.substring(0, 350)}...</p>
              <button
                onClick={() => onGameClick(randomGame)}
                style={{
                  marginTop: 24,
                  background: currentTheme.accent,
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: 50,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  transition: '0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                + Ajouter à ma bibliothèque
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: currentTheme.muted }}>Aucun jeu trouvé</div>
      )}
    </div>
  );
}

// Composant principal
function GameTracker({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [backlog, setBacklog] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(user.theme || 'blue');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedGameModal, setSelectedGameModal] = useState(null);
  const [userName, setUserName] = useState(user.name?.substring(0, 15) || 'Joueur');
  const [avatar, setAvatar] = useState(user.avatar || '🎮');

  // Gestion touche ESC pour le modal d'ajout
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && selectedGameModal) {
        setSelectedGameModal(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedGameModal]);

  const avatars = ['🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🐉', '⚡', '🔥', '💎', '🌟', '🍕', '👾', '🤖', '🧙', '🏆', '🐱', '🐶', '🦊', '🐸'];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await loadUserData(user.id);
      if (data) {
        setBacklog(data.backlog || []);
        setTheme(data.theme || 'blue');
        setIsDarkMode(data.isDarkMode !== false);
        setUserName((data.userName || user.name || 'Joueur').substring(0, 15));
        setAvatar(data.avatar || avatars[Math.floor(Math.random() * avatars.length)]);
      }
      setLoading(false);
    };
    loadData();
  }, [user.id]);

  useEffect(() => {
    if (!loading && user.id) {
      saveUserData(user.id, { 
        backlog, theme, isDarkMode, userName, avatar,
        name: userName, userId: user.id
      });
    }
  }, [backlog, theme, isDarkMode, userName, avatar, user.id, loading]);

  const addGameWithStatus = (game, status) => {
    if (backlog.find((g) => g.id === game.id)) {
      alert('Ce jeu est déjà dans ta bibliothèque !');
      return;
    }
    const newGame = { ...game, addedAt: Date.now(), time: 0, userRating: 0, status: status };
    setBacklog([...backlog, newGame]);
    setSelectedGameModal(null);
  };

  const updateGameStatus = (gameId, status) => {
    setBacklog(prev => prev.map(game =>
      game.id === gameId ? { ...game, status } : game
    ));
  };

  const updateGameTime = (gameId, newTime) => {
    setBacklog(prev => prev.map(game =>
      game.id === gameId ? { ...game, time: newTime } : game
    ));
  };

  const updateGameRating = (gameId, rating) => {
    setBacklog(prev => prev.map(game =>
      game.id === gameId ? { ...game, userRating: rating } : game
    ));
  };

  const exportAllData = () => {
    const exportData = { user: { name: userName }, backlog, preferences: { theme, isDarkMode }, version: APP_VERSION };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stockit-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.backlog && Array.isArray(imported.backlog)) {
          setBacklog(imported.backlog);
          if (imported.preferences) {
            setTheme(imported.preferences.theme || 'blue');
            setIsDarkMode(imported.preferences.isDarkMode !== false);
          }
          alert(`✅ ${imported.backlog.length} jeux importés !`);
        } else {
          alert('❌ Format invalide');
        }
      } catch (err) {
        alert('❌ Fichier invalide');
      }
    };
    reader.readAsText(file);
  };

  const currentTheme = isDarkMode ? THEMES[theme] : {
    ...THEMES[theme],
    bg: '#f3f4f6',
    card: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
    border: '#e5e7eb'
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: currentTheme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentTheme.text }}>Chargement...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: currentTheme.bg, color: currentTheme.text, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{keyframes}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: THEMES[theme]?.accent || '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24
            }}>
              {avatar}
            </div>
            <div>
              <h1 style={{ fontSize: 26, margin: 0, fontWeight: 700 }}>📦 <span style={{ color: currentTheme.accent }}>Stockit</span></h1>
              <div style={{ color: currentTheme.muted, fontSize: 13 }}>{userName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { setActiveTab('home'); }} style={{
              background: activeTab === 'home' ? currentTheme.accent : 'transparent',
              border: `1px solid ${activeTab === 'home' ? currentTheme.accent : currentTheme.border}`,
              borderRadius: 50,
              padding: '8px 18px',
              cursor: 'pointer',
              color: activeTab === 'home' ? 'white' : currentTheme.text,
              fontSize: 13,
              fontWeight: 500
            }}>🏠 Accueil</button>
            <button onClick={() => setActiveTab('upcoming')} style={{
              background: activeTab === 'upcoming' ? currentTheme.accent : 'transparent',
              border: `1px solid ${activeTab === 'upcoming' ? currentTheme.accent : currentTheme.border}`,
              borderRadius: 50,
              padding: '8px 18px',
              cursor: 'pointer',
              color: activeTab === 'upcoming' ? 'white' : currentTheme.text,
              fontSize: 13,
              fontWeight: 500
            }}>📅 Sorties</button>
            <button onClick={() => setActiveTab('library')} style={{
              background: activeTab === 'library' ? currentTheme.accent : 'transparent',
              border: `1px solid ${activeTab === 'library' ? currentTheme.accent : currentTheme.border}`,
              borderRadius: 50,
              padding: '8px 18px',
              cursor: 'pointer',
              color: activeTab === 'library' ? 'white' : currentTheme.text,
              fontSize: 13,
              fontWeight: 500
            }}>📚 Backlog</button>
            <button onClick={() => setActiveTab('random')} style={{
              background: activeTab === 'random' ? currentTheme.accent : 'transparent',
              border: `1px solid ${activeTab === 'random' ? currentTheme.accent : currentTheme.border}`,
              borderRadius: 50,
              padding: '8px 18px',
              cursor: 'pointer',
              color: activeTab === 'random' ? 'white' : currentTheme.text,
              fontSize: 13,
              fontWeight: 500
            }}>🎲 Surprise</button>
            <button onClick={() => setShowSettings(!showSettings)} style={{
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 50,
              padding: '8px 18px',
              cursor: 'pointer',
              color: currentTheme.text,
              fontSize: 13
            }}>⚙️</button>
            <button onClick={onLogout} style={{
              background: currentTheme.card,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 50,
              padding: '8px 18px',
              cursor: 'pointer',
              color: currentTheme.text,
              fontSize: 13
            }}>🚪</button>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div style={{ background: currentTheme.card, borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: currentTheme.muted }}>Nom</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value.substring(0, 15))}
                  maxLength={15}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${currentTheme.border}`,
                    background: currentTheme.bg,
                    color: currentTheme.text,
                    fontSize: 13
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: currentTheme.muted }}>Avatar</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {avatars.slice(0, 10).map(a => (
                    <button key={a} onClick={() => setAvatar(a)} style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: currentTheme.bg,
                      border: avatar === a ? `2px solid ${currentTheme.accent}` : `1px solid ${currentTheme.border}`,
                      fontSize: 18,
                      cursor: 'pointer'
                    }}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: currentTheme.muted }}>Couleur</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {Object.keys(THEMES).slice(0, 8).map(key => (
                    <button key={key} onClick={() => setTheme(key)} style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: THEMES[key].accent,
                      border: theme === key ? '2px solid white' : 'none',
                      cursor: 'pointer'
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: currentTheme.muted }}>Mode</label>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{
                  background: currentTheme.card,
                  border: `1px solid ${currentTheme.accent}`,
                  borderRadius: 8,
                  padding: '8px',
                  cursor: 'pointer',
                  color: currentTheme.text,
                  marginTop: 4,
                  width: '100%',
                  fontSize: 13
                }}>{isDarkMode ? '🌙 Sombre' : '☀️ Clair'}</button>
              </div>
              <div>
                <label style={{ fontSize: 11, color: currentTheme.muted }}>Sauvegarde</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={exportAllData} style={{ background: currentTheme.accent, border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white', cursor: 'pointer', fontSize: 12 }}>📥 Exporter</button>
                  <label style={{ background: currentTheme.card, border: `1px solid ${currentTheme.accent}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>
                    📤 Importer
                    <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenu */}
        {activeTab === 'home' && (
          <HomePage 
            onGameClick={(game) => setSelectedGameModal(game)} 
            currentTheme={currentTheme} 
            backlog={backlog}
          />
        )}
        {activeTab === 'upcoming' && <UpcomingPage onGameClick={(game) => setSelectedGameModal(game)} currentTheme={currentTheme} backlog={backlog} />}
        {activeTab === 'library' && (
          <LibraryPage 
            backlog={backlog}
            onUpdateRating={updateGameRating}
            onUpdateTime={updateGameTime}
            onUpdateStatus={updateGameStatus}
            currentTheme={currentTheme}
          />
        )}
        {activeTab === 'random' && <RandomPage onGameClick={(game) => setSelectedGameModal(game)} currentTheme={currentTheme} />}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${currentTheme.border}`, textAlign: 'center', color: currentTheme.muted, fontSize: 12 }}>
          Stockit v{APP_VERSION} • Suivi de jeux vidéo • Données RAWG
        </div>

        {/* Modal d'ajout */}
        {selectedGameModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: currentTheme.card, borderRadius: 20, maxWidth: 450, width: '100%', overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
              {selectedGameModal.image && <img src={selectedGameModal.image} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
              <div style={{ padding: 24 }}>
                <h2 style={{ marginBottom: 8, fontSize: 22 }}>{selectedGameModal.name}</h2>
                <div style={{ color: currentTheme.muted, marginBottom: 12, fontSize: 13 }}>⭐ {selectedGameModal.rating?.toFixed(1)} • 📅 {selectedGameModal.released?.split('-')[0]}</div>
                {selectedGameModal.genres && (
                  <div style={{ color: currentTheme.accent, fontSize: 12, marginBottom: 20 }}>{selectedGameModal.genres.join(', ')}</div>
                )}
                
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, marginBottom: 12, color: currentTheme.muted }}>📌 Choisis un statut pour ce jeu</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {GAME_STATUS.map(status => (
                      <button
                        key={status.id}
                        onClick={() => addGameWithStatus(selectedGameModal, status.id)}
                        style={{
                          background: currentTheme.card,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: 50,
                          padding: '12px 20px',
                          cursor: 'pointer',
                          color: currentTheme.text,
                          fontSize: 14,
                          textAlign: 'left',
                          transition: '0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = currentTheme.card}
                      >
                        <span style={{ fontSize: 20, width: 28 }}>{status.emoji}</span>
                        <span style={{ fontWeight: 500 }}>{status.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => setSelectedGameModal(null)} style={{
                  width: '100%',
                  background: 'transparent',
                  border: `1px solid ${currentTheme.border}`,
                  padding: 12,
                  borderRadius: 50,
                  cursor: 'pointer',
                  color: currentTheme.text,
                  fontSize: 14
                }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sélection des profils
function ProfileSelector({ onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const avatars = ['🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🐉', '⚡', '🔥', '💎', '🌟', '🍕', '👾', '🤖', '🧙', '🏆', '🐱', '🐶', '🦊', '🐸'];

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() { setLoading(true); const allUsers = await getAllUsers(); setUsers(allUsers); setLoading(false); }
  async function createUser() {
    if (!newUserName.trim()) return;
    const userId = `user_${Date.now()}`;
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    const randomTheme = Object.keys(THEMES)[Math.floor(Math.random() * Object.keys(THEMES).length)];
    await saveUserData(userId, { 
      userId, name: newUserName.trim().substring(0, 15), backlog: [], theme: randomTheme, isDarkMode: true,
      userName: newUserName.trim().substring(0, 15), avatar: randomAvatar
    });
    setNewUserName(''); setShowNewUser(false); loadUsers();
  }
  async function deleteUserHandler(userId, e) { e.stopPropagation(); if (confirm('Supprimer ce profil ?')) { await deleteUser(userId); loadUsers(); } }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ textAlign: 'center', maxWidth: 800 }}>
        <h1 style={{ fontSize: 44, marginBottom: 40, fontFamily: "'Inter', sans-serif" }}>📦 <span style={{ color: '#3b82f6' }}>Stockit</span></h1>
        <h2 style={{ color: 'white', marginBottom: 32, fontSize: 20 }}>Qui joue ?</h2>
        {loading && <div style={{ color: 'white' }}>Chargement...</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
          {users.map(user => (
            <div key={user.id} onClick={() => onSelectUser({ id: user.id, name: user.name, theme: user.theme })} style={{ textAlign: 'center', cursor: 'pointer', transition: '0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ width: 110, height: 110, borderRadius: 55, background: THEMES[user.theme]?.accent || '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 10, position: 'relative' }}>
                {user.avatar || '🎮'}
                <button onClick={(e) => deleteUserHandler(user.id, e)} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
              <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{user.name}</div>
            </div>
          ))}
          {!showNewUser ? (
            <div onClick={() => setShowNewUser(true)} style={{ width: 110, height: 110, borderRadius: 55, background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, cursor: 'pointer' }}>+</div>
          ) : (
            <div style={{ width: 240, padding: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
              <input 
                autoFocus 
                placeholder="Nom (max 15)" 
                maxLength={15} 
                value={newUserName} 
                onChange={(e) => setNewUserName(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && createUser()}
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  borderRadius: 10, 
                  border: 'none', 
                  background: 'rgba(255,255,255,0.2)', 
                  color: 'white', 
                  marginBottom: 12, 
                  outline: 'none',
                  boxSizing: 'border-box'
                }} 
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={createUser} style={{ background: '#3b82f6', border: 'none', padding: '10px 20px', borderRadius: 10, color: 'white', cursor: 'pointer' }}>Créer</button>
                <button onClick={() => setShowNewUser(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', padding: '10px 20px', borderRadius: 10, color: 'white', cursor: 'pointer' }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { const saved = localStorage.getItem('currentUser'); if (saved) { try { setCurrentUser(JSON.parse(saved)); } catch(e) {} } }, []);
  const handleSelectUser = (user) => { setCurrentUser(user); localStorage.setItem('currentUser', JSON.stringify(user)); };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('currentUser'); };
  if (!currentUser) return <ProfileSelector onSelectUser={handleSelectUser} />;
  return <GameTracker user={currentUser} onLogout={handleLogout} />;
}