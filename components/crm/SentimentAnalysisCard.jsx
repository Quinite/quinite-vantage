'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function SentimentAnalysisCard({ callLogs = [] }) {
    // Filter call logs that have sentiment data
    const callsWithSentiment = callLogs.filter(log =>
        log.conversation_transcript || log.sentiment_score !== null
    )

    if (callsWithSentiment.length === 0) {
        return null // Don't show card if no sentiment data
    }

    // Get the latest sentiment score
    const latestCall = callsWithSentiment[0]
    const latestScore = latestCall?.sentiment_score || 0

    // Calculate average sentiment
    const avgSentiment = callsWithSentiment.reduce((sum, log) =>
        sum + (log.sentiment_score || 0), 0
    ) / callsWithSentiment.length

    const getSentimentLabel = (score) => {
        if (score > 0.3) return 'Positive'
        if (score < -0.3) return 'Negative'
        return 'Neutral'
    }

    const getSentimentColor = (score) => {
        if (score > 0.3) return 'text-green-600 bg-green-50 border-green-200'
        if (score < -0.3) return 'text-red-600 bg-red-50 border-red-200'
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }

    const getSentimentIcon = (score) => {
        if (score > 0.3) return <TrendingUp className="w-4 h-4" />
        if (score < -0.3) return <TrendingDown className="w-4 h-4" />
        return <Minus className="w-4 h-4" />
    }

    const getSentimentEmoji = (score) => {
        if (score > 0.3) return '😊'
        if (score < -0.3) return '😟'
        return '😐'
    }

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        Sentiment Analysis
                    </CardTitle>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                        Based on {callsWithSentiment.length} AI Call{callsWithSentiment.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {/* Latest Sentiment */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">{getSentimentEmoji(latestScore)}</div>
                        <div>
                            <p className="text-xs text-muted-foreground">Latest Sentiment</p>
                            <p className="text-sm font-semibold text-foreground">{getSentimentLabel(latestScore)}</p>
                        </div>
                    </div>
                    <Badge variant="outline" className={`${getSentimentColor(latestScore)} border font-medium flex items-center gap-1.5`}>
                        {getSentimentIcon(latestScore)}
                        {(latestScore * 100).toFixed(0)}%
                    </Badge>
                </div>

                {/* Average Sentiment */}
                {callsWithSentiment.length > 1 && (
                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
                        <div>
                            <p className="text-xs text-muted-foreground">Average Sentiment</p>
                            <p className="text-sm font-medium text-foreground">{getSentimentLabel(avgSentiment)}</p>
                        </div>
                        <Badge variant="outline" className={`${getSentimentColor(avgSentiment)} border font-medium`}>
                            {(avgSentiment * 100).toFixed(0)}%
                        </Badge>
                    </div>
                )}

                {/* Sentiment History */}
                {callsWithSentiment.length > 1 && (
                    <div className="space-y-2 mt-2">
                        <p className="text-xs font-medium text-muted-foreground">Recent Calls</p>
                        <div className="space-y-1 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                            {callsWithSentiment.map((log, index) => (
                                <div key={log.id || index} className="flex items-center justify-between text-xs p-2 rounded-md hover:bg-muted/30 transition-colors border-b border-border/10 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{getSentimentEmoji(log.sentiment_score || 0)}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {new Date(log.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <Badge variant="outline" className={`${getSentimentColor(log.sentiment_score || 0)} border-0 text-[9px] h-5 px-1.5`}>
                                        {getSentimentLabel(log.sentiment_score || 0)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
