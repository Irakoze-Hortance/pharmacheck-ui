import { Camera, BrainCircuit, ShieldCheck } from 'lucide-react';

const steps = [
  {
    number: '01',
    tag: 'CAPTURE',
    icon: Camera,
    title: 'Photograph the packaging',
    description:
      'Take a clear photo of the medicine box, ensuring serial numbers, batch codes, and holographic seals are in frame.',
    accent: '#0EA5E9',
    bg: 'rgba(14,165,233,0.07)',
  },
  {
    number: '02',
    tag: 'ANALYSE',
    icon: BrainCircuit,
    title: 'On-device CNN inference',
    description:
      'MobileNetV3-Small classifies packaging features locally — no internet required. Your data never leaves the device.',
    accent: 'var(--terracotta)',
    bg: 'rgba(192,98,42,0.07)',
  },
  {
    number: '03',
    tag: 'VERIFY',
    icon: ShieldCheck,
    title: 'Instant authentication report',
    description:
      'Receive a definitive authentic/counterfeit result with confidence score, logged to the blockchain audit trail.',
    accent: '#22C55E',
    bg: 'rgba(34,197,94,0.07)',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{ backgroundColor: '#F0F4F9', paddingTop: '5rem', paddingBottom: '5rem' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-xs tracking-widest font-semibold mb-3"
            style={{ color: 'var(--terracotta)', letterSpacing: '0.15em' }}
          >
            THE PROCESS
          </p>
          <h2
            className="font-display font-bold mb-4"
            style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--navy)' }}
          >
            How it Works
          </h2>
          <p style={{ color: 'var(--slate)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Three steps from scan to verified result — designed to work even without connectivity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="rounded-2xl p-7 flex flex-col gap-4 transition-transform hover:-translate-y-1"
                style={{
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 16px rgba(15,31,53,0.07)',
                  border: '1px solid #E8EFF7',
                }}
              >
                {/* Tag + step number row */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold tracking-widest px-2.5 py-1 rounded-full"
                    style={{ color: step.accent, backgroundColor: step.bg, letterSpacing: '0.12em' }}
                  >
                    {step.tag}
                  </span>
                  <span
                    className="font-display font-bold text-3xl"
                    style={{ fontFamily: 'Sora, sans-serif', color: '#E8EFF7', lineHeight: 1 }}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: step.bg }}
                >
                  <Icon size={24} style={{ color: step.accent }} />
                </div>

                <h3
                  className="font-display font-semibold text-lg m-0"
                  style={{ fontFamily: 'Sora, sans-serif', color: 'var(--navy)' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--slate)' }}>
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}