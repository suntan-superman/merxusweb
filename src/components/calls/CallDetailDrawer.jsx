import { useEffect, useState } from 'react';
import { fetchCallTranscript, translateCallTranscript } from '../../api/calls';

export default function CallDetailDrawer({ open, onClose, call }) {
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [translatedTranscript, setTranslatedTranscript] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !call) return;

    async function loadTranscript() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchCallTranscript(call.id);
        setTranscript(data.transcript || data.callerTranscript || data.assistantTranscript);
        setTranslatedTranscript(data.translatedTranscript);
        setDetectedLanguage(data.detectedLanguage);
        
        // Auto-show translation if available
        if (data.translatedTranscript) {
          setShowTranslation(true);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load transcript.');
      } finally {
        setLoading(false);
      }
    }

    loadTranscript();
  }, [open, call]);

  async function handleTranslate() {
    try {
      setTranslating(true);
      setError(null);

      const data = await translateCallTranscript(call.id, 'en');
      setTranslatedTranscript(data.translatedTranscript);
      setDetectedLanguage(data.detectedLanguage);
      setShowTranslation(true);
    } catch (err) {
      console.error(err);
      setError('Failed to translate transcript.');
    } finally {
      setTranslating(false);
    }
  }

  if (!open || !call) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <header className="border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Call Details</h2>
            <p className="text-xs text-gray-500">
              {getCustomerName(call) || 'Unknown'} • {getCustomerPhone(call) || 'No number'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          <section>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Summary</h3>
            <p className="text-sm text-gray-800">
              {call.transcriptSummary || 'No summary available'}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Call Info</h3>
            <div className="text-sm text-gray-800 space-y-1">
              <div>Type: <span className="capitalize">{call.type}</span></div>
              <div>Importance: <span className="capitalize">{call.importance}</span></div>
              <div>Started: {formatDate(call.startedAt)}</div>
              <div>Duration: {call.durationSec}s</div>
            </div>
          </section>

          {call.orderId && (
            <section>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Related Order</h3>
              <p className="text-sm text-primary-600">
                Order #{call.orderId.slice(-6)}
              </p>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500">
                {showTranslation && translatedTranscript ? 'Translated Transcript' : 'Full Transcript'}
              </h3>
              
              <div className="flex items-center gap-2">
                {detectedLanguage && detectedLanguage !== 'en' && detectedLanguage !== 'unknown' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    {detectedLanguage.toUpperCase()}
                  </span>
                )}
                
                {!loading && transcript && (
                  <div className="flex gap-2">
                    {translatedTranscript && (
                      <button
                        onClick={() => setShowTranslation(!showTranslation)}
                        className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        {showTranslation ? 'Show Original' : 'Show Translation'}
                      </button>
                    )}
                    
                    {!translatedTranscript && (
                      <button
                        onClick={handleTranslate}
                        disabled={translating}
                        className="text-xs px-3 py-1 rounded-md bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {translating ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Translating...
                          </>
                        ) : (
                          <>
                            🌐 Translate to English
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {loading && (
              <p className="text-xs text-gray-500 mt-2">Loading transcript…</p>
            )}

            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}

            {!loading && transcript && (
              <div className="mt-2 space-y-2">
                <pre className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-xs text-gray-800 border">
                  {showTranslation && translatedTranscript ? translatedTranscript : transcript}
                </pre>
                
                {showTranslation && translatedTranscript && detectedLanguage && detectedLanguage !== 'en' && (
                  <p className="text-xs text-gray-500 italic">
                    ✓ Translated from {getLanguageName(detectedLanguage)} to English
                  </p>
                )}
              </div>
            )}

            {!loading && !transcript && !error && (
              <p className="text-xs text-gray-500 mt-2">No transcript available.</p>
            )}
          </section>
        </div>

        <footer className="border-t px-4 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-primary-600 text-white px-4 py-2 text-sm hover:bg-primary-700 transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function getCustomerName(call) {
  if (!call) return null;
  return call.customerName || 
         call.parsedMessage?.name || 
         call.parsedOrder?.name || 
         call.parsedReservation?.name || 
         null;
}

function getCustomerPhone(call) {
  if (!call) return null;
  return call.customerPhone || 
         call.parsedMessage?.phone || 
         call.parsedOrder?.phone || 
         call.parsedReservation?.phone || 
         call.from || 
         null;
}

function formatDate(date) {
  if (!date) return '';
  
  // Handle Firestore Timestamp objects
  let dateObj;
  if (date.toDate) {
    dateObj = date.toDate();
  } else if (date.seconds) {
    dateObj = new Date(date.seconds * 1000);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return '';
  }
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  return dateObj.toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getLanguageName(code) {
  const languageNames = {
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'ru': 'Russian',
    'hi': 'Hindi',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'pl': 'Polish',
    'nl': 'Dutch',
    'tr': 'Turkish',
  };
  return languageNames[code] || code.toUpperCase();
}

