'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Download,
    MessageSquare,
    TrendingUp,
    TrendingDown,
    Minus
} from 'lucide-react'
import { formatDuration } from 'date-fns'

export default function CallRecordingPlayer({ callLog }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)

    const audioRef = useRef(null)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const updateDuration = () => setDuration(audio.duration)
        const handleEnded = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('loadedmetadata', updateDuration)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('loadedmetadata', updateDuration)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    const togglePlayPause = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (value) => {
        const audio = audioRef.current
        if (!audio) return

        const newTime = value[0]
        audio.currentTime = newTime
        setCurrentTime(newTime)
    }

    const handleVolumeChange = (value) => {
        const audio = audioRef.current
        if (!audio) return

        const newVolume = value[0]
        audio.volume = newVolume
        setVolume(newVolume)
        setIsMuted(newVolume === 0)
    }

    const toggleMute = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isMuted) {
            audio.volume = volume || 0.5
            setIsMuted(false)
        } else {
            audio.volume = 0
            setIsMuted(true)
        }
    }

    const skip = (seconds) => {
        const audio = audioRef.current
        if (!audio) return

        audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
    }

    const changePlaybackRate = (rate) => {
        const audio = audioRef.current
        if (!audio) return

        audio.playbackRate = rate
        setPlaybackRate(rate)
    }

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getSentimentIcon = (score) => {
        if (score > 0.3) return <TrendingUp className="h-4 w-4 text-green-600" />
        if (score < -0.3) return <TrendingDown className="h-4 w-4 text-red-600" />
        return <Minus className="h-4 w-4 text-yellow-600" />
    }

    const getSentimentColor = (score) => {
        if (score > 0.3) return 'bg-green-100 text-green-800'
        if (score < -0.3) return 'bg-red-100 text-red-800'
        return 'bg-yellow-100 text-yellow-800'
    }

    if (!callLog?.recording_url) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recording available for this call</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Call Recording</CardTitle>
                        <CardDescription>
                            {callLog.lead?.name || 'Unknown'} • {new Date(callLog.created_at).toLocaleString()}
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <a href={callLog.recording_url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </a>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Audio Element */}
                <audio ref={audioRef} src={callLog.recording_url} preload="metadata" />

                {/* Waveform / Progress Bar */}
                <div className="space-y-2">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    {/* Playback Controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => skip(-10)}
                        >
                            <SkipBack className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="default"
                            size="icon"
                            className="h-12 w-12"
                            onClick={togglePlayPause}
                        >
                            {isPlaying ? (
                                <Pause className="h-5 w-5" />
                            ) : (
                                <Play className="h-5 w-5 ml-0.5" />
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => skip(10)}
                        >
                            <SkipForward className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                        >
                            {isMuted ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </Button>
                        <Slider
                            value={[isMuted ? 0 : volume]}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                            className="w-24"
                        />
                    </div>

                    {/* Playback Speed */}
                    <div className="flex items-center gap-1">
                        {[0.5, 1, 1.5, 2].map((rate) => (
                            <Button
                                key={rate}
                                variant={playbackRate === rate ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => changePlaybackRate(rate)}
                                className="text-xs"
                            >
                                {rate}x
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Call Insights (Consolidated Schema) */}
                {(callLog.sentiment_score !== null || callLog.ai_metadata) && (
                    <div className="border-t pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-gray-700">AI Call Insights</h4>
                            {callLog.summary && (
                                <Badge variant="secondary" className="font-normal italic">
                                    "{callLog.summary}"
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Sentiment */}
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Sentiment</div>
                                <Badge className={getSentimentColor(callLog.sentiment_score || 0)}>
                                    <span className="flex items-center gap-1 text-[10px]">
                                        {getSentimentIcon(callLog.sentiment_score || 0)}
                                        {callLog.sentiment_label || 'Neutral'}
                                    </span>
                                </Badge>
                            </div>

                            {/* Interest Level */}
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Interest Level</div>
                                <Badge variant="outline" className="capitalize">
                                    {callLog.interest_level || 'Unknown'}
                                </Badge>
                            </div>

                            {/* Priority Score */}
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Lead Priority</div>
                                <div className="text-lg font-bold text-gray-900">
                                    {callLog.ai_metadata?.priority_score || 0}/100
                                </div>
                            </div>

                            {/* Budget */}
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Est. Budget</div>
                                <div className="text-sm font-medium text-blue-600 truncate">
                                    {callLog.ai_metadata?.budget_estimated || 'Not Mentioned'}
                                </div>
                            </div>
                        </div>

                        {/* Key Takeaways */}
                        {callLog.ai_metadata?.key_takeaways && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700 flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 text-blue-500" />
                                    Key Takeaways
                                </div>
                                <div className="text-sm text-gray-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                    {callLog.ai_metadata.key_takeaways}
                                </div>
                            </div>
                        )}

                        {/* Objections */}
                        {callLog.ai_metadata?.objections && callLog.ai_metadata.objections.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700">Objections Raised</div>
                                <div className="flex flex-wrap gap-2">
                                    {callLog.ai_metadata.objections.map((objection, idx) => (
                                        <Badge key={idx} variant="secondary" className="bg-red-50 text-red-700 border-red-100 hover:bg-red-100 transition-colors">
                                            {objection}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
