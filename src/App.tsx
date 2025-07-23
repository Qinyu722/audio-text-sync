import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import WavesurferPlayer from '@wavesurfer/react';
import H5AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import './App.css';

import testData from './assets/trader_dialogue_market.json';

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
};

type AudioTextCardProps = {
    title: string;
    chunks: ChunksMap;
    activeChunk: number | null;
    setActiveChunk: (id: number) => void;
    showSpeaker: boolean;
    wavesurferRef: React.RefObject<any>;
};


function AudioPlayerCard({ wavesurfer, setWavesurfer }: AudioPlayerCardProps) {
    const audioUrl = '/src/assets/test-audio.mp3';
    const audioRef = React.useRef<any>(null);

    const handlePlay = () => {
        if (wavesurfer && !wavesurfer.isPlaying()) {
            wavesurfer.play();
        }
    };
    const handlePause = () => {
        if (wavesurfer && wavesurfer.isPlaying()) {
            wavesurfer.pause();
        }
    };
    const handleAudioPlayerSeek = (e: any) => {
        console.log('Seek Wavesurfer event:', e);

        if (wavesurfer && audioRef.current) {
            const audio = audioRef.current.audio.current;
            if (audio) {
                wavesurfer.setTime(audio.currentTime);
            }
        }
    };

    const handleWavesurferSeek  = (e: any) => {
        console.log('Seek payer event:', e);
        if (wavesurfer && audioRef.current) {
            const audio = audioRef.current.audio.current;
            if (audio) {
                audio.currentTime = wavesurfer.getCurrentTime();
            }
        }
    };

    return (
        <Card sx={{ mb: 4 }}>
            <CardHeader title="Audio Playback" />
            <CardContent>
                <WavesurferPlayer
                    height={80}
                    barWidth={2}
                    barRadius={2}
                    waveColor="#1976d2"
                    url={audioUrl}
                    onReady={setWavesurfer}
                    // onSeeking={handleAudioPlayerSeek}
                />
                <H5AudioPlayer
                    ref={audioRef}
                    src={audioUrl}
                    style={{ marginTop: 16 }}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeeked={handleAudioPlayerSeek}
                    showJumpControls={false}
                    showSkipControls={false}
                    customAdditionalControls={[]}
                    layout="horizontal"
                />
            </CardContent>
        </Card>
    );
}

function AudioTextCard({ title, chunks, activeChunk, setActiveChunk, showSpeaker, wavesurferRef }: AudioTextCardProps) {
    return (
        <Card sx={{ flex: 1, minHeight: 400, maxHeight: 600, display: 'flex', flexDirection: 'column' }}>
            <CardHeader title={title} sx={{ bgcolor: '#ececec' }} />
            <CardContent sx={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
                {Object.entries(chunks).map(([chunkId, chunk]) => (
                    <Box
                        key={chunkId}
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', bgcolor: activeChunk === Number(chunkId) ? '#ffe082' : 'inherit', borderRadius: 1, p: 1 }}
                        onClick={() => {
                            setActiveChunk(Number(chunkId));
                            const audio = wavesurferRef.current;
                            if (audio) {
                                audio.setTime(chunk.startTime);
                            }
                        }}
                    >
                        {showSpeaker && (
                            <Box sx={{ bgcolor: '#1976d2', color: '#fff', px: 0.5, py: 0.5, borderRadius: 1, fontWeight: 500, mr: 1, fontSize: 12 }}>
                                {(chunk as Chunk).speaker}
                            </Box>
                        )}
                        <Typography variant="body2" sx={{ m: 0 }}>{(chunk as Chunk).text}</Typography>
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
    const [activeChunk, setActiveChunk] = useState<number | null>(null);
    const [showSpeaker, setShowSpeaker] = useState<boolean>(true);
    const [wavesurfer, setWavesurfer] = useState<any>(null);

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
                    wavesurferRef={{ current: wavesurfer }}
                />
                <AudioTextCard
                    title="Translation"
                    chunks={translationChunks}
                    activeChunk={activeChunk}
                    setActiveChunk={setActiveChunk}
                    showSpeaker={showSpeaker}
                    wavesurferRef={{ current: wavesurfer }}
                />
            </Box>
        </Box>
    );
}

export default App;

