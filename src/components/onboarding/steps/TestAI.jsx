import { Phone, QrCode, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function TestAI({ phoneNumber }) {
  // Generate a simple QR code URL (using a QR code service)
  const qrCodeUrl = phoneNumber 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`tel:${phoneNumber}`)}`
    : null;

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Test Your AI Assistant</h3>
        <p className="text-gray-600">Give it a try! Call your new AI-powered phone number</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Phone Number Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-center text-white shadow-2xl">
          <Phone size={48} className="mx-auto mb-4" />
          <p className="text-sm font-medium mb-2 text-green-100">Your AI Phone Number</p>
          <a
            href={`tel:${phoneNumber}`}
            className="text-4xl font-bold mb-4 block hover:text-green-100 transition-colors"
          >
            {formatPhoneNumber(phoneNumber)}
          </a>
          <p className="text-sm text-green-100">Tap to call from mobile</p>
        </div>

        {/* QR Code */}
        {qrCodeUrl && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-center gap-2">
              <QrCode size={16} />
              Scan to Call
            </p>
            <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
              <img src={qrCodeUrl} alt="QR Code to call" className="w-48 h-48" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Use your phone's camera to scan</p>
          </div>
        )}

        {/* What to Try */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <CheckCircle2 size={20} />
            What to Try
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Say hello and introduce yourself</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Ask about your business hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Request information about your services</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Try to schedule an appointment or make a reservation</span>
            </li>
          </ul>
        </div>

        {/* Help */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-5 text-center">
          <p className="text-sm text-gray-700 mb-3">
            <strong>Need help?</strong> Your AI is ready, but you can customize it further in settings.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <span>📞 Test the voice</span>
            <span>•</span>
            <span>📝 Review transcripts</span>
            <span>•</span>
            <span>⚙️ Adjust settings</span>
          </div>
        </div>

        {/* Note */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            💡 All calls are recorded and transcribed in your dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
