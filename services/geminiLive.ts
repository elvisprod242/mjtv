import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, LiveSession } from '@google/genai';
import { MODEL_NAME } from '../constants';
import { decode, decodeAudioData, createPCM16Blob } from './audioUtils';
import { Channel } from '../types';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface ConnectOptions {
  channels: Channel[]; // Dynamic channels
  onStatusChange: (status: string) => void;
  onAudioData: (visualizerData: number) => void;
  onChangeChannel: (channelId: string) => void;
  onTranscript: (text: string, isModel: boolean) => void;
}

export class GeminiLiveService {
  private ai: GoogleGenAI | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private session: LiveSession | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;

  constructor() {
    // Initialize in connect to ensure fresh API key
  }

  async connect(options: ConnectOptions) {
    options.onStatusChange('CONNECTING');

    try {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      this.inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = this.outputAudioContext.createGain();
      outputNode.connect(this.outputAudioContext.destination);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Define tools
      const changeChannelTool: FunctionDeclaration = {
        name: 'changeChannel',
        parameters: {
          type: Type.OBJECT,
          description: 'Change the TV channel to a specific channel ID.',
          properties: {
            channelId: {
              type: Type.STRING,
              description: 'The ID of the channel to switch to (e.g., "nature1", "cine1").',
            },
          },
          required: ['channelId'],
        },
      };

      // Enhance channel context with Favorites status for recommendations
      const availableChannelsText = options.channels.map(c => 
        `- "${c.name}" (ID: ${c.id}) : Programme actuel "${c.currentProgram}" [Catégorie: ${c.category}]${c.isFavorite ? ' ★ FAVORI' : ''}`
      ).join('\n');

      const sessionPromise = this.ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `Vous êtes Gemini, l'assistant TV personnel de cet utilisateur.
          
          CONTEXTE ACTUEL (Chaînes & Programmes) :
          ${availableChannelsText}

          VOS MISSIONS :
          1. GESTION TV : Changez de chaîne instantanément si demandé (outil 'changeChannel').
          
          2. RECOMMANDATIONS PERSONNALISÉES :
             Si l'utilisateur demande "Quoi regarder ?", "Conseille-moi", ou semble indécis :
             - PRIORITÉ 1 : Vérifiez les chaînes marquées '★ FAVORI'. Suggérez ce qu'elles diffusent actuellement.
             - PRIORITÉ 2 : Si rien d'intéressant sur les favoris, proposez un contenu similaire aux catégories des favoris (ex: si l'utilisateur aime le Sport, proposez une autre chaîne Sport).
             - PRIORITÉ 3 : Sinon, suggérez le programme qui semble le plus captivant ou populaire.
             
             Dites toujours POURQUOI vous recommandez un programme (ex: "Comme c'est dans vos favoris...", "Pour changer un peu...").

          STYLE :
          - Court, dynamique et chaleureux.
          - Parlez français.
          - Ne lisez jamais la liste complète des chaînes.`,
          tools: [{ functionDeclarations: [changeChannelTool] }],
          inputAudioTranscription: {}, // Transcribe user input
        },
        callbacks: {
          onopen: async () => {
            options.onStatusChange('CONNECTED');
            
            // Setup input streaming
            if (!this.inputAudioContext || !this.stream) return;
            
            this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
            this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            this.processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPCM16Blob(inputData);
              
              // Visualizer data (simple RMS)
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              options.onAudioData(rms);

              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            this.inputSource.connect(this.processor);
            this.processor.connect(this.inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Transcriptions
            if (message.serverContent?.inputTranscription?.text) {
                options.onTranscript(message.serverContent.inputTranscription.text, false);
            }
            
            // Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'changeChannel') {
                  const channelId = (fc.args as any).channelId;
                  console.log("Calling tool changeChannel with", channelId);
                  options.onChangeChannel(channelId);
                  
                  // Send confirmation back
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Channel changed successfully" }
                      }
                    });
                  });
                }
              }
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext) {
               // Notify that model is speaking (implicitly via transcript usually, but strictly audio here)
               // Could add a transcript hook here if outputTranscription was enabled, but we just play audio
            
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
              
              try {
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  this.outputAudioContext,
                  24000,
                  1
                );
                
                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                  this.sources.delete(source);
                });
                
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
              } catch (e) {
                console.error("Error decoding audio", e);
              }
            }
            
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              this.stopAudioOutput();
            }
          },
          onclose: () => {
            options.onStatusChange('DISCONNECTED');
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            options.onStatusChange('ERROR');
          }
        }
      });
      
      this.session = await sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      options.onStatusChange('ERROR');
    }
  }

  private stopAudioOutput() {
    for (const source of this.sources) {
      source.stop();
    }
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async disconnect() {
    if (this.session) {
       this.session.close();
    }
    
    if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
    }
    
    if (this.inputSource) {
        this.inputSource.disconnect();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.inputAudioContext) {
      await this.inputAudioContext.close();
    }
    if (this.outputAudioContext) {
      await this.outputAudioContext.close();
    }

    this.session = null;
    this.stream = null;
    this.processor = null;
    this.inputSource = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.ai = null;
    this.stopAudioOutput();
  }
}