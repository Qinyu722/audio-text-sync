import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import WavesurferPlayer from '@wavesurfer/react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions'
import parse from 'html-react-parser';

import './App.css';

import data from './assets/trader_dialogue_market.json';

type Chunk = {
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
};

type ChunksMap = Record<string | number, Chunk>;

type AudioPlayerCardProps = {
    audioUrl: string;
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



function AudioPlayerCard({ audioUrl, setWavesurfer }: AudioPlayerCardProps) {

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
                    mediaControls={true}
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
                        key={Number(chunkId)}
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
                        <Typography variant="body2" sx={{ m: 0 }}>{parse((chunk as Chunk).text)}</Typography>
                    </Box>
                ))}
            </CardContent>
        </Card>
    );
}

function parsedAudioChunks(fullText: string, audioChunks: any[], highlights: any[], enableHighlight: boolean, setRegions: any): ChunksMap {
    const parsedChunks: ChunksMap = {};
    const waveRagions: any[] = [];

    audioChunks.forEach(chunkArr => {
        const [chunkId, speakerLabelRaw, charRange, timeRange] = chunkArr;

        let start = 0, end = 0, startTime = 0, endTime = 0;
        if (typeof charRange === 'string') {
            [start, end] = charRange.split('-').map(Number);
        }
        if (typeof timeRange === 'string') {
            [startTime, endTime] = timeRange.split('-').map(Number);
        }

        let text = renderHighlightText(fullText, start, end, highlights, enableHighlight);
        if (text === '') {
            text = fullText.slice(start, end + 1);
        } else {
            waveRagions.push({
                start: startTime,
                end: endTime
            });
        }

        let speaker = String(speakerLabelRaw);
        if (speaker.startsWith('spk_')) {
            speaker = speaker.replace('spk_', 'speaker_');
        }
        parsedChunks[Number(chunkId)] = {
            speaker,
            text,
            startTime,
            endTime,
        };
    });

    setRegions(waveRagions);
    return parsedChunks;
}

function renderHighlightText(fullText: string, start: number, end: number, highlights: any[], enableHighlight: boolean): string {
    let text = '';
    const totalHighlights = highlights ? highlights.length : 0;
    if (enableHighlight && totalHighlights > 0) {
        // If there are highlights, we need to check if the current chunk overlaps with any highlight

        let startPos = 0;
        let endPos = end;
        for (let i = 0; i < totalHighlights; i++) {
            const highlight = highlights[i];

            if (highlight.start > end || highlight.end < start) {
                break; // No more highlights overlap with this chunk
            } else {
                if (highlight.start < start) {
                    startPos = start;
                } else {
                    text += fullText.slice(startPos, highlight.start);
                    startPos = highlight.start;
                }
                if (highlight.end < end) {
                    endPos = highlight.end;
                } else {
                    endPos = end;
                }
                text += "<strong>" + fullText.slice(startPos, endPos + 1) + '</strong>';
                startPos = endPos + 1;
            }
        }

        if (endPos < end) {
            text += fullText.slice(endPos + 1, end);
        }
    }
    return text;
}



function App() {
    const [transcriptChunks, setTranscriptChunks] = useState<ChunksMap>({});
    const [translationChunks, setTranslationChunks] = useState<ChunksMap>({});
    const [activeChunk, setActiveChunk] = useState<number | null>(null);
    const [showSpeaker, setShowSpeaker] = useState<boolean>(true);
    const [wavesurfer, setWavesurfer] = useState<any>(null);
    const [waveRegions, setRegions] = useState<any>(null);

    const testAudio = '/src/assets/test-audio.mp3';

    // Parse the audio chunks from backend data
    useEffect(() => {
        const highlights = data.alert.matchedPos
            .split(',')
            .map(pos => {
                const [start, end] = pos.split('-').map(Number);
                return { start, end };
            })
            .sort((a, b) => a.start - b.start);

        const surveillance = data.surveillance;
        if (surveillance.transcript && surveillance.transcriptChunks) {
            setTranscriptChunks(parsedAudioChunks(surveillance.transcript, surveillance.transcriptChunks, highlights, false, setRegions));
        }
        if (surveillance.translation && surveillance.translationChunks) {
            setTranslationChunks(parsedAudioChunks(surveillance.translation, surveillance.translationChunks, highlights, true, setRegions));
        }


    }, []);

    useEffect(() => {
        if (!wavesurfer) return;

        const regions = wavesurfer.registerPlugin(RegionsPlugin.create());
        console.log('Wave regions:', waveRegions);
        waveRegions.forEach(region => {
            regions.addRegion({
                start: region.start,
                end: region.end,
                color: 'rgba(255, 0, 0, 0.5)',
                drag: false,
                resize: false,
            })
        });

    }, [wavesurfer, waveRegions]);

    return (
        <Box sx={{ width: '90vw', maxWidth: '90vw', minHeight: '100vh', bgcolor: '#fafafa', p: 0, m: 0 }}>
            <Box>
                <AudioPlayerCard
                    audioUrl={testAudio}
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

