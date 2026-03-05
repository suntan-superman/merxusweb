import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase/config';
import { verifyOtp, resendOtp } from '../api/otp';

export default function OnboardingOTPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const tenantType = searchParams.get('type') || 'restaurant';
  const selectedPlan = searchParams.get('plan');
  const returnTo = searchParams.get('returnTo');
  const otpPrefill = searchParams.get('otp') || '';

  const [otpCode, setOtpCode] = useState(otpPrefill);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [mustResend, setMustResend] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/onboarding', { replace: true });
    }
  }, [email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Enter the 6-digit OTP code we emailed you.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const verifyResp = await verifyOtp({ email, otpCode });
      if (verifyResp?.email && verifyResp.email.toLowerCase() !== email) {
        toast.error('This code was sent to a different email. Please request a new code.');
        setMustResend(true);
        return;
      }

      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }

      const wizardUrl = `/onboarding-wizard?type=${encodeURIComponent(tenantType)}${selectedPlan ? `&plan=${encodeURIComponent(selectedPlan)}` : ''}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`;

      // Persist password into the pending prefill so the wizard can use it
      try {
        const raw = sessionStorage.getItem('merxus_onboarding_pending_prefill');
        if (raw) {
          const parsed = JSON.parse(raw);
          const next = {
            ...parsed,
            formData: {
              ...(parsed?.formData || {}),
              tempPassword: password,
            },
          };
          sessionStorage.setItem('merxus_onboarding_pending_prefill', JSON.stringify(next));
        }
      } catch (persistErr) {
        console.warn('Could not persist password for wizard prefill', persistErr);
      }

      navigate(wizardUrl, { replace: true });
    } catch (error) {
      const msg = error?.message || 'Invalid OTP code. Please request a new code.';
      toast.error(msg);
      setMustResend(true);
      console.error('OTP verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await resendOtp({ email });
      toast.success('OTP resent to your email.');
      setMustResend(false);
      setOtpCode('');
    } catch (error) {
      toast.error(error?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <div className="text-center mb-1">
          <p className="text-sm font-semibold text-primary-600">Merxus AI</p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Verify your email</h1>
        <p className="text-sm text-gray-600 mb-6">
          We sent a 6-digit code to <span className="font-semibold">{email}</span>. Enter it below, set your password, and you’ll continue to the setup wizard.
        </p>

        <form className="space-y-4" onSubmit={handleVerify}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">OTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field"
              placeholder="123456"
              required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Set Password</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pr-10"
              placeholder="Create a password"
              required
              minLength={6}
              disabled={otpCode.length !== 6}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPwd ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field pr-10"
              placeholder="Re-enter password"
              required
              minLength={6}
              disabled={otpCode.length !== 6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPwd((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend code'}
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                otpCode.length !== 6 ||
                password.length < 6 ||
                password !== confirmPassword ||
                mustResend
              }
              className="btn-primary px-6 py-2 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
          {mustResend && (
            <p className="text-xs text-red-600 text-center">
              You must request a new code after an invalid attempt.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
