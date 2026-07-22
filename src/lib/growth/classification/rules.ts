/**
 * Rule-based review classification
 * Layer 1: Keyword matching
 */

import type { ReviewCategory, Sentiment } from '@/types/growth/app';

interface ClassificationRule {
  category: ReviewCategory;
  sentiment: Sentiment;
  keywords: string[];
  exclude?: string[];
}

const RULES: ClassificationRule[] = [
  {
    category: 'positive_experience',
    sentiment: 'positive',
    keywords: [
      'bagus', 'mantap', 'keren', 'suka', 'senang', 'puas', 'helpful',
      'good', 'great', 'love', 'excellent', 'amazing', 'awesome', 'best',
      'perfect', 'recommend', 'terima kasih', 'thank', 'smooth', 'easy',
      'cepat', 'fast', 'responsive', 'friendly', 'recommended',
    ],
  },
  {
    category: 'negative_experience',
    sentiment: 'negative',
    keywords: [
      'buruk', 'jelek', 'benci', 'kecewa', 'gagal', 'error', 'tidak suka',
      'bad', 'hate', 'disappointed', 'terrible', 'awful', 'worst', 'poor',
      'frustrating', 'annoying', 'waste', 'useless',
    ],
  },
  {
    category: 'bug_error',
    sentiment: 'negative',
    keywords: [
      'bug', 'error', 'crash', 'force close', ' FC ', 'not responding',
      'glitch', 'freeze', 'stuck', 'hang', 'crashes', 'laggy',
      'lemot', 'patah', 'not responding', 'restart', 'tidak bisa buka',
      'bacot', 'ngelag', 'keluar sendiri',
    ],
  },
  {
    category: 'login_otp',
    sentiment: 'negative',
    keywords: [
      'otp', 'login', 'password', 'lupa kata sandi', 'reset password',
      'verification', '2fa', 'pin', 'verifikasi', 'tidak bisa masuk',
      'can\'t login', 'sign in', 'verification code', 'kode verifikasi',
      'otp tidak masuk', 'otp tidak masuk', 'sms tidak masuk',
    ],
  },
  {
    category: 'payment',
    sentiment: 'negative',
    keywords: [
      'payment', 'bayar', 'transfer', 'top up', 'withdraw', 'saldo',
      'duit', 'refund', 'penarikan', 'deposit', 'money', 'e-wallet',
      'gagal transfer', 'tidak bisa bayar', 'payment failed', 'top up gagal',
      'saldo tidak masuk', 'money not received',
    ],
  },
  {
    category: 'contract_info',
    sentiment: 'negative',
    keywords: [
      'syarat', 'ketentuan', 'agreement', 'terms', 'contract', 'klausul',
      'biaya tersembunyi', 'hidden fee', 'fine print', 'data privacy',
      'privacy policy', 'privacy', 'ijinkan', 'izin', 'permissions',
    ],
  },
  {
    category: 'performance',
    sentiment: 'negative',
    keywords: [
      'lambat', 'slow', 'loading', 'buffering', 'lemot', ' berat',
      'heavy', 'battery', 'ram', 'memori', 'storage', 'size', 'size too big',
      'internet', 'signal', 'connection', 'offline', 'online',
    ],
  },
  {
    category: 'ui',
    sentiment: 'negative',
    keywords: [
      'tampilan', 'interface', 'design', 'UI', 'UX', 'layout', 'font',
      'warna', 'color', 'confusing', 'complicated', 'ribet', 'rumit',
      'not user friendly', ' sulit', 'gambar', 'icon',
    ],
  },
  {
    category: 'promotion',
    sentiment: 'neutral',
    keywords: [
      'promo', 'diskon', 'bonus', 'cashback', 'voucher', 'kupon',
      'promotion', 'discount', 'reward', 'gift', 'hadiah', 'gratis',
      'promo tidak jalan', 'bonus tidak dapat', 'promo expired',
    ],
  },
  {
    category: 'feature_request',
    sentiment: 'neutral',
    keywords: [
      'please add', 'should have', 'wish', 'hope', 'minta', 'tolong',
      'need', 'want', 'fitur', 'tambahkan', 'mau fitur', 'ada fitur',
      'fitur baru', 'new feature', 'missing feature',
    ],
  },
  {
    category: 'customer_support',
    sentiment: 'negative',
    keywords: [
      'cs', 'customer service', 'help', 'bantuan', 'support', 'tanya',
      'respond', 'reply', 'no response', 'tidak ditanggapi', 'garbage',
      'helpdesk', 'live chat', 'whatsapp', 'call center',
    ],
  },
];

export interface ClassificationResult {
  category: ReviewCategory | null;
  sentiment: Sentiment | null;
  confidence: number;
  keywords_matched: string[];
  classification_source: 'rule_based';
  classified_at: string;
}

export function classifyReview(text: string): ClassificationResult {
  const normalized = text.toLowerCase();

  let bestMatch: ClassificationRule | null = null;
  let bestScore = 0;
  const allMatched: string[] = [];

  for (const rule of RULES) {
    if (rule.exclude?.some(ex => normalized.includes(ex))) continue;

    const matched = rule.keywords.filter(kw => normalized.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      allMatched.push(...matched);
      const score = matched.length / rule.keywords.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = rule;
      }
    }
  }

  return {
    category: bestMatch?.category ?? null,
    sentiment: bestMatch?.sentiment ?? null,
    confidence: Math.min(bestScore * 3, 1), // Normalize to 0-1
    keywords_matched: [...new Set(allMatched)],
    classification_source: 'rule_based',
    classified_at: new Date().toISOString(),
  };
}

export function getCategoryLabel(category: ReviewCategory | null): string {
  const labels: Record<ReviewCategory, string> = {
    positive_experience: 'Positive Experience',
    negative_experience: 'Negative Experience',
    bug_error: 'Bug / Error',
    login_otp: 'Login / OTP',
    payment: 'Payment',
    contract_info: 'Contract / Info',
    performance: 'Performance',
    ui: 'User Interface',
    promotion: 'Promotion',
    feature_request: 'Feature Request',
    customer_support: 'Customer Support',
    other: 'Other',
  };
  return category ? labels[category] ?? category : 'Unclassified';
}

export function getSentimentColor(sentiment: Sentiment | null): string {
  const colors: Record<Sentiment, string> = {
    positive: 'text-emerald-600',
    neutral: 'text-amber-600',
    negative: 'text-red-600',
  };
  return sentiment ? colors[sentiment] ?? 'text-slate-500' : 'text-slate-400';
}
