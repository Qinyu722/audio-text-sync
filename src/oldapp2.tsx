import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { WaveSurfer, WaveForm } from 'wavesurfer-react';
// import { WaveSurfer, WaveForm, useWavesurfer } from 'wavesurfer-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import testData from './assets/voiss-test.json';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
// import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
// import 'react-h5-audio-player/lib/styles.css';
import './App.css';

type Chunk = {
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
};
type ChunksMap = Record<string | number, Chunk>;


type AudioPlayerCardProps = {
    wavesurfer: any;
    setWavesurfer: (ws: any) => void;
    onPlayPause: () => void;
    isPlaying: boolean;
};

type AudioTextCardProps = {
    title: string;
    chunks: ChunksMap;
    activeChunk: number | null;
    setActiveChunk: (id: number) => void;
    showSpeaker: boolean;
};

function AudioPlayerCard({ wavesurfer, setWavesurfer, onPlayPause, isPlaying }: AudioPlayerCardProps) {
    const waveformRef = React.useRef<HTMLDivElement>(null);
    return (
        <Card sx={{ mb: 4 }}>
            <CardHeader title="Audio Playback" />
            <CardContent>
                <div ref={waveformRef} />
                <WaveSurfer
                    container={waveformRef.current as HTMLElement}
                    onMount={ws => {
                        if (ws && ws !== wavesurfer) {
                            ws.load('/src/assets/test.mp3');
                            setWavesurfer(ws);
                        }
                    }}
                    plugins={[]}
                >
                    <WaveForm
                        id="waveform"
                        barWidth={2}
                        barRadius={2}
                        cursorColor="#1976d2"
                        progressColor="#1976d2"
                        waveColor="#b3c0d1"
                        height={80}
                    />
                </WaveSurfer>
                <button onClick={onPlayPause} style={{ marginTop: 8 }}>
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
            </CardContent>
        </Card>
    );
}

function AudioTextCard({ title, chunks, activeChunk, setActiveChunk, showSpeaker }: AudioTextCardProps) {
    return (
        <Card sx={{ flex: 1, minHeight: 400, maxHeight: 600, display: 'flex', flexDirection: 'column' }}>
            <CardHeader title={title} sx={{ bgcolor: '#ececec' }} />
            <CardContent sx={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
                {Object.entries(chunks).map(([chunkId, chunk]) => (
                    <Box
                        key={chunkId}
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', bgcolor: activeChunk === Number(chunkId) ? '#ffe082' : 'inherit', borderRadius: 1, p: 1 }}
                        onClick={() => setActiveChunk(Number(chunkId))}
                    >
                        {showSpeaker && (
                            <Box sx={{ bgcolor: '#1976d2', color: '#fff', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 500, mr: 2, fontSize: 14 }}>
                                {(chunk as Chunk).speaker}
                            </Box>
                        )}
                        <Typography variant="body1" sx={{ m: 0 }}>{(chunk as Chunk).text}</Typography>
                    </Box>
                ))}
            </CardContent>
        </Card>
    );
}

function parsedAudioChunks(fullText: string, audioChunks: any[]): ChunksMap {
    const parsedChunks: ChunksMap = {};
    audioChunks.forEach(chunkArr => {
        const [chunkId, speakerLabelRaw, charRange, timeRange] = chunkArr;
        let start = 0, end = 0, startTime = 0, endTime = 0;
        if (typeof charRange === 'string') {
            [start, end] = charRange.split('-').map(Number);
        }
        if (typeof timeRange === 'string') {
            [startTime, endTime] = timeRange.split('-').map(Number);
        }
        const text = fullText.slice(start, end + 1);
        let speaker = String(speakerLabelRaw);
        if (speaker.startsWith('spk_')) {
            speaker = speaker.replace('spk_', 'speaker_');
        }
        parsedChunks[chunkId] = {
            speaker,
            text,
            startTime,
            endTime,
        };
    });
    return parsedChunks;
}

function App() {
    const [transcriptChunks, setTranscriptChunks] = useState<ChunksMap>({});
    const [translationChunks, setTranslationChunks] = useState<ChunksMap>({});
    const [activeChunk, setActiveChunkState] = useState<number | null>(null);
    const [showSpeaker, setShowSpeaker] = useState<boolean>(true);
    const [wavesurfer, setWavesurfer] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Setup event listeners on the wavesurfer instance
    useEffect(() => {
        if (!wavesurfer) return;
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleAudioProcess = () => setCurrentTime(wavesurfer.getCurrentTime());
        const handleSeek = () => setCurrentTime(wavesurfer.getCurrentTime());
        wavesurfer.on('play', handlePlay);
        wavesurfer.on('pause', handlePause);
        wavesurfer.on('audioprocess', handleAudioProcess);
        wavesurfer.on('seek', handleSeek);
        return () => {
            wavesurfer.un('play', handlePlay);
            wavesurfer.un('pause', handlePause);
            wavesurfer.un('audioprocess', handleAudioProcess);
            wavesurfer.un('seek', handleSeek);
        };
    }, [wavesurfer]);

    // Highlight chunk based on currentTime
    useEffect(() => {
        let foundChunk: number | null = null;
        Object.entries(transcriptChunks).forEach(([chunk_id, chunk]) => {
            if (currentTime >= chunk.startTime && currentTime <= chunk.endTime) {
                foundChunk = Number(chunk_id);
            }
        });
        if (foundChunk !== null && foundChunk !== activeChunk) {
            setActiveChunkState(foundChunk);
        }
    }, [currentTime, transcriptChunks, activeChunk]);

    // setActiveChunk that also jumps the player
    const setActiveChunk = (chunkId: number) => {
        const chunk = transcriptChunks[chunkId];
        if (chunk && wavesurfer) {
            wavesurfer.setCurrentTime(chunk.startTime);
            setActiveChunkState(chunkId);
        }
    };

    // Restore the logic to set transcript and translation chunks from testData on mount
    useEffect(() => {
        const surveillance = testData.surveillance;
        if (surveillance.transcript && surveillance.transcriptChunks) {
            setTranscriptChunks(parsedAudioChunks(surveillance.transcript, surveillance.transcriptChunks));
        }
        if (surveillance.translation && surveillance.translationChunks) {
            setTranslationChunks(parsedAudioChunks(surveillance.translation, surveillance.translationChunks));
        }
    }, []);

    return (
        <Box sx={{ width: '90vw', maxWidth: '90vw', minHeight: '100vh', bgcolor: '#fafafa', p: 0, m: 0 }}>
            <Box>
                <AudioPlayerCard
                    wavesurfer={wavesurfer}
                    setWavesurfer={setWavesurfer}
                    onPlayPause={() => wavesurfer && wavesurfer.playPause()}
                    isPlaying={isPlaying}
                />
            </Box>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <FormControlLabel
                    control={<Switch checked={showSpeaker} onChange={() => setShowSpeaker((v) => !v)} />}
                    label="Show Speaker"
                />
            </Box>
            <Box sx={{ display: 'flex', width: '100%', mb: 4, gap: 1 }}>
                <AudioTextCard
                    title="Transcript"
                    chunks={transcriptChunks}
                    activeChunk={activeChunk}
                    setActiveChunk={setActiveChunk}
                    showSpeaker={showSpeaker}
                />
                <AudioTextCard
                    title="Translation"
                    chunks={translationChunks}
                    activeChunk={activeChunk}
                    setActiveChunk={setActiveChunk}
                    showSpeaker={showSpeaker}
                />
            </Box>
        </Box>
    );
}

export default App;
