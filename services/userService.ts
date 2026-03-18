import { UserStats } from '../types';

const STATS_KEY = 'cogniquest_user_stats';

export const getUserStats = (): UserStats => {
  const stored = localStorage.getItem(STATS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Return default if error
    }
  }
  
  return {
    xp: 0,
    streak: 0,
    lastStudyDate: ''
  };
};

export const saveUserStats = (stats: UserStats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const addXp = (amount: number) => {
  const stats = getUserStats();
  stats.xp += amount;
  
  // Update streak logic
  const today = new Date().toISOString().split('T')[0];
  
  if (stats.lastStudyDate) {
    const lastDate = new Date(stats.lastStudyDate);
    const todayDate = new Date(today);
    
    // Calculate difference in days
    const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays === 1) {
      // Studied exact next day, increase streak
      stats.streak += 1;
    } else if (diffDays > 1) {
      // Missed a day, reset streak to 1
      stats.streak = 1;
    }
    // if diffDays === 0, already studied today, keep streak as is
  } else {
    // First time studying
    stats.streak = 1;
  }

  stats.lastStudyDate = today;
  saveUserStats(stats);
  
  return stats;
};

// Calculate level based on XP (e.g. 100 XP per level)
export const calculateLevel = (xp: number) => {
  return Math.floor(xp / 100) + 1;
};
