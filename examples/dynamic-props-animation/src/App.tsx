import { Helios } from '@helios-project/core';
import { useVideoFrame } from './hooks/useVideoFrame';

interface InputProps {
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  scale: number;
  showSubtitle: boolean;
}

const schema = {
    title: { type: 'string', default: 'Dynamic Title' },
    subtitle: { type: 'string', default: 'Change me via props' },
    backgroundColor: { type: 'color', default: '#ffffff' },
    textColor: { type: 'color', default: '#000000' },
    scale: { type: 'number', minimum: 0.5, maximum: 2.0, default: 1.0 },
    showSubtitle: { type: 'boolean', default: true }
} as const;

const helios = new Helios<InputProps>({
    duration: 5,
    fps: 30,
    schema: schema as any,
    inputProps: {
        title: 'Dynamic Title',
        subtitle: 'Change me via props',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        scale: 1.0,
        showSubtitle: true
    }
});

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    (window as any).helios = helios;
}

export default function App() {
    const state = useVideoFrame(helios);
    const { inputProps, currentFrame, fps } = state;
    const typedInputProps = inputProps as InputProps;

    const time = currentFrame / fps;
    const pulse = Math.sin(time * 2) * 0.1;
    const currentScale = (typedInputProps.scale || 1) + pulse;

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: typedInputProps.backgroundColor,
            color: typedInputProps.textColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            overflow: 'hidden'
        }}>
            <div style={{ transform: `scale(${currentScale})`, textAlign: 'center' }}>
                <h1 style={{ margin: 0 }}>{typedInputProps.title}</h1>
                {typedInputProps.showSubtitle && (
                    <p style={{ marginTop: '0.5em', opacity: 0.8 }}>{typedInputProps.subtitle}</p>
                )}
            </div>
            <div style={{ position: 'absolute', bottom: 20, fontSize: '12px', opacity: 0.5 }}>
                Frame: {Math.round(currentFrame)}
            </div>
        </div>
    );
}
