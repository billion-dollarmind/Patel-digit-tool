import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Zap, Calendar, Award, AlertTriangle } from 'lucide-react';
import { usePerformanceTracking, PerformanceStats } from '@/hooks/usePerformanceTracking';
import { Button } from '@/components/ui/button';

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard = ({ className }: PerformanceDashboardProps) => {
  const { stats, clearHistory } = usePerformanceTracking();

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-green-500';
    if (accuracy >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStreakColor = (streak: number) => {
    if (streak > 0) return 'text-green-500';
    if (streak < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = 'text-foreground',
    trend 
  }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        {trend && (
          <div className={`flex items-center ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-muted-foreground'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </motion.div>
  );

  if (stats.totalPredictions === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`glass rounded-xl p-6 text-center space-y-4 ${className}`}
      >
        <Target className="w-12 h-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">No Performance Data</h3>
          <p className="text-sm text-muted-foreground">
            Start making predictions to see your performance statistics
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Performance Dashboard</h2>
          <p className="text-sm text-muted-foreground">Track your prediction accuracy and trends</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-destructive hover:text-destructive"
        >
          Clear History
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          title="Overall Accuracy"
          value={`${stats.accuracy}%`}
          subtitle={`${stats.correctPredictions}/${stats.totalPredictions} correct`}
          color={getAccuracyColor(stats.accuracy)}
          trend={stats.accuracy >= 60 ? 'up' : stats.accuracy >= 50 ? 'neutral' : 'down'}
        />
        
        <StatCard
          icon={Zap}
          title="Current Streak"
          value={Math.abs(stats.currentStreak)}
          subtitle={stats.currentStreak > 0 ? 'wins' : stats.currentStreak < 0 ? 'losses' : 'neutral'}
          color={getStreakColor(stats.currentStreak)}
          trend={stats.currentStreak > 0 ? 'up' : stats.currentStreak < 0 ? 'down' : 'neutral'}
        />
        
        <StatCard
          icon={Award}
          title="Best Streak"
          value={stats.bestStreak}
          subtitle="consecutive wins"
          color="text-green-500"
        />
        
        <StatCard
          icon={Calendar}
          title="Today's Accuracy"
          value={stats.todayStats.predictions > 0 ? `${stats.todayStats.accuracy}%` : 'N/A'}
          subtitle={`${stats.todayStats.predictions} predictions`}
          color={getAccuracyColor(stats.todayStats.accuracy)}
        />
      </div>

      {/* Confidence-based Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-foreground">Performance by Confidence Level</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">High Confidence (80%+)</span>
              <span className={`text-sm font-medium ${getAccuracyColor(stats.highConfidenceAccuracy)}`}>
                {stats.highConfidenceAccuracy}%
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.highConfidenceAccuracy, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Medium Confidence (60-80%)</span>
              <span className={`text-sm font-medium ${getAccuracyColor(stats.mediumConfidenceAccuracy)}`}>
                {stats.mediumConfidenceAccuracy}%
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.mediumConfidenceAccuracy, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Low Confidence (60%)</span>
              <span className={`text-sm font-medium ${getAccuracyColor(stats.lowConfidenceAccuracy)}`}>
                {stats.lowConfidenceAccuracy}%
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.lowConfidenceAccuracy, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weekly Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-foreground">Recent Performance</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">This Week</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.weekStats.predictions > 0 ? `${stats.weekStats.accuracy}%` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.weekStats.predictions} predictions made
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Average Confidence</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.averageConfidence}%
            </div>
            <div className="text-xs text-muted-foreground">
              Across all predictions
            </div>
          </div>
        </div>
      </motion.div>

      {/* Risk Warning */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-4 border border-amber-500/30 bg-amber-500/5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-amber-500">Risk Warning</h4>
            <p className="text-xs text-muted-foreground">
              Past performance does not guarantee future results. Trade responsibly and never risk more than you can afford to lose.
              {stats.accuracy < 60 && (
                <span className="block mt-1 text-amber-400">
                  Consider reviewing your strategy - current accuracy is below 60%.
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};