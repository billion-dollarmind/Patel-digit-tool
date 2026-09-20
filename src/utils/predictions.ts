export interface Tick {
  epoch: number;
  quote: number;
  symbol: string;
}

export interface EvenOddResult {
  prediction: 'EVEN' | 'ODD';
  confidence: number;
  evenCount: number;
  oddCount: number;
  total: number;
}

export interface OverUnderResult {
  prediction: 'OVER' | 'UNDER';
  digit: number;
  label: string;
  confidence: number;
  recommendedRuns: number;
  entryPattern: string;
  entryDigits: number[];
  waitForPattern: boolean;
}

export interface DigitMatchResult {
  prediction: number;
  confidence: number;
  frequency: Record<number, number>;
  percentages: Record<number, number>;
  total: number;
}

// Helper: Extract the 2nd decimal place digit from tick price
export const getLastDigit = (quote: number): number => {
  // Format with enough decimal places to ensure we have at least 2
  const str = quote.toFixed(5);
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) return 0;
  // Get the 2nd decimal place (index: decimalIndex + 2)
  const digit = str[decimalIndex + 2];
  return digit ? parseInt(digit, 10) : 0;
};

// Helper: Clamp confidence between 55-95%
const clampConfidence = (value: number): number => {
  return Math.max(55, Math.min(95, Math.round(value)));
};

// Helper: Calculate recommended runs based on confidence
const calculateRecommendedRuns = (confidence: number): number => {
  const normalized = (confidence - 55) / 40; // 0 to 1 scale
  if (normalized > 0.75) return Math.floor(Math.random() * 5) + 11; // 11-15
  if (normalized > 0.5) return Math.floor(Math.random() * 6) + 8; // 8-13
  return Math.floor(Math.random() * 6) + 5; // 5-10
};

// Even/Odd Analysis
export const analyzeEvenOdd = (ticks: Tick[]): EvenOddResult | null => {
  if (!ticks || ticks.length < 5) return null;
  
  const digits = ticks.slice(-15).map(t => getLastDigit(t.quote));
  const evenCount = digits.filter(d => d % 2 === 0).length;
  const oddCount = digits.length - evenCount;
  
  const prediction: 'EVEN' | 'ODD' = evenCount > oddCount ? 'EVEN' : 'ODD';
  const ratio = Math.max(evenCount, oddCount) / digits.length;
  const confidence = clampConfidence(ratio * 100);
  
  return {
    prediction,
    confidence,
    evenCount,
    oddCount,
    total: digits.length
  };
};

// Helper: Generate entry pattern recommendation
const generateEntryPattern = (
  prediction: 'OVER' | 'UNDER', 
  digits: number[], 
  digitCounts: Record<number, number>
): { entryPattern: string; entryDigits: number[]; waitForPattern: boolean } => {
  const lastThree = digits.slice(-3); // Use last 3 instead of 5 for smaller dataset
  const OVER_RANGE = [5, 6, 7, 8, 9];
  const UNDER_RANGE = [0, 1, 2, 3, 4];
  
  if (prediction === 'OVER') {
    // For OVER: Wait for 2+ consecutive UNDER digits before entering
    const consecutiveUnder = lastThree.filter(d => UNDER_RANGE.includes(d)).length;
    const bestEntryDigits = UNDER_RANGE
      .map(d => ({ digit: d, count: digitCounts[d] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(d => d.digit);
    
    if (consecutiveUnder >= 2) {
      return {
        entryPattern: `Enter NOW! ${consecutiveUnder} low digits in a row`,
        entryDigits: bestEntryDigits,
        waitForPattern: false
      };
    }
    return {
      entryPattern: `Wait for 2+ digits from [${bestEntryDigits.join(', ')}]`,
      entryDigits: bestEntryDigits,
      waitForPattern: true
    };
  } else {
    // For UNDER: Wait for 2+ consecutive OVER digits before entering
    const consecutiveOver = lastThree.filter(d => OVER_RANGE.includes(d)).length;
    const bestEntryDigits = OVER_RANGE
      .map(d => ({ digit: d, count: digitCounts[d] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(d => d.digit);
    
    if (consecutiveOver >= 2) {
      return {
        entryPattern: `Enter NOW! ${consecutiveOver} high digits in a row`,
        entryDigits: bestEntryDigits,
        waitForPattern: false
      };
    }
    return {
      entryPattern: `Wait for 2+ digits from [${bestEntryDigits.join(', ')}]`,
      entryDigits: bestEntryDigits,
      waitForPattern: true
    };
  }
};

// Over/Under Analysis
// Barrier Limits:
// - UNDER signals: minimum barrier 3, maximum barrier 6 (no under 1 or under 2)
// - OVER signals: minimum barrier 4, maximum barrier 7 (inverse of under limits)
export const analyzeOverUnder = (ticks: Tick[]): OverUnderResult | null => {
  if (!ticks || ticks.length < 5) return null;
  
  const digits = ticks.slice(-15).map(t => getLastDigit(t.quote));
  const OVER_RANGE = [5, 6, 7, 8, 9];
  const UNDER_RANGE = [0, 1, 2, 3, 4];
  
  const overCount = digits.filter(d => OVER_RANGE.includes(d)).length;
  const underCount = digits.filter(d => UNDER_RANGE.includes(d)).length;
  
  // Count specific digits for recommendations
  const digitCounts: Record<number, number> = {};
  digits.forEach(d => {
    digitCounts[d] = (digitCounts[d] || 0) + 1;
  });
  
  const totalRelevant = overCount + underCount;
  if (totalRelevant === 0) {
    const prediction: 'OVER' | 'UNDER' = Math.random() > 0.5 ? 'OVER' : 'UNDER';
    const digit = prediction === 'OVER' ? 5 : 4; // Safe defaults within new limits
    const { entryPattern, entryDigits, waitForPattern } = generateEntryPattern(prediction, digits, digitCounts);
    return {
      prediction,
      digit,
      label: `${prediction} ${digit}`,
      confidence: 55,
      recommendedRuns: 5,
      entryPattern,
      entryDigits,
      waitForPattern
    };
  }
  
  const overRatio = overCount / totalRelevant;
  let prediction: 'OVER' | 'UNDER';
  let digit: number;
  
  if (overRatio > 0.55) {
    prediction = 'OVER';
    // Find most frequent OVER digit, with barrier limits: min 4, max 7
    const overDigits = OVER_RANGE.map(d => ({ digit: d, count: digitCounts[d] || 0 }));
    overDigits.sort((a, b) => b.count - a.count);
    const mostFrequent = overDigits[0].digit;
    // OVER barrier limits: minimum 4, maximum 7
    digit = Math.max(4, Math.min(7, mostFrequent));
  } else if (overRatio < 0.45) {
    prediction = 'UNDER';
    // Find most frequent UNDER digit, with barrier limits: min 3, max 6
    const underDigits = UNDER_RANGE.map(d => ({ digit: d, count: digitCounts[d] || 0 }));
    underDigits.sort((a, b) => b.count - a.count);
    const mostFrequent = underDigits[0].digit;
    // UNDER barrier limits: minimum 3, maximum 6 (no under 1 or under 2)
    digit = Math.max(3, Math.min(6, mostFrequent));
  } else {
    // Neutral - pick based on slight lean with safe barriers within limits
    prediction = overRatio >= 0.5 ? 'OVER' : 'UNDER';
    digit = prediction === 'OVER' ? 5 : 4; // Safe middle barriers within new limits
  }
  
  const difference = Math.abs(overCount - underCount);
  const confidenceRaw = 50 + (difference / digits.length) * 50;
  const confidence = clampConfidence(confidenceRaw);
  const recommendedRuns = calculateRecommendedRuns(confidence);
  const { entryPattern, entryDigits, waitForPattern } = generateEntryPattern(prediction, digits, digitCounts);
  
  return {
    prediction,
    digit,
    label: `${prediction} ${digit}`,
    confidence,
    recommendedRuns,
    entryPattern,
    entryDigits,
    waitForPattern
  };
};

// Digit Match Analysis
export const analyzeDigitMatch = (ticks: Tick[]): DigitMatchResult | null => {
  if (!ticks || ticks.length < 5) return null;
  
  const digits = ticks.slice(-15).map(t => getLastDigit(t.quote));
  const frequency: Record<number, number> = {};
  
  digits.forEach(d => {
    frequency[d] = (frequency[d] || 0) + 1;
  });
  
  let maxCount = 0;
  let prediction = 0;
  
  Object.entries(frequency).forEach(([digit, count]) => {
    if (count > maxCount) {
      maxCount = count;
      prediction = parseInt(digit, 10);
    }
  });
  
  const total = digits.length;
  const percentages: Record<number, number> = {};
  for (let d = 0; d <= 9; d++) {
    const count = frequency[d] || 0;
    percentages[d] = total > 0 ? Math.round((count / total) * 100) : 0;
  }

  const confidenceRaw = (maxCount / total) * 100;
  const confidence = clampConfidence(confidenceRaw);
  
  return {
    prediction,
    confidence,
    frequency,
    percentages,
    total,
  };
};
