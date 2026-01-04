
import React, { useState, useEffect } from 'react';
import { LoggerService } from '../services/logger';
import { LogCategory } from '../types';

interface StripeCheckoutProps {
  amount: number;
  onSuccess: (amount: number) => void;
  onCancel: () => void;
  itemName?: string;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ amount, onSuccess, onCancel, itemName = "Neural Core Provisioning" }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'details' | 'confirming' | 'success'>('details');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    LoggerService.log(LogCategory.FINANCIAL, "Stripe Payment Intent Created (Simulated)", { amount, currency: 'USD', item: itemName });

    // Simulate Payment Gateway Network Latency
    await new Promise(r => setTimeout(r, 1500));
    setStep('confirming');
    
    // Simulate 3D Secure / Bank Handshake
    await new Promise(r => setTimeout(r, 2000));
    
    LoggerService.log(LogCategory.FINANCIAL, "Stripe Charge Succeeded (Simulated)", { 
      amount, 
      paymentMethod: 'card_visa_simulated',
      last4: cardNumber.slice(-4) || '4242'
    });
    
    setStep('success');
    setIsProcessing(false);
    
    setTimeout(() => {
      onSuccess(amount);
    }, 1500);
  };

  const formatCardNumber = (val: string) => {
    const v = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) return parts.join(' ');
    return v;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[600px] glass-card rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.15)] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
        
        {/* Left Pane: Order Summary */}
        <div className="w-full md:w-5/12 bg-indigo-600/5 p-10 flex flex-col border-r border-white/5">
          <div className="mb-6 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Sandbox Mode: Simulated Environment</span>
          </div>

          <button onClick={onCancel} className="mb-8 text-gray-500 hover:text-white transition-colors flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            <span className="text-xs font-black uppercase tracking-widest">Return to Grid</span>
          </button>

          <div className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-2">CloudMine Ledger</span>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">Payment Secure</h2>
            
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-white">{itemName}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-mono">Qty: 1 Unit</p>
                </div>
                <p className="text-sm font-black text-white font-mono">${amount.toFixed(2)}</p>
              </div>
              <div className="pt-6 border-t border-white/5 space-y-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-mono">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Neural Processing Fee</span>
                  <span className="font-mono">$0.00</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-auto border-t border-white/5">
            <div className="flex justify-between items-end">
              <span className="text-sm font-black uppercase tracking-widest text-gray-400">Total Due</span>
              <span className="text-4xl font-black text-white font-mono tracking-tighter">${amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right Pane: Payment Input */}
        <div className="flex-1 p-12 bg-gray-900/40 relative">
          {step === 'success' ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-90 duration-500">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-500/20">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Authentication Verified</h3>
              <p className="text-gray-400 text-sm">Credits synchronized with your Neural Ledger. (Demo Only)</p>
            </div>
          ) : (
            <form onSubmit={handlePayment} className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Payment Method</h3>
                <div className="flex gap-2">
                   <div className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[8px] font-black text-gray-400">VISA</div>
                   <div className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[8px] font-black text-gray-400">MASTER</div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button type="button" className="py-3 bg-black text-white rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay with</span>
                    <span className="font-bold">Apple Pay</span>
                  </button>
                  <button type="button" className="py-3 bg-white text-black rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay with</span>
                    <span className="font-bold text-indigo-600">Google</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-[#0f172a] px-4 text-gray-600">Or Pay with Card (Demo)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2 group-focus-within:text-indigo-500 transition-colors">Cardholder Name</label>
                    <input 
                      required
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe" 
                      className="w-full bg-gray-950 border border-white/5 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-800"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2 group-focus-within:text-indigo-500 transition-colors">Card Number</label>
                    <div className="relative">
                      <input 
                        required
                        type="text" 
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4242 4242 4242 4242" 
                        className="w-full bg-gray-950 border border-white/5 rounded-xl px-5 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-800"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v8z"/></svg>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2 group-focus-within:text-indigo-500 transition-colors">Expiry Date</label>
                      <input 
                        required
                        type="text" 
                        maxLength={5}
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM / YY" 
                        className="w-full bg-gray-950 border border-white/5 rounded-xl px-5 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-800"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2 group-focus-within:text-indigo-500 transition-colors">CVC</label>
                      <input 
                        required
                        type="text" 
                        maxLength={3}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        placeholder="123" 
                        className="w-full bg-gray-950 border border-white/5 rounded-xl px-5 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <button 
                  disabled={isProcessing}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50 relative overflow-hidden group"
                >
                  {isProcessing && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing Payload...</span>
                      </>
                    ) : (
                      `Synchronize $${amount.toFixed(2)}`
                    )}
                  </span>
                </button>
                <p className="text-[9px] text-gray-600 text-center mt-4 font-bold uppercase tracking-widest leading-relaxed">
                  Sandbox Simulation Enabled. <br />
                  No real funds will be charged. This is a local demo node.
                </p>
              </div>
            </form>
          )}

          {step === 'confirming' && (
            <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
               <div className="w-16 h-16 border-b-2 border-indigo-500 rounded-full animate-spin mb-8"></div>
               <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2 italic">Bank_Lattice_Auth</h4>
               <p className="text-xs text-indigo-400 font-mono tracking-widest animate-pulse">CHALLENGE ISSUED: VERIFYING PROTOCOL INTEGRITY</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
