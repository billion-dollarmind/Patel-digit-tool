import { useState, useEffect } from 'react';

export interface PredictionRecord {
  id: string;
  timestamp: number;
  symbol: string;
  predictionType: 'EVEN' | 'ODD' | 'OVER' | 'UNDER' | 'MATCH';
  prediction: string | number;
  confidence: number;
  actualResult?: string | number;
  isCorrect?: boolean;
  barrier?: number;
}

export interface PerformanceStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  bestStreak: number;
  currentStreak: number;
  worstStreak: number;
  averageConfidence: number;
  highConfidenceAccuracy: number; // >80% confidence
  mediumConfidenceAccuracy: number; // 60-80% confidence
  lowConfidenceAccuracy: number; // <60% confidence
  todayStats: {
    predictions: number;
    accuracy: number;
  };
  weekStats: {
    predictions: number;
    accuracy: number;
  };
}

export const usePerformanceTracking = () => {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalPredictions: 0,
    correctPredictions: 0,
    accuracy: 0,
    bestStreak: 0,
    currentStreak: 0,
    worstStreak: 0,
    averageConfidence: 0,
    highConfidenceAccuracy: 0,
    mediumConfidenceAccuracy: 0,
    lowConfidenceAccuracy: 0,
    todayStats: { predictions: 0, accuracy: 0 },
    weekStats: { predictions: 0, accuracy: 0 }
  });

  // Load predictions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('prediction-history');
    if (stored) {
      try {
        const parsedPredictions = JSON.parse(stored);
        setPredictions(parsedPredictions);
      } catch (error) {
        console.error('Error loading prediction history:', error);
      }
    }
  }, []);

  // Calculate stats whenever predictions change
  useEffect(() => {
    calculateStats();
  }, [predictions]);

  const calculateStats = () => {
    if (predictions.length === 0) return;

    const completedPredictions = predictions.filter(p => p.actualResult !== undefined);
    const correctPredictions = completedPredictions.filter(p => p.isCorrect);
    
    // Basic stats
    const totalPredictions = completedPredictions.length;
    const accuracy = totalPredictions > 0 ? (correctPredictions.length / totalPredictions) * 100 : 0;
    const averageConfidence = completedPredictions.reduce((sum, p) => sum + p.confidence, 0) / totalPredictions || 0;

    // Confidence-based accuracy
    const highConfPredictions = completedPredictions.filter(p => p.confidence > 80);
    const mediumConfPredictions = completedPredictions.filter(p => p.confidence >= 60 && p.confidence <= 80);
    const lowConfPredictions = completedPredictions.filter(p => p.confidence < 60);

    const highConfidenceAccuracy = highConfPredictions.length > 0 
      ? (highConfPredictions.filter(p => p.isCorrect).length / highConfPredictions.length) * 100 : 0;
    const mediumConfidenceAccuracy = mediumConfPredictions.length > 0 
      ? (mediumConfPredictions.filter(p => p.isCorrect).length / mediumConfPredictions.length) * 100 : 0;
    const lowConfidenceAccuracy = lowConfPredictions.length > 0 
      ? (lowConfPredictions.filter(p => p.isCorrect).length / lowConfPredictions.length) * 100 : 0;

    // Streak calculations
    let currentStreak = 0;
    let bestStreak = 0;
    let worstStreak = 0;
    let tempStreak = 0;
    let tempWorstStreak = 0;

    for (let i = completedPredictions.length - 1; i >= 0; i--) {
      const prediction = completedPredictions[i];
      
      if (prediction.isCorrect) {
        tempStreak++;
        tempWorstStreak = 0;
        if (i === completedPredictions.length - 1) currentStreak = tempStreak;
      } else {
        tempWorstStreak++;
        tempStreak = 0;
        if (i === completedPredictions.length - 1) currentStreak = -tempWorstStreak;
      }
      
      bestStreak = Math.max(bestStreak, tempStreak);
      worstStreak = Math.max(worstStreak, tempWorstStreak);
    }

    // Time-based stats
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const todayPredictions = completedPredictions.filter(p => p.timestamp > oneDayAgo);
    const weekPredictions = completedPredictions.filter(p => p.timestamp > oneWeekAgo);

    const todayAccuracy = todayPredictions.length > 0 
      ? (todayPredictions.filter(p => p.isCorrect).length / todayPredictions.length) * 100 : 0;
    const weekAccuracy = weekPredictions.length > 0 
      ? (weekPredictions.filter(p => p.isCorrect).length / weekPredictions.length) * 100 : 0;

    setStats({
      totalPredictions,
      correctPredictions: correctPredictions.length,
      accuracy: Math.round(accuracy * 100) / 100,
      bestStreak,
      currentStreak,
      worstStreak,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      highConfidenceAccuracy: Math.round(highConfidenceAccuracy * 100) / 100,
      mediumConfidenceAccuracy: Math.round(mediumConfidenceAccuracy * 100) / 100,
      lowConfidenceAccuracy: Math.round(lowConfidenceAccuracy * 100) / 100,
      todayStats: {
        predictions: todayPredictions.length,
        accuracy: Math.round(todayAccuracy * 100) / 100
      },
      weekStats: {
        predictions: weekPredictions.length,
        accuracy: Math.round(weekAccuracy * 100) / 100
      }
    });
  };

  const addPrediction = (prediction: Omit<PredictionRecord, 'id' | 'timestamp'>) => {
    const newPrediction: PredictionRecord = {
      ...prediction,
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const updatedPredictions = [...predictions, newPrediction];
    setPredictions(updatedPredictions);
    
    // Store in localStorage
    localStorage.setItem('prediction-history', JSON.stringify(updatedPredictions));
  };

  const updatePredictionResult = (predictionId: string, actualResult: string | number, isCorrect: boolean) => {
    const updatedPredictions = predictions.map(p => 
      p.id === predictionId 
        ? { ...p, actualResult, isCorrect }
        : p
    );
    
    setPredictions(updatedPredictions);
    localStorage.setItem('prediction-history', JSON.stringify(updatedPredictions));
  };

  const clearHistory = () => {
    setPredictions([]);
    localStorage.removeItem('prediction-history');
  };

  return {
    predictions,
    stats,
    addPrediction,
    updatePredictionResult,
    clearHistory
  };
};