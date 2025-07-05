import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for voice input functionality
 * Supports speech recognition, voice commands, and voice-to-text
 */
export const useVoiceInput = ({
  language = 'hu-HU', // Default to Hungarian for Lion Football Academy
  continuous = false,
  interimResults = true,
  maxAlternatives = 1,
  onResult,
  onError,
  onStart,
  onEnd,
  commands = {},
  autoStart = false
} = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
    }
  }, []);

  // Configure speech recognition
  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    // Handle speech recognition results
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setConfidence(maxConfidence);
        
        // Check for voice commands
        processVoiceCommand(finalTranscript.toLowerCase().trim());
        
        if (onResult) {
          onResult({
            transcript: finalTranscript,
            confidence: maxConfidence,
            isFinal: true
          });
        }
      }

      if (interimTranscript) {
        setInterimTranscript(interimTranscript);
        
        if (onResult) {
          onResult({
            transcript: interimTranscript,
            confidence: 0,
            isFinal: false
          });
        }
      }
    };

    // Handle errors
    recognition.onerror = (event) => {
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      setIsListening(false);
      
      if (onError) {
        onError(errorMessage);
      }
    };

    // Handle start
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      
      if (onStart) {
        onStart();
      }
    };

    // Handle end
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      
      if (onEnd) {
        onEnd();
      }
    };

    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [language, continuous, interimResults, maxAlternatives, onResult, onError, onStart, onEnd, commands]);

  // Process voice commands
  const processVoiceCommand = useCallback((text) => {
    for (const [command, handler] of Object.entries(commands)) {
      if (text.includes(command.toLowerCase())) {
        handler(text);
        break;
      }
    }
  }, [commands]);

  // Get error message
  const getErrorMessage = (error) => {
    switch (error) {
      case 'no-speech':
        return 'No speech was detected';
      case 'audio-capture':
        return 'Audio capture failed';
      case 'not-allowed':
        return 'Microphone permission denied';
      case 'network':
        return 'Network error occurred';
      case 'service-not-allowed':
        return 'Speech recognition service not allowed';
      default:
        return `Speech recognition error: ${error}`;
    }
  };

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    if (isListening) {
      return;
    }

    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start speech recognition');
    }
  }, [isSupported, isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && isSupported) {
      startListening();
    }
  }, [autoStart, isSupported, startListening]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript
  };
};

/**
 * Predefined voice commands for Lion Football Academy
 */
export const footballVoiceCommands = {
  // Navigation commands
  'go to dashboard': () => window.location.href = '/dashboard',
  'open dashboard': () => window.location.href = '/dashboard',
  'go to teams': () => window.location.href = '/teams',
  'open teams': () => window.location.href = '/teams',
  'go to players': () => window.location.href = '/players',
  'open players': () => window.location.href = '/players',
  'go to training': () => window.location.href = '/trainings',
  'open training': () => window.location.href = '/trainings',
  'go to matches': () => window.location.href = '/matches',
  'open matches': () => window.location.href = '/matches',
  'go to profile': () => window.location.href = '/profile',
  'open profile': () => window.location.href = '/profile',
  
  // QR Code commands
  'scan qr code': () => window.location.href = '/qr-checkin',
  'open qr scanner': () => window.location.href = '/qr-checkin',
  'attendance check': () => window.location.href = '/qr-checkin',
  
  // Search commands
  'search': (text) => {
    const searchTerm = text.replace('search', '').trim();
    if (searchTerm) {
      // Trigger search functionality
      const searchEvent = new CustomEvent('voiceSearch', { detail: searchTerm });
      window.dispatchEvent(searchEvent);
    }
  },
  
  // Form commands
  'submit form': () => {
    const submitButton = document.querySelector('button[type="submit"], input[type="submit"]');
    if (submitButton) submitButton.click();
  },
  'cancel': () => {
    const cancelButton = document.querySelector('button[data-action="cancel"], .cancel-button');
    if (cancelButton) cancelButton.click();
  },
  'save': () => {
    const saveButton = document.querySelector('button[data-action="save"], .save-button');
    if (saveButton) saveButton.click();
  },
  
  // Accessibility commands
  'read page': () => {
    const content = document.querySelector('main, .main-content');
    if (content && 'speechSynthesis' in window) {
      const text = content.textContent || content.innerText;
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  },
  'stop reading': () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
};

/**
 * Voice input component wrapper
 */
export const VoiceInputButton = ({
  onTranscript,
  onCommand,
  className = '',
  children,
  commands = footballVoiceCommands,
  ...props
}) => {
  const {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript
  } = useVoiceInput({
    onResult: (result) => {
      if (result.isFinal && onTranscript) {
        onTranscript(result.transcript);
      }
    },
    onError: (error) => {
      console.error('Voice input error:', error);
    },
    commands: {
      ...commands,
      ...onCommand
    }
  });

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      startListening();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className={`voice-input-button ${isListening ? 'listening' : ''} ${className}`}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      disabled={!!error}
      {...props}
    >
      {children || (
        <svg
          className="voice-input-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          width="20"
          height="20"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  );
};

/**
 * Text-to-speech utility
 */
export const useTextToSpeech = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
    
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        setVoices(speechSynthesis.getVoices());
      };
      
      updateVoices();
      speechSynthesis.addEventListener('voiceschanged', updateVoices);
      
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      };
    }
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!isSupported || !text) return;

    const {
      voice,
      rate = 1,
      pitch = 1,
      volume = 1,
      lang = 'hu-HU'
    } = options;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = lang;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    voices,
    speak,
    stop
  };
};

export default useVoiceInput;