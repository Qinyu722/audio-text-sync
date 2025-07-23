import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import responseData from './assets/voiss-test.json';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import './App.css';

type Chunk = {
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
};
type ChunksMap = Record<string | number, Chunk>;

type AudioPlayerCardProps = {
    audioRef: React.RefObject<any>;
    onListen: () => void;
};

type AudioTextCardProps = {
  title: string;
  chunks: ChunksMap;
  activeChunk: number | null;
  setActiveChunk: (id: number) => void;
  audioRef: React.RefObject<any>;
  showSpeaker: boolean;
};

function AudioPlayerCard({ audioRef, onListen }: AudioPlayerCardProps) {
    return (
        <Card sx={{ mb: 4 }}>
            <CardHeader title="Audio Playback" />
            <CardContent>
                <AudioPlayer
                    src="/src/assets/test.mp3"
                    layout="horizontal"
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    customVolumeControls={[RHAP_UI.VOLUME]}
                    style={{ width: '100%' }}
                    ref={audioRef}
                    onListen={onListen}
                />
            </CardContent>
        </Card>
    );
}

function AudioTextCard({ title, chunks, activeChunk, setActiveChunk, audioRef, showSpeaker }: AudioTextCardProps) {
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
              const audio = audioRef.current?.audio?.current;
              if (audio) audio.currentTime = chunk.startTime;
            }}
          >
            {showSpeaker && (
              <Box sx={{ bgcolor: '#1976d2', color: '#fff', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 500, mr: 2, fontSize: 14 }}>
                {chunk.speaker}
              </Box>
            )}
            <Typography variant="body1" sx={{ m: 0 }}>{chunk.text}</Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

function App() {
    const [transcriptChunks, setTranscriptChunks] = useState<ChunksMap>({});
    const [translationChunks, setTranslationChunks] = useState<ChunksMap>({});
    const [activeChunk, setActiveChunk] = useState<number | null>(null);
    const [showSpeaker, setShowSpeaker] = useState<boolean>(true);
    const audioRef = useRef<any>(null);

    function handlePlayerClick(e: MouseEvent<HTMLDivElement>) {
        const audio = audioRef.current?.audio?.current;
        if (!audio) return;
        const progressBar = audioRef.current?.container?.querySelector('.rhap_progress-bar');
        if (!progressBar) return;
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        const clickedTime = percent * audio.duration;
        let foundChunk: number | null = null;
        Object.entries(transcriptChunks).forEach(([chunk_id, chunk]) => {
            if (clickedTime >= chunk.startTime && clickedTime <= chunk.endTime) {
                foundChunk = Number(chunk_id);
            }
        });
        if (foundChunk !== null) {
            setActiveChunk(foundChunk);
            audio.currentTime = transcriptChunks[foundChunk].startTime;
        } else {
            audio.currentTime = clickedTime;
        }
    }

    function handleAudioListen() {
        const audio = audioRef.current?.audio?.current;
        if (!audio) return;
        const currentTime = audio.currentTime;
        let foundChunk: number | null = null;
        Object.entries(transcriptChunks).forEach(([chunk_id, chunk]) => {
            if (currentTime >= chunk.startTime && currentTime <= chunk.endTime) {
                foundChunk = Number(chunk_id);
            }
        });
        if (foundChunk !== null && foundChunk !== activeChunk) {
            setActiveChunk(foundChunk);
        }
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

    useEffect(() => {
        const surveillance = responseData.surveillance;
        if (surveillance.transcript && surveillance.transcriptChunks) {
            setTranscriptChunks(parsedAudioChunks(surveillance.transcript, surveillance.transcriptChunks));
        }
        if (surveillance.translation && surveillance.translationChunks) {
            setTranslationChunks(parsedAudioChunks(surveillance.translation, surveillance.translationChunks));
        }
    }, []);

    return (
        <Box sx={{ width: '100vw', maxWidth: '100vw', minHeight: '100vh', bgcolor: '#fafafa', p: 0, m: 0 }}>
            <Box onClick={handlePlayerClick} sx={{ cursor: 'pointer', width: '100%' }}>
                <AudioPlayerCard audioRef={audioRef} onListen={handleAudioListen} />
            </Box>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <FormControlLabel
                    control={<Switch checked={showSpeaker} onChange={() => setShowSpeaker((v) => !v)} />}
                    label="Show Speaker"
                />
            </Box>
            <Box sx={{ display: 'flex', width: '100%', mb: 4, gap: 0 }}>
                <AudioTextCard
                  title="Transcript"
                  chunks={transcriptChunks}
                  activeChunk={activeChunk}
                  setActiveChunk={setActiveChunk}
                  audioRef={audioRef}
                  showSpeaker={showSpeaker}
                />
                <AudioTextCard
                  title="Translation"
                  chunks={translationChunks}
                  activeChunk={activeChunk}
                  setActiveChunk={setActiveChunk}
                  audioRef={audioRef}
                  showSpeaker={showSpeaker}
                />
            </Box>
        </Box>
    );
}

export default App;
